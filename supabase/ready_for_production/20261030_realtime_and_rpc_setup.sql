-- ============================================================================
-- SQL BETİĞİ: 20261030_realtime_and_rpc_setup.sql
-- AMAÇ: 5 Tablonun Realtime Yayınına Eklenmesi ve Güvenlik Sertleştirmeli Not Değişikliği RPC Tanımlaması
-- MEB E-Dönem Ödevi Yönetim Sistemi
-- ============================================================================
-- NOT: Canlı Supabase veritabanında SQL Editör üzerinden bir defaya mahsus çalıştırılmalıdır.
-- Mevcut migration dosyalarını değiştirmez; güvenli ve geri alınabilir (idempotent) yapıdadır.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. REPLICA IDENTITY FULL (Realtime Güncellemelerinde Eski Satır Bilgisi İçin)
-- ----------------------------------------------------------------------------
-- Tabloların önceki durumunun (OLD) ve birincil anahtarlarının Realtime
-- websocket istemcilerine eksiksiz iletilmesini sağlar.
ALTER TABLE public.task_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.student_task_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.task_evaluations REPLICA IDENTITY FULL;
ALTER TABLE public.evaluation_criterion_scores REPLICA IDENTITY FULL;
ALTER TABLE public.submission_versions REPLICA IDENTITY FULL;

-- ----------------------------------------------------------------------------
-- 2. SUPABASE REALTIME YAYININA (PUBLICATION) 5 TABLONUN EKLENMESİ
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- task_assignments
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'task_assignments'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignments;
    END IF;

    -- student_task_assignments
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'student_task_assignments'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.student_task_assignments;
    END IF;

    -- task_evaluations
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'task_evaluations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.task_evaluations;
    END IF;

    -- evaluation_criterion_scores
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'evaluation_criterion_scores'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.evaluation_criterion_scores;
    END IF;

    -- submission_versions
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'submission_versions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.submission_versions;
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. NOT DEĞİŞİKLİĞİ GEREKÇESİ ATOMİK VE GÜVENLİK SERTLEŞTİRMELİ RPC FONKSİYONU
-- ----------------------------------------------------------------------------
-- Güvenlik Sertleştirmeleri:
-- 1. search_path = pg_catalog, public, auth, pg_temp ile nesne gölgeleme engellenir.
-- 2. Oturum (auth.uid()) zorunludur; taklit (impersonation) engellenir.
-- 3. Çağırıcının öğretmen veya yönetici olduğu doğrulanır; öğrenciler bu fonksiyonu çağıramaz.
-- 4. Görev sahipliği kontrolü: Öğretmen yalnızca kendi atadığı görevin teslimlerini notlandırabilir.
-- 5. Kesinleşmiş not güncellemelerinde geçerli işlem (transaction) içinde 'app.grade_change_reason'
--    oturum ayarı atanır ve AFTER UPDATE tetikleyicisi trg_log_grade_change ile audit log atomik yazılır.
CREATE OR REPLACE FUNCTION public.save_evaluation_with_reason(
  p_student_task_assignment_id UUID,
  p_teacher_id UUID,
  p_status TEXT,
  p_total_score NUMERIC,
  p_general_comment TEXT DEFAULT NULL,
  p_change_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $$
DECLARE
  v_eval_id UUID;
  v_auth_user UUID;
  v_is_admin_user BOOLEAN;
  v_assignment_teacher_id UUID;
BEGIN
  -- 1. Aktif oturum denetimi (İstemci kimliği taklit edemez)
  v_auth_user := auth.uid();
  IF v_auth_user IS NULL THEN
    RAISE EXCEPTION 'Yetkisiz İşlem: Notlandırma yapabilmek için aktif bir kullanıcı oturumu gereklidir!';
  END IF;

  -- 2. Rol denetimi: Yalnızca öğretmen veya okul yöneticisi not verebilir
  v_is_admin_user := public.is_admin();
  IF NOT v_is_admin_user AND NOT public.is_teacher() THEN
    RAISE EXCEPTION 'Yetkisiz İşlem: Yalnızca öğretmen veya yönetici rolündeki kullanıcılar notlandırma yapabilir!';
  END IF;

  -- 3. Görev ve sahiplik denetimi:
  -- Öğrenci görev ataması var mı ve bu görevi hangi öğretmen atamış?
  SELECT ta.teacher_id INTO v_assignment_teacher_id
  FROM public.student_task_assignments sta
  JOIN public.task_assignments ta ON ta.id = sta.task_assignment_id
  WHERE sta.id = p_student_task_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Geçersiz İşlem: Belirtilen öğrenci görev kaydı bulunamadı!';
  END IF;

  -- Yönetici değilse, yalnızca görevi atayan öğretmen notlandırabilir
  IF NOT v_is_admin_user AND v_assignment_teacher_id <> v_auth_user THEN
    RAISE EXCEPTION 'Yetkisiz İşlem: Yalnızca kendi sınıf ve dersiniz için atadığınız görevleri notlandırabilirsiniz!';
  END IF;

  -- 4. Puan sınırları ve durum denetimi
  IF p_total_score < 0.0 OR p_total_score > 100.0 THEN
    RAISE EXCEPTION 'Geçersiz Puan: Toplam puan 0 ile 100 arasında olmalıdır!';
  END IF;

  IF p_status NOT IN ('draft', 'finalized') THEN
    RAISE EXCEPTION 'Geçersiz Durum: Not durumu yalnızca draft veya finalized olabilir!';
  END IF;

  -- 5. Kesinleşmiş not değişikliği gerekçesini geçerli işlem (transaction) içine yaz
  -- Böylece AFTER UPDATE tetikleyicisi trg_log_grade_change bu değeri güvenle okur
  IF p_change_reason IS NOT NULL AND TRIM(p_change_reason) <> '' THEN
    PERFORM set_config('app.grade_change_reason', TRIM(p_change_reason), true);
  END IF;

  -- 6. Değerlendirme kaydını oluştur veya güncelle
  INSERT INTO public.task_evaluations (
    student_task_assignment_id,
    teacher_id,
    status,
    total_score,
    general_comment,
    finalized_at
  )
  VALUES (
    p_student_task_assignment_id,
    v_auth_user,
    p_status::evaluation_status,
    p_total_score,
    p_general_comment,
    CASE WHEN p_status = 'finalized' THEN timezone('utc'::text, now()) ELSE NULL END
  )
  ON CONFLICT (student_task_assignment_id) DO UPDATE SET
    teacher_id = v_auth_user,
    status = EXCLUDED.status,
    total_score = EXCLUDED.total_score,
    general_comment = EXCLUDED.general_comment,
    finalized_at = CASE 
      WHEN EXCLUDED.status = 'finalized' AND task_evaluations.finalized_at IS NULL THEN timezone('utc'::text, now())
      ELSE task_evaluations.finalized_at 
    END,
    updated_at = timezone('utc'::text, now())
  RETURNING id INTO v_eval_id;

  RETURN v_eval_id;
END;
$$;

-- Fonksiyon çalıştırma izinlerini sıkılaştır: anonim erişimi tamamen engelle
REVOKE ALL ON FUNCTION public.save_evaluation_with_reason(UUID, UUID, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_evaluation_with_reason(UUID, UUID, TEXT, NUMERIC, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_evaluation_with_reason(UUID, UUID, TEXT, NUMERIC, TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. KURULUM DOĞRULAMA SORGULARI (Canlı Veritabanında Kontrol İçin)
-- ----------------------------------------------------------------------------
-- Realtime yayınında bulunan tabloları listele:
-- SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
