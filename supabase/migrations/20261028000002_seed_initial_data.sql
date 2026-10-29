-- ==============================================================================
-- PERFORMANS & PROJE GÖREV TAKİP SİSTEMİ
-- Başlangıç Verileri Tohumlama (Seed Data)
-- Sürüm: 20261028000002
-- ==============================================================================

-- 1. Başlangıç Okul Ayarları
INSERT INTO school_settings (
  school_name,
  active_academic_year,
  timezone,
  student_max_file_size_mb,
  teacher_max_file_size_mb,
  inactivity_timeout_minutes,
  is_initialized
)
VALUES (
  'Atatürk Mesleki ve Teknik Anadolu Lisesi',
  '2026-2027',
  'Europe/Istanbul',
  15,
  20,
  30,
  false
)
ON CONFLICT DO NOTHING;

-- 2. Başlangıç Akademik Yılı (2026-2027)
INSERT INTO academic_years (name, is_active, start_date, end_date)
VALUES (
  '2026-2027',
  true,
  '2026-09-14',
  '2027-06-18'
)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- 3. Başlangıç Sınıf Şubeleri (9/B, 10/B, 11/B, 12/B)
INSERT INTO classrooms (name, grade_level, branch, academic_year)
VALUES
  ('9/B', 9, 'B', '2026-2027'),
  ('10/B', 10, 'B', '2026-2027'),
  ('11/B', 11, 'B', '2026-2027'),
  ('12/B', 12, 'B', '2026-2027')
ON CONFLICT (name, academic_year) DO NOTHING;

-- 4. Başlangıç Dersleri
INSERT INTO courses (code, name, description)
VALUES
  (
    'PRG101',
    'Programlama Temelleri',
    'Algoritmik düşünme, akış diyagramları, değişkenler, döngüler ve temel programlama pratikleri.'
  ),
  (
    'NET201',
    'Ağ Sistemleri ve Anahtarlama',
    'OSI ve TCP/IP modelleri, IP adresleme, yerel ağ topolojileri ve anahtarlama yapılandırmaları.'
  )
ON CONFLICT (code) DO NOTHING;
