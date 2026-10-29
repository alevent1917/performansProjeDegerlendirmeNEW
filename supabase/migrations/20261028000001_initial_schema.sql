-- ==============================================================================
-- PERFORMANS & PROJE GÖREV TAKİP SİSTEMİ
-- Supabase PostgreSQL Veritabanı Şeması & Row Level Security (RLS) Politikaları
-- Sürüm: 20261028000001 (Güvenlik Sertleştirmeleri & Tetikleyici Korumaları)
-- ==============================================================================

-- Gerekli eklentiler
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ENUM TİPLERİ (IDEMPOTENT TANIMLAR)
-- ------------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'passive', 'pending_approval');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_format AS ENUM ('digital_pdf', 'paper');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE student_task_status AS ENUM (
    'not_submitted',
    'submitted',
    'late_submitted',
    'paper_reported',
    'paper_confirmed',
    'graded'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE evaluation_status AS ENUM ('draft', 'finalized');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE extension_status AS ENUM ('none', 'pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('info', 'warning', 'success', 'deadline', 'evaluation');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ZAMAN DAMGASI (UPDATED_AT) TETİKLEYİCİ FONKSİYONU
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 3. TABLOLAR (İLİŞKİ SIRASI VE KISITLAR)
-- ------------------------------------------------------------------------------

-- 3.1. Okul Genel Ayarları
CREATE TABLE IF NOT EXISTS school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL DEFAULT 'Atatürk Mesleki ve Teknik Anadolu Lisesi',
  logo_url TEXT,
  active_academic_year TEXT NOT NULL DEFAULT '2026-2027',
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  student_max_file_size_mb INTEGER NOT NULL DEFAULT 15,
  teacher_max_file_size_mb INTEGER NOT NULL DEFAULT 20,
  inactivity_timeout_minutes INTEGER NOT NULL DEFAULT 30,
  is_initialized BOOLEAN NOT NULL DEFAULT false,
  report_header_title TEXT DEFAULT 'T.C. MİLLÎ EĞİTİM BAKANLIĞI',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.2. Akademik Yıllar
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- Örn: '2026-2027'
  is_active BOOLEAN NOT NULL DEFAULT false,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.3. Kullanıcı Profilleri (auth.users ile senkronize)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  status user_status NOT NULL DEFAULT 'active',
  school_number TEXT UNIQUE, -- Öğrenciler için zorunlu ve benzersizdir
  phone TEXT,
  avatar_url TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT check_student_school_number CHECK (
    (role = 'student' AND school_number IS NOT NULL AND school_number <> '') OR
    (role <> 'student')
  )
);

-- 3.4. Sınıflar / Şubeler
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- Örn: '9/B', '10/B'
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 9 AND 12),
  branch TEXT NOT NULL, -- Örn: 'B'
  academic_year TEXT NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(name, academic_year)
);

-- 3.5. Dersler
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- Örn: 'PRG101', 'NET201'
  name TEXT NOT NULL, -- Örn: 'Programlama Temelleri'
  description TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.6. Öğretmen Sınıf & Ders Yetkilendirmeleri
CREATE TABLE IF NOT EXISTS teacher_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(teacher_id, classroom_id, course_id, academic_year)
);

-- 3.7. Öğrenci Tek Kullanımlık Aktivasyon Kodları
CREATE TABLE IF NOT EXISTS activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_number TEXT NOT NULL,
  code_hash TEXT NOT NULL, -- Güvenli özet
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  used_by_email TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  generated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.8. Öğretmen Başvuruları
CREATE TABLE IF NOT EXISTS teacher_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  branch_subject TEXT NOT NULL,
  application_notes TEXT,
  status application_status NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES user_profiles(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.9. Görev Havuzları
CREATE TABLE IF NOT EXISTS task_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_shared BOOLEAN NOT NULL DEFAULT false, -- Ortak zümre havuzu
  guideline_pdf_url TEXT,
  sample_files JSONB DEFAULT '[]'::jsonb,
  external_links JSONB DEFAULT '[]'::jsonb,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.10. Ölçüt Şablonları
CREATE TABLE IF NOT EXISTS rubric_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  is_shared BOOLEAN NOT NULL DEFAULT false, -- Ortak şablon
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.11. Görev Dağıtımları (Atamalar)
CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_pool_id UUID REFERENCES task_pools(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  term INTEGER NOT NULL CHECK (term IN (1, 2)),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  delivery_format delivery_format NOT NULL DEFAULT 'digital_pdf',
  due_date TIMESTAMPTZ NOT NULL,
  allow_late_submission BOOLEAN NOT NULL DEFAULT false,
  guideline_pdf_url TEXT,
  sample_files JSONB DEFAULT '[]'::jsonb,
  external_links JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  reminder_days_before INTEGER[] DEFAULT '{3, 1}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.12. Ölçütler (Şablon veya Dağıtılmış Göreve Bağlı)
CREATE TABLE IF NOT EXISTS rubric_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES rubric_templates(id) ON DELETE CASCADE,
  task_assignment_id UUID REFERENCES task_assignments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  max_points NUMERIC(4, 1) NOT NULL CHECK (max_points > 0 AND max_points <= 100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT check_criterion_parent CHECK (
    (template_id IS NOT NULL AND task_assignment_id IS NULL) OR
    (template_id IS NULL AND task_assignment_id IS NOT NULL)
  )
);

-- 3.13. Öğrenci Görev Atamaları
CREATE TABLE IF NOT EXISTS student_task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  status student_task_status NOT NULL DEFAULT 'not_submitted',
  submission_count INTEGER NOT NULL DEFAULT 0,
  paper_delivery_reported_at TIMESTAMPTZ,
  paper_delivery_confirmed_at TIMESTAMPTZ,
  paper_delivery_confirmed_by UUID REFERENCES user_profiles(id),
  extension_requested BOOLEAN NOT NULL DEFAULT false,
  extension_reason TEXT,
  extension_requested_at TIMESTAMPTZ,
  extension_due_date TIMESTAMPTZ,
  extension_status extension_status NOT NULL DEFAULT 'none',
  extension_reviewed_at TIMESTAMPTZ,
  extension_reviewed_by UUID REFERENCES user_profiles(id),
  score NUMERIC(4, 1) CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(task_assignment_id, student_id)
);

-- 3.14. PDF Teslim Sürümleri (15 MB Sınırı)
CREATE TABLE IF NOT EXISTS submission_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_task_assignment_id UUID NOT NULL REFERENCES student_task_assignments(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes <= 15728640), -- 15 MB kuralı
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  is_late BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(student_task_assignment_id, version_number)
);

-- 3.15. Ek Süre Talepleri (Ayrıntılı Talep Geçmişi)
CREATE TABLE IF NOT EXISTS extension_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_task_assignment_id UUID NOT NULL REFERENCES student_task_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  requested_due_date TIMESTAMPTZ NOT NULL,
  status extension_status NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES user_profiles(id),
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.16. Değerlendirmeler (Taslak ve Kesinleşmiş)
CREATE TABLE IF NOT EXISTS task_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_task_assignment_id UUID UNIQUE NOT NULL REFERENCES student_task_assignments(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status evaluation_status NOT NULL DEFAULT 'draft',
  total_score NUMERIC(4, 1) NOT NULL DEFAULT 0.0 CHECK (total_score >= 0 AND total_score <= 100),
  general_comment TEXT,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.17. Ölçüt Puanları (0.1 Hassasiyetinde)
CREATE TABLE IF NOT EXISTS evaluation_criterion_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES task_evaluations(id) ON DELETE CASCADE,
  rubric_criterion_id UUID NOT NULL REFERENCES rubric_criteria(id) ON DELETE CASCADE,
  score NUMERIC(4, 1) NOT NULL CHECK (score >= 0 AND score <= 100),
  criterion_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(evaluation_id, rubric_criterion_id)
);

-- 3.18. Puan Değişiklik Günlüğü (Audit Log)
CREATE TABLE IF NOT EXISTS grade_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES task_evaluations(id) ON DELETE CASCADE,
  old_score NUMERIC(4, 1) NOT NULL,
  new_score NUMERIC(4, 1) NOT NULL,
  changed_by UUID NOT NULL REFERENCES user_profiles(id),
  change_reason TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.19. Sistem Bildirimleri
CREATE TABLE IF NOT EXISTS system_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_role user_role NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.20. Yedekleme Günlüğü
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_details TEXT,
  storage_location TEXT NOT NULL,
  retention_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 4. PERFORMANS İNDEKSLERİ
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_school_num ON user_profiles(school_number);
CREATE INDEX IF NOT EXISTS idx_classrooms_academic_year ON classrooms(academic_year);
CREATE INDEX IF NOT EXISTS idx_task_assignments_class ON task_assignments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_teacher ON task_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_tasks_student ON student_task_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_tasks_assignment ON student_task_assignments(task_assignment_id);
CREATE INDEX IF NOT EXISTS idx_submission_versions_task ON submission_versions(student_task_assignment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON system_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_task ON rubric_criteria(task_assignment_id);

-- ------------------------------------------------------------------------------
-- 5. GÜVENLİK YARDIMCI FONKSİYONLARI (SEARCH_PATH KORUMALI)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'teacher' AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE OR REPLACE FUNCTION public.is_student()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'student' AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 6. VERİ BÜTÜNLÜĞÜ VE YETKİ GASPI ÖNLEME TETİKLEYİCİLERİ
-- ------------------------------------------------------------------------------

-- 6.1. Öğrencinin Kendi Notunu/Durumunu Değiştirmesini Engelleyen Tetikleyici
CREATE OR REPLACE FUNCTION public.enforce_student_task_assignment_integrity()
RETURNS TRIGGER AS $$
BEGIN
  -- Öğrenci ve görev kimlikleri hiçbir kullanıcı (yönetici hariç) tarafından değiştirilemez!
  IF NOT public.is_admin() THEN
    IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
      RAISE EXCEPTION 'Görev sahibi öğrenci kimliği değiştirilemez!';
    END IF;
    IF NEW.task_assignment_id IS DISTINCT FROM OLD.task_assignment_id THEN
      RAISE EXCEPTION 'Görevin bağlı olduğu atama değiştirilemez!';
    END IF;
  END IF;

  -- Eğer işlemi yapan yönetici veya öğretmen değilse (öğrenci ise):
  IF NOT (public.is_admin() OR public.is_teacher()) THEN
    -- Puan değiştirilemez!
    IF NEW.score IS DISTINCT FROM OLD.score THEN
      RAISE EXCEPTION 'Öğrenciler görev puanını değiştiremez!';
    END IF;
    -- Durum keyfi değiştirilemez; yalnızca paper_reported veya not_submitted yapabilir
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('paper_reported', 'not_submitted') THEN
      RAISE EXCEPTION 'Öğrenciler görev durumunu yalnızca kâğıt teslim bildirimi olarak güncelleyebilir!';
    END IF;
    -- Kâğıt teslim onayı verilemez!
    IF NEW.paper_delivery_confirmed_at IS DISTINCT FROM OLD.paper_delivery_confirmed_at OR
       NEW.paper_delivery_confirmed_by IS DISTINCT FROM OLD.paper_delivery_confirmed_by THEN
      RAISE EXCEPTION 'Öğrenciler kâğıt teslim onayını değiştiremez!';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_check_student_task_update_integrity ON student_task_assignments;
CREATE TRIGGER trg_check_student_task_update_integrity
  BEFORE UPDATE ON student_task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_student_task_assignment_integrity();

-- 6.2. Profil Rolü, Durum ve Okul No Değişikliğini Sadece Yöneticiye Sınırlayan Tetikleyici
CREATE OR REPLACE FUNCTION public.enforce_profile_role_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Kullanıcı rolü yalnızca okul yöneticisi tarafından değiştirilebilir!';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Kullanıcı hesap durumu yalnızca okul yöneticisi tarafından değiştirilebilir!';
    END IF;
    IF NEW.school_number IS DISTINCT FROM OLD.school_number THEN
      RAISE EXCEPTION 'Öğrenci okul numarası yalnızca okul yöneticisi tarafından değiştirilebilir!';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Kullanıcı e-posta adresi doğrudan profil üzerinden değiştirilemez!';
    END IF;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Kullanıcı kimliği değiştirilemez!';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_check_profile_role_update ON user_profiles;
CREATE TRIGGER trg_check_profile_role_update
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_role_integrity();

-- 6.3. Öğretmenin Yetkisiz Sınıf/Derse Görev Atamasını Engelleyen Tetikleyici
CREATE OR REPLACE FUNCTION public.enforce_teacher_assignment_permission()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    -- Savunma Derinliği: Öğretmen başkasının kimliğiyle görev oluşturamaz veya güncelleyemez!
    IF auth.uid() IS NOT NULL AND NEW.teacher_id <> auth.uid() THEN
      RAISE EXCEPTION 'Öğretmenler yalnızca kendi adlarına görev atayabilir veya güncelleyebilir!';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.teacher_permissions tp
      WHERE tp.teacher_id = NEW.teacher_id
      AND tp.classroom_id = NEW.classroom_id
      AND tp.course_id = NEW.course_id
      AND tp.academic_year = NEW.academic_year
    ) THEN
      RAISE EXCEPTION 'Öğretmenin bu sınıf ve ders için yetkilendirmesi bulunmamaktadır!';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_check_teacher_assignment_permission ON task_assignments;
CREATE TRIGGER trg_check_teacher_assignment_permission
  BEFORE INSERT OR UPDATE ON task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_teacher_assignment_permission();

-- 6.4. PDF Teslim Sürümlerinin Silinmesini veya Değiştirilmesini Engelleyen Tetikleyici (İmmutability)
CREATE OR REPLACE FUNCTION public.prevent_submission_version_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Yüklenmiş PDF teslim sürümleri akademik denetim gereği değiştirilemez veya silinemez!';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_submission_versions ON submission_versions;
CREATE TRIGGER trg_protect_submission_versions
  BEFORE UPDATE OR DELETE ON submission_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_submission_version_tampering();

-- 6.5. Not Değişikliğinde Güvenilir Otomatik Günlük Tetikleyicisi
CREATE OR REPLACE FUNCTION public.log_evaluation_grade_change()
RETURNS TRIGGER AS $$
DECLARE
  v_reason TEXT;
BEGIN
  -- Kesinleşmiş değerlendirmenin yetkisizce taslağa geri çekilmesi engellenir
  IF OLD.status = 'finalized' AND NEW.status = 'draft' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Kesinleşmiş bir değerlendirme taslak durumuna geri alınamaz!';
  END IF;

  -- Not değişikliği günlüğü: Kesinleşmiş değerlendirme notu değiştiğinde
  IF (OLD.status = 'finalized' AND NEW.total_score IS DISTINCT FROM OLD.total_score) THEN
    v_reason := NULLIF(TRIM(current_setting('app.grade_change_reason', true)), '');
    IF v_reason IS NULL THEN
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Kesinleşmiş not değişikliği için geçerli bir gerekçe belirtilmesi zorunludur!';
      ELSE
        v_reason := 'Okul yöneticisi tarafından doğrudan not güncellemesi yapıldı.';
      END IF;
    END IF;

    INSERT INTO public.grade_change_logs (
      evaluation_id,
      old_score,
      new_score,
      changed_by,
      change_reason,
      changed_at
    )
    VALUES (
      NEW.id,
      OLD.total_score,
      NEW.total_score,
      COALESCE(auth.uid(), NEW.teacher_id),
      v_reason,
      timezone('utc'::text, now())
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_log_grade_change ON task_evaluations;
CREATE TRIGGER trg_log_grade_change
  AFTER UPDATE ON task_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_evaluation_grade_change();

-- 6.6. Güncellenme Tarihi (updated_at) Tetikleyicilerinin Bağlanması
DROP TRIGGER IF EXISTS trg_set_updated_at_school_settings ON school_settings;
CREATE TRIGGER trg_set_updated_at_school_settings
  BEFORE UPDATE ON school_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_user_profiles ON user_profiles;
CREATE TRIGGER trg_set_updated_at_user_profiles
  BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_task_pools ON task_pools;
CREATE TRIGGER trg_set_updated_at_task_pools
  BEFORE UPDATE ON task_pools FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_rubric_templates ON rubric_templates;
CREATE TRIGGER trg_set_updated_at_rubric_templates
  BEFORE UPDATE ON rubric_templates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_task_assignments ON task_assignments;
CREATE TRIGGER trg_set_updated_at_task_assignments
  BEFORE UPDATE ON task_assignments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_student_tasks ON student_task_assignments;
CREATE TRIGGER trg_set_updated_at_student_tasks
  BEFORE UPDATE ON student_task_assignments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_task_evaluations ON task_evaluations;
CREATE TRIGGER trg_set_updated_at_task_evaluations
  BEFORE UPDATE ON task_evaluations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) ETKİNLEŞTİRME
-- ------------------------------------------------------------------------------

ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_criterion_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 8. DETAYLI RLS POLİTİKALARI (HER TABLO İÇİN)
-- ------------------------------------------------------------------------------

-- 8.1. school_settings & academic_years
DROP POLICY IF EXISTS "Okul ayarları herkese açık okunabilir" ON school_settings;
CREATE POLICY "Okul ayarları herkese açık okunabilir"
  ON school_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Yalnızca yöneticiler okul ayarlarını değiştirebilir" ON school_settings;
CREATE POLICY "Yalnızca yöneticiler okul ayarlarını değiştirebilir"
  ON school_settings FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Akademik yıllar herkes tarafından okunabilir" ON academic_years;
CREATE POLICY "Akademik yıllar herkes tarafından okunabilir"
  ON academic_years FOR SELECT USING (true);

DROP POLICY IF EXISTS "Akademik yılları yalnızca yönetici yönetir" ON academic_years;
CREATE POLICY "Akademik yılları yalnızca yönetici yönetir"
  ON academic_years FOR ALL USING (public.is_admin());

-- 8.2. user_profiles
DROP POLICY IF EXISTS "Kullanıcılar kendi profillerini görebilir" ON user_profiles;
CREATE POLICY "Kullanıcılar kendi profillerini görebilir"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin() OR public.is_teacher());

DROP POLICY IF EXISTS "Kullanıcı profilini oluşturabilir" ON user_profiles;
CREATE POLICY "Kullanıcı profilini oluşturabilir"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Kullanıcı kendi profilini güncelleyebilir rol hariç" ON user_profiles;
CREATE POLICY "Kullanıcı kendi profilini güncelleyebilir rol hariç"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    public.is_admin() OR
    (
      auth.uid() = id AND
      role = (SELECT p.role FROM user_profiles p WHERE p.id = auth.uid()) AND
      status = (SELECT p.status FROM user_profiles p WHERE p.id = auth.uid()) AND
      (school_number IS NOT DISTINCT FROM (SELECT p.school_number FROM user_profiles p WHERE p.id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Yöneticiler tüm profilleri silebilir" ON user_profiles;
CREATE POLICY "Yöneticiler tüm profilleri silebilir"
  ON user_profiles FOR DELETE USING (public.is_admin());

-- 8.3. classrooms & courses
DROP POLICY IF EXISTS "Sınıflar aktif oturumlarca okunabilir" ON classrooms;
CREATE POLICY "Sınıflar aktif oturumlarca okunabilir"
  ON classrooms FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Yönetici sınıfları yönetir" ON classrooms;
CREATE POLICY "Yönetici sınıfları yönetir"
  ON classrooms FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Dersler aktif oturumlarca okunabilir" ON courses;
CREATE POLICY "Dersler aktif oturumlarca okunabilir"
  ON courses FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Yönetici dersleri yönetir" ON courses;
CREATE POLICY "Yönetici dersleri yönetir"
  ON courses FOR ALL USING (public.is_admin());

-- 8.4. teacher_permissions (Öğretmen Yetkileri)
DROP POLICY IF EXISTS "Öğretmenler kendi yetkilerini görebilir" ON teacher_permissions;
CREATE POLICY "Öğretmenler kendi yetkilerini görebilir"
  ON teacher_permissions FOR SELECT
  USING (teacher_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Yöneticiler öğretmen yetkilerini yönetir" ON teacher_permissions;
CREATE POLICY "Yöneticiler öğretmen yetkilerini yönetir"
  ON teacher_permissions FOR ALL USING (public.is_admin());

-- 8.5. activation_codes (Yalnızca Yönetici)
DROP POLICY IF EXISTS "Aktivasyon kodlarına yalnızca yöneticiler erişebilir" ON activation_codes;
CREATE POLICY "Aktivasyon kodlarına yalnızca yöneticiler erişebilir"
  ON activation_codes FOR ALL USING (public.is_admin());

-- 8.6. teacher_applications (Başvurular)
DROP POLICY IF EXISTS "Öğretmen adayları başvuru ekleyebilir" ON teacher_applications;
CREATE POLICY "Öğretmen adayları başvuru ekleyebilir"
  ON teacher_applications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Yöneticiler başvuruları inceler ve yönetir" ON teacher_applications;
CREATE POLICY "Yöneticiler başvuruları inceler ve yönetir"
  ON teacher_applications FOR ALL USING (public.is_admin());

-- 8.7. task_pools (Görev Havuzları)
DROP POLICY IF EXISTS "Öğretmenler görev havuzunu görebilir" ON task_pools;
CREATE POLICY "Öğretmenler görev havuzunu görebilir"
  ON task_pools FOR SELECT
  USING (
    teacher_id = auth.uid() OR
    (is_shared = true AND public.is_teacher()) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Öğretmen kendi görev havuzunu yönetir" ON task_pools;
CREATE POLICY "Öğretmen kendi görev havuzunu yönetir"
  ON task_pools FOR ALL
  USING (teacher_id = auth.uid() OR public.is_admin());

-- 8.8. rubric_templates (Ölçüt Şablonları)
DROP POLICY IF EXISTS "Öğretmenler ölçüt şablonlarını görebilir" ON rubric_templates;
CREATE POLICY "Öğretmenler ölçüt şablonlarını görebilir"
  ON rubric_templates FOR SELECT
  USING (
    teacher_id = auth.uid() OR
    (is_shared = true AND public.is_teacher()) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Öğretmen kendi ölçüt şablonlarını yönetir" ON rubric_templates;
CREATE POLICY "Öğretmen kendi ölçüt şablonlarını yönetir"
  ON rubric_templates FOR ALL
  USING (teacher_id = auth.uid() OR public.is_admin());

-- 8.9. task_assignments (Görev Dağıtımları)
DROP POLICY IF EXISTS "Öğretmen yetkili olduğu sınıfa görev atayabilir" ON task_assignments;
CREATE POLICY "Öğretmen yetkili olduğu sınıfa görev atayabilir"
  ON task_assignments FOR ALL
  USING (
    public.is_admin() OR
    (teacher_id = auth.uid() AND EXISTS (
      SELECT 1 FROM teacher_permissions tp
      WHERE tp.teacher_id = auth.uid()
      AND tp.classroom_id = task_assignments.classroom_id
      AND tp.course_id = task_assignments.course_id
      AND tp.academic_year = task_assignments.academic_year
    ))
  )
  WITH CHECK (
    public.is_admin() OR
    (teacher_id = auth.uid() AND EXISTS (
      SELECT 1 FROM teacher_permissions tp
      WHERE tp.teacher_id = auth.uid()
      AND tp.classroom_id = task_assignments.classroom_id
      AND tp.course_id = task_assignments.course_id
      AND tp.academic_year = task_assignments.academic_year
    ))
  );

DROP POLICY IF EXISTS "Öğrenci yayımlanmış görevleri görebilir" ON task_assignments;
CREATE POLICY "Öğrenci yayımlanmış görevleri görebilir"
  ON task_assignments FOR SELECT
  USING (status = 'published');

-- 8.10. rubric_criteria (Ölçütler)
DROP POLICY IF EXISTS "Ölçütleri ilgili kullanıcılar görebilir" ON rubric_criteria;
CREATE POLICY "Ölçütleri ilgili kullanıcılar görebilir"
  ON rubric_criteria FOR SELECT
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM rubric_templates rt
      WHERE rt.id = rubric_criteria.template_id
      AND (rt.teacher_id = auth.uid() OR rt.is_shared = true)
    ) OR
    EXISTS (
      SELECT 1 FROM task_assignments ta
      WHERE ta.id = rubric_criteria.task_assignment_id
      AND (ta.status = 'published' OR ta.teacher_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Öğretmen ölçütleri yönetir" ON rubric_criteria;
CREATE POLICY "Öğretmen ölçütleri yönetir"
  ON rubric_criteria FOR ALL
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM rubric_templates rt
      WHERE rt.id = rubric_criteria.template_id
      AND rt.teacher_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM task_assignments ta
      WHERE ta.id = rubric_criteria.task_assignment_id
      AND ta.teacher_id = auth.uid()
    )
  );

-- 8.11. student_task_assignments (Öğrenci Görevleri)
DROP POLICY IF EXISTS "Öğrenci yalnızca kendi görev atamasını görür" ON student_task_assignments;
CREATE POLICY "Öğrenci yalnızca kendi görev atamasını görür"
  ON student_task_assignments FOR SELECT
  USING (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Öğretmen sınıfındaki öğrenci görevlerini yönetir" ON student_task_assignments;
CREATE POLICY "Öğretmen sınıfındaki öğrenci görevlerini yönetir"
  ON student_task_assignments FOR ALL
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM task_assignments ta
      WHERE ta.id = student_task_assignments.task_assignment_id
      AND ta.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Öğrenci kâğıt teslim bildirebilir ve ek süre isteyebilir" ON student_task_assignments;
CREATE POLICY "Öğrenci kâğıt teslim bildirebilir ve ek süre isteyebilir"
  ON student_task_assignments FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- 8.12. submission_versions (PDF Dosyaları - Sürüm Koruma & İmmutability)
DROP POLICY IF EXISTS "Öğrenci kendi PDF teslim sürümlerini görebilir" ON submission_versions;
CREATE POLICY "Öğrenci kendi PDF teslim sürümlerini görebilir"
  ON submission_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_task_assignments sta
      WHERE sta.id = submission_versions.student_task_assignment_id
      AND sta.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Öğrenci yeni PDF teslim sürümü ekleyebilir" ON submission_versions;
CREATE POLICY "Öğrenci yeni PDF teslim sürümü ekleyebilir"
  ON submission_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_task_assignments sta
      WHERE sta.id = submission_versions.student_task_assignment_id
      AND sta.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Öğretmen atadığı görevin teslimlerini görebilir" ON submission_versions;
CREATE POLICY "Öğretmen atadığı görevin teslimlerini görebilir"
  ON submission_versions FOR SELECT
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM student_task_assignments sta
      JOIN task_assignments ta ON ta.id = sta.task_assignment_id
      WHERE sta.id = submission_versions.student_task_assignment_id
      AND ta.teacher_id = auth.uid()
    )
  );

-- 8.13. extension_requests (Ek Süre Talepleri)
DROP POLICY IF EXISTS "Öğrenci kendi ek süre taleplerini görebilir ve oluşturabilir" ON extension_requests;
CREATE POLICY "Öğrenci kendi ek süre taleplerini görebilir ve oluşturabilir"
  ON extension_requests FOR ALL
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Öğretmen ve yönetici ek süre taleplerini yönetebilir" ON extension_requests;
CREATE POLICY "Öğretmen ve yönetici ek süre taleplerini yönetebilir"
  ON extension_requests FOR ALL
  USING (public.is_teacher() OR public.is_admin());

-- 8.14. task_evaluations (Değerlendirmeler)
DROP POLICY IF EXISTS "Öğrenci yalnızca kesinleşmiş değerlendirmesini görür" ON task_evaluations;
CREATE POLICY "Öğrenci yalnızca kesinleşmiş değerlendirmesini görür"
  ON task_evaluations FOR SELECT
  USING (
    status = 'finalized' AND
    EXISTS (
      SELECT 1 FROM student_task_assignments sta
      WHERE sta.id = task_evaluations.student_task_assignment_id
      AND sta.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Öğretmen değerlendirmeleri yönetir (taslak veya kesin)" ON task_evaluations;
CREATE POLICY "Öğretmen değerlendirmeleri yönetir (taslak veya kesin)"
  ON task_evaluations FOR ALL
  USING (teacher_id = auth.uid() OR public.is_admin());

-- 8.15. evaluation_criterion_scores (Ölçüt Puanları)
DROP POLICY IF EXISTS "Öğrenci kesinleşmiş ölçüt puanlarını görebilir" ON evaluation_criterion_scores;
CREATE POLICY "Öğrenci kesinleşmiş ölçüt puanlarını görebilir"
  ON evaluation_criterion_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_evaluations te
      JOIN student_task_assignments sta ON sta.id = te.student_task_assignment_id
      WHERE te.id = evaluation_criterion_scores.evaluation_id
      AND te.status = 'finalized'
      AND sta.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Öğretmen ölçüt puanlarını yönetir" ON evaluation_criterion_scores;
CREATE POLICY "Öğretmen ölçüt puanlarını yönetir"
  ON evaluation_criterion_scores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM task_evaluations te
      WHERE te.id = evaluation_criterion_scores.evaluation_id
      AND (te.teacher_id = auth.uid() OR public.is_admin())
    )
  );

-- 8.16. grade_change_logs (Not Değişiklik Günlüğü - Tamamen İmmutable)
DROP POLICY IF EXISTS "Not değişiklik günlüğünü öğretmen ve yönetici görebilir" ON grade_change_logs;
CREATE POLICY "Not değişiklik günlüğünü öğretmen ve yönetici görebilir"
  ON grade_change_logs FOR SELECT
  USING (public.is_teacher() OR public.is_admin());

DROP POLICY IF EXISTS "Not değişiklik günlüğü doğrudan elle eklenemez" ON grade_change_logs;
CREATE POLICY "Not değişiklik günlüğü doğrudan elle eklenemez"
  ON grade_change_logs FOR INSERT
  WITH CHECK (false); -- Hiçbir istemci (yönetici dahi) doğrudan elle ekleyemez; yalnızca güvenilir SECURITY DEFINER trigger üretir

DROP POLICY IF EXISTS "Not değişiklik günlüğü güncellenemez" ON grade_change_logs;
CREATE POLICY "Not değişiklik günlüğü güncellenemez"
  ON grade_change_logs FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "Not değişiklik günlüğü silinemez" ON grade_change_logs;
CREATE POLICY "Not değişiklik günlüğü silinemez"
  ON grade_change_logs FOR DELETE
  USING (false);

-- 8.17. system_notifications (Bildirimler)
DROP POLICY IF EXISTS "Kullanıcılar yalnızca kendi bildirimlerini görebilir ve yönetebilir" ON system_notifications;
CREATE POLICY "Kullanıcılar yalnızca kendi bildirimlerini görebilir ve yönetebilir"
  ON system_notifications FOR ALL
  USING (user_id = auth.uid());

-- 8.18. backup_logs (Yedekleme Günlükleri)
DROP POLICY IF EXISTS "Yedekleme kayıtlarını yalnızca yönetici görebilir ve yönetebilir" ON backup_logs;
CREATE POLICY "Yedekleme kayıtlarını yalnızca yönetici görebilir ve yönetebilir"
  ON backup_logs FOR ALL
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 9. SUPABASE STORAGE BUCKETLARI VE POLİTİKALARI (DOSYA DEPOLAMA GÜVENLİĞİ)
-- ------------------------------------------------------------------------------

DO $$ BEGIN
  -- 9.1. task-submissions bucket (Özel / Private - 15 MB PDF sınırı)
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'task-submissions',
    'task-submissions',
    false, -- Kesinlikle herkese açık değil (Private)
    15728640, -- 15 MB
    ARRAY['application/pdf']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['application/pdf'];

  -- 9.2. task-guidelines bucket (Öğretmen Kaynakları - 20 MB sınırı)
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'task-guidelines',
    'task-guidelines',
    false,
    20971520, -- 20 MB
    ARRAY['application/pdf', 'application/zip', 'application/x-zip-compressed']
  )
  ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 20971520;
EXCEPTION
  WHEN undefined_table THEN null; -- Standart PostgreSQL test ortamında storage şeması yoksa atla
END $$;

DO $$ BEGIN
  -- Öğrenci yalnızca kendi klasörüne (klasör adı = student_id) PDF yükleyebilir
  DROP POLICY IF EXISTS "Öğrenci yalnızca kendi klasörüne PDF yükleyebilir" ON storage.objects;
  CREATE POLICY "Öğrenci yalnızca kendi klasörüne PDF yükleyebilir"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'task-submissions' AND
      auth.uid() IS NOT NULL AND
      (storage.foldername(name))[1] = auth.uid()::text
    );

  -- Öğrenci yalnızca kendi klasöründeki PDF dosyalarını okuyabilir
  DROP POLICY IF EXISTS "Öğrenci yalnızca kendi teslimlerini okuyabilir" ON storage.objects;
  CREATE POLICY "Öğrenci yalnızca kendi teslimlerini okuyabilir"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'task-submissions' AND
      auth.uid() IS NOT NULL AND
      (storage.foldername(name))[1] = auth.uid()::text
    );

  -- Öğretmen ve yönetici yetkili teslim dosyalarını okuyabilir (Yalnızca kendi görevlerine yapılan teslimler)
  DROP POLICY IF EXISTS "Öğretmen ve yönetici teslim dosyalarını okuyabilir" ON storage.objects;
  CREATE POLICY "Öğretmen ve yönetici teslim dosyalarını okuyabilir"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'task-submissions' AND (
        public.is_admin() OR
        (public.is_teacher() AND EXISTS (
          SELECT 1 FROM public.student_task_assignments sta
          JOIN public.task_assignments ta ON ta.id = sta.task_assignment_id
          WHERE ta.teacher_id = auth.uid()
          AND (storage.foldername(name))[1] = sta.student_id::text
        ))
      )
    );

  -- Teslim PDF'leri akademik denetim gereği doğrudan silinemez ve güncellenemez
  DROP POLICY IF EXISTS "Teslim dosyaları doğrudan silinemez" ON storage.objects;
  CREATE POLICY "Teslim dosyaları doğrudan silinemez"
    ON storage.objects FOR DELETE
    USING (public.is_admin());

  DROP POLICY IF EXISTS "Teslim dosyaları doğrudan güncellenemez" ON storage.objects;
  CREATE POLICY "Teslim dosyaları doğrudan güncellenemez"
    ON storage.objects FOR UPDATE
    USING (public.is_admin());

  -- task-guidelines politikaları
  DROP POLICY IF EXISTS "Kullanıcılar yönergeleri okuyabilir" ON storage.objects;
  CREATE POLICY "Kullanıcılar yönergeleri okuyabilir"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'task-guidelines' AND auth.uid() IS NOT NULL);

  DROP POLICY IF EXISTS "Öğretmenler yönerge yükleyebilir" ON storage.objects;
  CREATE POLICY "Öğretmenler yönerge yükleyebilir"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'task-guidelines' AND
      (public.is_teacher() OR public.is_admin())
    );
EXCEPTION
  WHEN undefined_table THEN null;
  WHEN duplicate_object THEN null;
END $$;
