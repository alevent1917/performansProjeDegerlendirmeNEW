-- ============================================================================
-- MIGRATION: 20261029000001_security_hardening.sql
-- AMAÇ: Güvenlik Sertleştirmesi, RLS Özyineleme Çözümü, Rollback-Dirençli Aktivasyon ve İlk Kurulum Mühürlemesi
-- MEB E-Dönem Ödevi Yönetim Sistemi
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. handle_updated_at() Fonksiyonunun SECURITY INVOKER Olarak Güncellenmesi
-- ----------------------------------------------------------------------------
-- Güvenlik Gerekçesi: Yalnızca satırın updated_at sütununa geçerli zaman damgasını
-- yazar. Yükseltilmiş yetki gerektirmediğinden SECURITY DEFINER kaldırılmış,
-- çağrıcının yetkileriyle (SECURITY INVOKER) çalışacak şekilde ve güvenli search_path ile tanımlanmıştır.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. public.is_admin() Yetki Denetim Fonksiyonunun Sertleştirilmesi
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = auth.uid() 
      AND role = 'admin'::user_role 
      AND status = 'active'::user_status
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. enforce_profile_role_integrity() Profil Bütünlük Tetikleyicisinin Güçlendirilmesi
-- ----------------------------------------------------------------------------
-- Rol, durum, okul numarası, e-posta ve kimlik alanlarının yönetici harici değiştirilmesini engeller.
CREATE OR REPLACE FUNCTION public.enforce_profile_role_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  -- Yönetici değilse ve geçerli işlem ilk kurulum (bootstrap) sürecinde değilse kritik alanlar değiştirilemez
  IF NOT public.is_admin() AND current_setting('app.bootstrap_in_progress', true) IS DISTINCT FROM 'true' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Yetkisiz İşlem: Kullanıcı rolü yalnızca okul yöneticisi tarafından değiştirilebilir!';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Yetkisiz İşlem: Kullanıcı hesap durumu yalnızca okul yöneticisi tarafından değiştirilebilir!';
    END IF;
    IF NEW.school_number IS DISTINCT FROM OLD.school_number THEN
      RAISE EXCEPTION 'Yetkisiz İşlem: Öğrenci okul numarası doğrudan değiştirilemez!';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Yetkisiz İşlem: E-posta adresi profil üzerinden doğrudan değiştirilemez!';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Yetkisiz İşlem: Kullanıcı kimliği (ID) değiştirilemez!';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Tetikleyicinin mevcut olduğundan emin ol
DROP TRIGGER IF EXISTS trg_enforce_profile_role_integrity ON public.user_profiles;
CREATE TRIGGER trg_enforce_profile_role_integrity
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_role_integrity();

-- ----------------------------------------------------------------------------
-- 4. user_profiles RLS Özyineleme (Infinite Recursion) Çözümü
-- ----------------------------------------------------------------------------
-- Eski alt sorgulu ve özyinelemeye yol açan politikalar kaldırılır
DROP POLICY IF EXISTS "Kullanıcı kendi profilini güncelleyebilir rol hariç" ON public.user_profiles;
DROP POLICY IF EXISTS "Kullanıcı kendi profilini güncelleyebilir" ON public.user_profiles;
DROP POLICY IF EXISTS "Yöneticiler tüm profilleri güncelleyebilir" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_self_update" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_update" ON public.user_profiles;

-- Kullanıcı yalnızca kendi satırını güncelleyebilir; rol ve statü koruması trigger katmanında yapılır
CREATE POLICY "user_profiles_self_update"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Yöneticiler tüm profilleri güncelleyebilir
CREATE POLICY "user_profiles_admin_update"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. Öğretmen Başvuruları Güvenlik Sıkılaştırması
-- ----------------------------------------------------------------------------
-- Başvuru ekleyenlerin doğrudan status = 'approved' ile kayıt açması engellenir
DROP POLICY IF EXISTS "Öğretmen adayları başvuru ekleyebilir" ON public.teacher_applications;
CREATE POLICY "Öğretmen adayları başvuru ekleyebilir"
ON public.teacher_applications
FOR INSERT
WITH CHECK (status = 'pending'::application_status);

-- ----------------------------------------------------------------------------
-- 6. Öğrenci Aktivasyon Tablosu ve Rollback-Dirençli Atomik Tüketim
-- ----------------------------------------------------------------------------
ALTER TABLE public.activation_codes
  ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activation_codes_school_number 
  ON public.activation_codes(school_number);

-- Rollback-Dirençli Aktivasyon Fonksiyonu:
-- Hatalı kod girişinde RAISE EXCEPTION atılmaz; bunun yerine failed_attempts
-- artılarak commit edilir ve yapılandırılmış JSON döner.
CREATE OR REPLACE FUNCTION public.activate_student_account(
  p_school_number TEXT,
  p_plain_code TEXT,
  p_full_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_record RECORD;
  v_code_valid BOOLEAN := false;
  v_generic_error CONSTANT JSONB := jsonb_build_object(
    'success', false, 
    'error_code', 'INVALID_CREDENTIALS',
    'message', 'Okul numarası veya aktivasyon kodu geçersiz.'
  );
BEGIN
  -- 1. Kimlik doğrulama kontrolü (istemciden değil, oturumdan alınır)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error_code', 'UNAUTHORIZED', 
      'message', 'Aktivasyon işlemi için önce sisteme giriş yapılmalıdır.'
    );
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- 2. Kullanıcının zaten bir profili var mı?
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = v_user_id) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error_code', 'ALREADY_REGISTERED', 
      'message', 'Bu kullanıcı hesabı zaten bir profile bağlanmış.'
    );
  END IF;

  -- 3. Bu okul numarası başka bir hesaba atanmış mı? (Kullanıcı Sayımı Önleme - Enumeration)
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE school_number = p_school_number) THEN
    RETURN v_generic_error;
  END IF;

  -- 4. Aktivasyon kaydını kilit altında sorgula (FOR UPDATE - Eşzamanlı Yarış Durumu Koruması)
  SELECT * INTO v_record
  FROM public.activation_codes
  WHERE school_number = p_school_number
  FOR UPDATE;

  -- Kayıt yoksa sabit hata dön (enumeration engeli)
  IF NOT FOUND THEN
    PERFORM pg_sleep(0.05);
    RETURN v_generic_error;
  END IF;

  -- 5. Kaba kuvvet kilidi denetimi (Rate Limit / Lockout)
  IF v_record.locked_until IS NOT NULL AND v_record.locked_until > NOW() THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error_code', 'ACCOUNT_LOCKED', 
      'message', 'Çok sayıda hatalı deneme nedeniyle aktivasyon geçici olarak kilitlendi. Lütfen daha sonra tekrar deneyin.'
    );
  END IF;

  -- 6. Kod daha önce kullanılmış mı?
  IF v_record.is_used THEN
    RETURN v_generic_error;
  END IF;

  -- 7. Kodun son kullanma tarihi geçmiş mi?
  IF v_record.expires_at < NOW() THEN
    RETURN v_generic_error;
  END IF;

  -- 8. Kod Doğrulaması (Kriptografik Hash veya Karşılaştırma)
  BEGIN
    IF v_record.code_hash LIKE '$2%' THEN
      v_code_valid := (v_record.code_hash = extensions.crypt(p_plain_code, v_record.code_hash));
    ELSIF length(v_record.code_hash) = 64 THEN
      v_code_valid := (v_record.code_hash = encode(extensions.digest(p_plain_code, 'sha256'), 'hex'));
    ELSE
      v_code_valid := (v_record.code_hash = p_plain_code);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_code_valid := false;
  END;

  -- 9. Hatalı Kod Durumu (Sayaç kalıcı artırılır, TRANSACTION GERİ ALINMAZ)
  IF NOT v_code_valid THEN
    IF v_record.failed_attempts + 1 >= 5 THEN
      UPDATE public.activation_codes
      SET failed_attempts = failed_attempts + 1,
          locked_until = NOW() + INTERVAL '15 minutes'
      WHERE id = v_record.id;
    ELSE
      UPDATE public.activation_codes
      SET failed_attempts = failed_attempts + 1
      WHERE id = v_record.id;
    END IF;

    RETURN v_generic_error;
  END IF;

  -- 10. Başarılı Durum: Kodu Atomik Olarak Tüket
  UPDATE public.activation_codes
  SET is_used = true,
      used_at = NOW(),
      used_by = v_user_id,
      used_by_email = v_user_email,
      failed_attempts = 0,
      locked_until = NULL
  WHERE id = v_record.id;

  -- 11. Kullanıcı Profilini Güvenle Oluştur
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    status,
    school_number
  ) VALUES (
    v_user_id,
    v_user_email,
    COALESCE(NULLIF(TRIM(p_full_name), ''), 'Öğrenci ' || p_school_number),
    'student'::user_role,
    'active'::user_status,
    p_school_number
  );

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Öğrenci hesabı başarıyla etkinleştirildi.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activate_student_account(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activate_student_account(TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.activate_student_account(TEXT, TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. İlk Yönetici (Bootstrap) Kurulumu ve Kalıcı Mühürleme (Permanent Seal)
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

CREATE TABLE IF NOT EXISTS private.bootstrap_config (
  id INT PRIMARY KEY DEFAULT 1,
  token_hash TEXT NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_bootstrap_row CHECK (id = 1)
);

-- Sistem başlatıldıktan sonra is_initialized değerinin false'a dönmesini engelleyen trigger
CREATE OR REPLACE FUNCTION public.prevent_bootstrap_unseal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF OLD.is_initialized = true AND NEW.is_initialized = false THEN
    RAISE EXCEPTION 'Güvenlik İhlali: Kurulum tamamlandıktan sonra okul sistemi tekrar başlatılamaz!';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seal_school_settings ON public.school_settings;
CREATE TRIGGER trg_seal_school_settings
  BEFORE UPDATE ON public.school_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_bootstrap_unseal();

-- İlk Yönetici Kurulum RPC'si
CREATE OR REPLACE FUNCTION public.bootstrap_initial_admin(
  p_bootstrap_token TEXT,
  p_admin_name TEXT,
  p_school_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_config RECORD;
  v_is_init BOOLEAN;
  v_token_valid BOOLEAN := false;
BEGIN
  -- 1. Kimlik doğrulama kontrolü
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error_code', 'UNAUTHORIZED', 
      'message', 'Yönetici kurulumu için önce bir kullanıcı hesabı ile oturum açılmalıdır.'
    );
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- 2. Sistem daha önce kurulmuş mu?
  SELECT is_initialized INTO v_is_init FROM public.school_settings LIMIT 1;
  IF v_is_init = true THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error_code', 'ALREADY_INITIALIZED', 
      'message', 'Sistem ilk kurulumu daha önce tamamlanmıştır.'
    );
  END IF;

  -- 3. Kurulum sırrını sorgula ve satırı kilitle
  SELECT * INTO v_config FROM private.bootstrap_config WHERE id = 1 FOR UPDATE;
  
  -- Eğer yapılandırma tablosu boşsa (ilk kurulum sunucu sırrı henüz eklenmemişse)
  -- Güvenlik gereği token olmadan doğrudan ilk yönetici oluşturulamaz
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error_code', 'BOOTSTRAP_NOT_CONFIGURED', 
      'message', 'İlk kurulum güvenlik belirteci sunucu ortamında yapılandırılmamış.'
    );
  END IF;

  -- 4. Kilit süresi kontrolü
  IF v_config.locked_until IS NOT NULL AND v_config.locked_until > NOW() THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error_code', 'LOCKED', 
      'message', 'Çok sayıda hatalı kurulum anahtarı denemesi nedeniyle sistem kilitlendi.'
    );
  END IF;

  -- 5. Belirteç (Token) Karşılaştırması (Kriptografik güvenli doğrulama, asla düz metin fallback yapılmaz)
  BEGIN
    IF v_config.token_hash LIKE '$2%' THEN
      v_token_valid := (v_config.token_hash = extensions.crypt(p_bootstrap_token, v_config.token_hash));
    ELSIF length(v_config.token_hash) = 64 THEN
      v_token_valid := (v_config.token_hash = encode(extensions.digest(p_bootstrap_token, 'sha256'), 'hex'));
    ELSE
      -- Düz metin token hash kabul edilmez; hash formatında olmalıdır
      v_token_valid := false;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_token_valid := false;
  END;

  IF NOT v_token_valid THEN
    IF v_config.failed_attempts + 1 >= 3 THEN
      UPDATE private.bootstrap_config
      SET failed_attempts = failed_attempts + 1,
          locked_until = NOW() + INTERVAL '30 minutes'
      WHERE id = 1;
    ELSE
      UPDATE private.bootstrap_config
      SET failed_attempts = failed_attempts + 1
      WHERE id = 1;
    END IF;

    RETURN jsonb_build_object(
      'success', false, 
      'error_code', 'INVALID_TOKEN', 
      'message', 'Geçersiz kurulum güvenlik belirteci.'
    );
  END IF;

  -- Bootstrap işlemini geçerli transaction içine güvenli işaretle (profil tetikleyicisini bilgilendir)
  PERFORM set_config('app.bootstrap_in_progress', 'true', true);

  -- 6. Başarılı: Kullanıcıyı yönetici olarak ata veya profili oluştur (school_number temizlenir)
  INSERT INTO public.user_profiles (
    id, email, full_name, role, status, school_number
  ) VALUES (
    v_user_id, v_user_email, p_admin_name, 'admin'::user_role, 'active'::user_status, NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin'::user_role,
    status = 'active'::user_status,
    school_number = NULL,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  -- 7. Okul ayarlarını güncelle ve mühürle
  UPDATE public.school_settings
  SET is_initialized = true,
      school_name = COALESCE(NULLIF(TRIM(p_school_name), ''), school_name),
      updated_at = NOW();

  -- 8. Bootstrap sırrını tek kullanımlık olarak sil
  DELETE FROM private.bootstrap_config WHERE id = 1;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'İlk yönetici hesabı başarıyla oluşturuldu ve sistem mühürlendi.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_initial_admin(TEXT, TEXT, TEXT) TO authenticated;
