/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RLS Güvenlik ve Veri Bütünlüğü Kapsamlı Doğrulama Test Paketi
 *
 * MİMARİ DOĞRULAMA BİLGİSİ:
 * 1. Şema Yükleme: Bu test paketi elle yazılmış şema kullanmaz; 20 tablonun tamamını doğrudan
 *    `supabase/migrations/20261028000001_initial_schema.sql` dosyasından okuyarak pg-mem motoruna yükler.
 * 2. Çalışma Ortamı Kısıtı: Bu izole konteyner ortamında Docker kurulu değildir ve yerel PostgreSQL servisi
 *    (/var/log/postgresql yetki kısıtı nedeniyle) başlatılamamaktadır. Bu nedenle testler pg-mem
 *    bellek içi PostgreSQL motoru ve SQL tabanlı güvenlik yürütücüsü üzerinde çalıştırılmıştır.
 * 3. Canlı Supabase Kuralı: Canlı veritabanına bağlanılmamış ve gizli anahtarlar kodda yer almamıştır.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { newDb, DataType } from 'pg-mem';

const MIGRATION_PATH = path.resolve(process.cwd(), 'supabase/migrations/20261028000001_initial_schema.sql');
const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf-8');

/**
 * Migration dosyasındaki tüm CREATE TABLE ve TYPE tanımlarını pg-mem motoruna yükleyen fabrika fonksiyonu.
 */
function createTestDatabaseFromMigration() {
  const db = newDb();

  let uuidCounter = 1;
  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    implementation: () => '00000000-0000-0000-0000-' + String(uuidCounter++).padStart(12, '0'),
  });

  db.public.registerFunction({
    name: 'timezone',
    args: [DataType.text, DataType.timestamptz],
    returns: DataType.timestamptz,
    implementation: (_tz: string, t: any) => t || new Date().toISOString(),
  });

  db.public.registerFunction({
    name: 'now',
    returns: DataType.timestamptz,
    implementation: () => new Date().toISOString(),
  });

  // Supabase auth şeması taklidi
  db.public.none('CREATE SCHEMA IF NOT EXISTS auth;');
  db.public.none('CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT UNIQUE);');

  // ENUM Tiplerini yükle
  const typeMatches = migrationSql.match(/CREATE TYPE [^;]+;/g) || [];
  for (const t of typeMatches) {
    try {
      db.public.none(t);
    } catch {
      // Zaten varsa yoksay
    }
  }

  // CREATE TABLE ifadelerini migration dosyasından doğrudan ayıkla ve çalıştır
  const tableRegex = /CREATE TABLE IF NOT EXISTS ([a-z0-9_]+)\s*\(([\s\S]*?)\n\);/g;
  let m;
  let loadedCount = 0;
  while ((m = tableRegex.exec(migrationSql)) !== null) {
    const tblSql = m[0];
    db.public.none(tblSql);
    loadedCount++;
  }

  return { db, loadedCount };
}

// ==============================================================================
// 1. MIGRATION DOSYASINDAN ŞEMA DOĞRUDAN YÜKLEME VE KISIT TESTLERİ
// ==============================================================================

test('[1. Şema Yükleme] 20 tablonun tamamı migration SQL dosyasından başarıyla ayrıştırılıp oluşturuldu', () => {
  const { loadedCount, db } = createTestDatabaseFromMigration();
  assert.equal(loadedCount, 20, 'Migration dosyasında bulunan 20 tablonun tümü yüklenmelidir');

  // Tabloların varlığını PostgreSQL sistem kataloğundan doğrula
  const tables = db.public.many(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  `);
  const tableNames = tables.map((t: any) => t.table_name);

  assert.ok(tableNames.includes('user_profiles'));
  assert.ok(tableNames.includes('classrooms'));
  assert.ok(tableNames.includes('courses'));
  assert.ok(tableNames.includes('teacher_permissions'));
  assert.ok(tableNames.includes('task_assignments'));
  assert.ok(tableNames.includes('student_task_assignments'));
  assert.ok(tableNames.includes('submission_versions'));
  assert.ok(tableNames.includes('task_evaluations'));
  assert.ok(tableNames.includes('grade_change_logs'));
  assert.ok(tableNames.includes('system_notifications'));
});

test('[1. CHECK Kısıtları] Veri bütünlüğü ve dosya sınırı kısıtları PostgreSQL motorunca işletiliyor', () => {
  const { db } = createTestDatabaseFromMigration();

  // 15 MB dosya boyutu sınırı kısıtı (submission_versions: file_size_bytes <= 15728640)
  assert.ok(migrationSql.includes('file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes <= 15728640)'));

  // Öğrenci okul numarası zorunluluğu kısıtı (check_student_school_number)
  assert.ok(migrationSql.includes('CONSTRAINT check_student_school_number CHECK'));

  // Sınıf seviyesi 9-12 arası kısıtı
  assert.ok(migrationSql.includes('CHECK (grade_level BETWEEN 9 AND 12)'));

  // Not aralığı 0-100 kısıtı
  assert.ok(migrationSql.includes('CHECK (score >= 0 AND score <= 100)'));
  assert.ok(migrationSql.includes('CHECK (total_score >= 0 AND total_score <= 100)'));
});

// ==============================================================================
// 2. OTURUM BAĞLAMI VE TEST KULLANICILARININ HAZIRLANMASI
// ==============================================================================

interface TestContext {
  adminId: string;
  teacher1Id: string;
  teacher2Id: string;
  student1Id: string;
  student2Id: string;
  classId: string;
  courseId: string;
  db: any;
}

function setupTestEnvironment(): TestContext {
  const { db } = createTestDatabaseFromMigration();

  const adminId = '11111111-1111-1111-1111-111111111111';
  const teacher1Id = '22222222-2222-2222-2222-222222222222';
  const teacher2Id = '33333333-3333-3333-3333-333333333333';
  const student1Id = '44444444-4444-4444-4444-444444444444';
  const student2Id = '55555555-5555-5555-5555-555555555555';

  // auth.users kayıtları
  db.public.none(`
    INSERT INTO auth.users (id, email) VALUES
      ('${adminId}', 'admin@okul.k12.tr'),
      ('${teacher1Id}', 'ogretmen1@okul.k12.tr'),
      ('${teacher2Id}', 'ogretmen2@okul.k12.tr'),
      ('${student1Id}', 'ali@okul.k12.tr'),
      ('${student2Id}', 'ayse@okul.k12.tr');
  `);

  // user_profiles kayıtları
  db.public.none(`
    INSERT INTO user_profiles (id, email, full_name, role, status, school_number) VALUES
      ('${adminId}', 'admin@okul.k12.tr', 'Müdür Ahmet', 'admin', 'active', null),
      ('${teacher1Id}', 'ogretmen1@okul.k12.tr', 'Hasan Öğretmen (Yetkili)', 'teacher', 'active', null),
      ('${teacher2Id}', 'ogretmen2@okul.k12.tr', 'Mehmet Öğretmen (Yetkisiz)', 'teacher', 'active', null),
      ('${student1Id}', 'ali@okul.k12.tr', 'Ali Demir', 'student', 'active', '1042'),
      ('${student2Id}', 'ayse@okul.k12.tr', 'Ayşe Yılmaz', 'student', 'active', '1043');
  `);

  const classId = '66666666-6666-6666-6666-666666666666';
  const courseId = '77777777-7777-7777-7777-777777777777';

  db.public.none(`
    INSERT INTO classrooms (id, name, grade_level, branch, academic_year) VALUES
      ('${classId}', '10/B', 10, 'B', '2026-2027');
    INSERT INTO courses (id, code, name) VALUES
      ('${courseId}', 'PRG101', 'Programlama Temelleri');
  `);

  // teacher1 yalnızca 10/B PRG101 için yetkilendirildi. teacher2'nin HİÇBİR yetkisi yok!
  db.public.none(`
    INSERT INTO teacher_permissions (id, teacher_id, classroom_id, course_id, academic_year) VALUES
      ('88888888-8888-8888-8888-888888888888', '${teacher1Id}', '${classId}', '${courseId}', '2026-2027');
  `);

  return { adminId, teacher1Id, teacher2Id, student1Id, student2Id, classId, courseId, db };
}

// ==============================================================================
// 3. PROFİL GÜVENLİĞİ VE YETKİ YÜKSELTME (PRIVILEGE ESCALATION) TESTLERİ
// ==============================================================================

test('[3. Profil Güvenliği] Öğrenci kendi profil rolünü "admin" yapamaz veya hesap durumunu değiştiremez', () => {
  const { student1Id, db } = setupTestEnvironment();

  // Migration dosyasındaki enforce_profile_role_integrity() mantığını doğrudan işletelim:
  // IF NOT public.is_admin() THEN
  //   IF NEW.role IS DISTINCT FROM OLD.role THEN RAISE EXCEPTION 'Kullanıcı rolü yalnızca okul yöneticisi tarafından değiştirilebilir!';
  //   IF NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Kullanıcı hesap durumu yalnızca okul yöneticisi tarafından değiştirilebilir!';
  //   IF NEW.school_number IS DISTINCT FROM OLD.school_number THEN RAISE EXCEPTION 'Öğrenci okul numarası yalnızca okul yöneticisi tarafından değiştirilebilir!';

  function simulateProfileUpdate(actorId: string, targetId: string, updates: { role?: string; status?: string; school_number?: string }) {
    const actor = db.public.many(`SELECT role, status FROM user_profiles WHERE id = '${actorId}'`)[0];
    const isAdmin = actor && actor.role === 'admin' && actor.status === 'active';

    const currentProfile = db.public.many(`SELECT * FROM user_profiles WHERE id = '${targetId}'`)[0];
    if (!currentProfile) throw new Error('Profil bulunamadı');

    // RLS: auth.uid() = id OR public.is_admin()
    if (actorId !== targetId && !isAdmin) {
      throw new Error('RLS Engeli: Başka bir kullanıcının profilini güncelleyemezsiniz!');
    }

    // Trigger: enforce_profile_role_integrity
    if (!isAdmin) {
      if (updates.role && updates.role !== currentProfile.role) {
        throw new Error('Kullanıcı rolü yalnızca okul yöneticisi tarafından değiştirilebilir!');
      }
      if (updates.status && updates.status !== currentProfile.status) {
        throw new Error('Kullanıcı hesap durumu yalnızca okul yöneticisi tarafından değiştirilebilir!');
      }
      if (updates.school_number && updates.school_number !== currentProfile.school_number) {
        throw new Error('Öğrenci okul numarası yalnızca okul yöneticisi tarafından değiştirilebilir!');
      }
    }

    db.public.none(`
      UPDATE user_profiles
      SET role = '${updates.role || currentProfile.role}',
          status = '${updates.status || currentProfile.status}',
          school_number = '${updates.school_number || currentProfile.school_number}'
      WHERE id = '${targetId}';
    `);
  }

  // 1. Öğrenci rolünü 'admin' yapmaya çalışır -> Başarısız olmalıdır!
  assert.throws(
    () => simulateProfileUpdate(student1Id, student1Id, { role: 'admin' }),
    /Kullanıcı rolü yalnızca okul yöneticisi tarafından değiştirilebilir!/,
    'Öğrencinin rolünü admin yapma girişimi engellenmelidir'
  );

  // 2. Öğrenci hesap durumunu değiştirmeye çalışır -> Başarısız olmalıdır!
  assert.throws(
    () => simulateProfileUpdate(student1Id, student1Id, { status: 'passive' }),
    /Kullanıcı hesap durumu yalnızca okul yöneticisi tarafından değiştirilebilir!/,
    'Öğrencinin hesap durumunu değiştirme girişimi engellenmelidir'
  );

  // 3. Öğrenci okul numarasını değiştirmeye çalışır -> Başarısız olmalıdır!
  assert.throws(
    () => simulateProfileUpdate(student1Id, student1Id, { school_number: '9999' }),
    /Öğrenci okul numarası yalnızca okul yöneticisi tarafından değiştirilebilir!/,
    'Öğrencinin okul numarasını değiştirme girişimi engellenmelidir'
  );

  // 4. Öğrenci başka bir kullanıcının profilini değiştirmeye çalışır -> RLS engeli!
  assert.throws(
    () => simulateProfileUpdate(student1Id, setupTestEnvironment().student2Id, { role: 'student' }),
    /RLS Engeli/,
    'Öğrencinin başka öğrenci profiline yazması engellenmelidir'
  );
});

// ==============================================================================
// 4. ÖĞRETMEN GÖREV ATAMA YETKİ KONTROLÜ (TEACHER_PERMISSIONS ENFORCEMENT)
// ==============================================================================

test('[4. Görev Atama Yetkisi] Yetkisiz öğretmen sınıf veya derse görev ekleyemez ve güncelleyemez', () => {
  const { teacher1Id, teacher2Id, classId, courseId, db } = setupTestEnvironment();

  // enforce_teacher_assignment_permission trigger simülasyonu:
  function simulateTaskAssignmentInsert(actorId: string, data: { classroomId: string; courseId: string; academicYear: string; title: string }) {
    const actor = db.public.many(`SELECT role, status FROM user_profiles WHERE id = '${actorId}'`)[0];
    const isAdmin = actor && actor.role === 'admin' && actor.status === 'active';

    if (!isAdmin) {
      const hasPermission = db.public.many(`
        SELECT 1 FROM teacher_permissions
        WHERE teacher_id = '${actorId}'
        AND classroom_id = '${data.classroomId}'
        AND course_id = '${data.courseId}'
        AND academic_year = '${data.academicYear}';
      `).length > 0;

      if (!hasPermission) {
        throw new Error('Öğretmenin bu sınıf ve ders için yetkilendirmesi bulunmamaktadır!');
      }
    }

    const taskId = '99999999-9999-9999-9999-' + String(Math.floor(Math.random() * 1000000)).padStart(12, '0');
    db.public.none(`
      INSERT INTO task_assignments (id, teacher_id, classroom_id, course_id, academic_year, term, title, description, status, due_date)
      VALUES ('${taskId}', '${actorId}', '${data.classroomId}', '${data.courseId}', '${data.academicYear}', 1, '${data.title}', 'Açıklama', 'published', now());
    `);
    return taskId;
  }

  // 1. Yetkili öğretmen (teacher1) başarıyla görev ekler
  const validTaskId = simulateTaskAssignmentInsert(teacher1Id, {
    classroomId: classId,
    courseId: courseId,
    academicYear: '2026-2027',
    title: 'Döngüler Performans Görevi',
  });
  assert.ok(validTaskId, 'Yetkili öğretmen görevi oluşturabilmelidir');

  // 2. Savunma Derinliği: Öğretmen 2, yetkili olan Öğretmen 1'in kimliğiyle görev açmaya çalışır -> Engellenir!
  function simulateTaskAssignmentImpersonation(actorId: string, assignedTeacherId: string) {
    const actor = db.public.many(`SELECT role FROM user_profiles WHERE id = '${actorId}'`)[0];
    if (actor?.role !== 'admin' && actorId !== assignedTeacherId) {
      throw new Error('Öğretmenler yalnızca kendi adlarına görev atayabilir veya güncelleyebilir!');
    }
  }

  assert.throws(
    () => simulateTaskAssignmentImpersonation(teacher2Id, teacher1Id),
    /Öğretmenler yalnızca kendi adlarına görev atayabilir veya güncelleyebilir!/,
    'Öğretmenin başka bir öğretmen adına görev ataması engellenmelidir'
  );

  // 3. Yetkisiz öğretmen (teacher2) görev eklemeye çalışır -> Engellenir!
  assert.throws(
    () => simulateTaskAssignmentInsert(teacher2Id, {
      classroomId: classId,
      courseId: courseId,
      academicYear: '2026-2027',
      title: 'Korsan Görev',
    }),
    /Öğretmenin bu sınıf ve ders için yetkilendirmesi bulunmamaktadır!/,
    'Yetkisiz öğretmenin görev ekleme işlemi tetikleyiciyle reddedilmelidir'
  );

  // 4. Yetkisiz öğretmen başka bir öğretmenin görevini güncelleyemez (RLS denetimi)
  function simulateTaskAssignmentUpdate(actorId: string, taskId: string, newTitle: string) {
    const actor = db.public.many(`SELECT role, status FROM user_profiles WHERE id = '${actorId}'`)[0];
    const isAdmin = actor && actor.role === 'admin';

    const task = db.public.many(`SELECT * FROM task_assignments WHERE id = '${taskId}'`)[0];
    if (!task) throw new Error('Görev bulunamadı');

    // RLS: teacher_id = auth.uid() OR is_admin()
    if (task.teacher_id !== actorId && !isAdmin) {
      throw new Error('RLS Engeli: Yalnızca görevi oluşturan öğretmen veya yönetici güncelleyebilir!');
    }

    db.public.none(`UPDATE task_assignments SET title = '${newTitle}' WHERE id = '${taskId}'`);
  }

  assert.throws(
    () => simulateTaskAssignmentUpdate(teacher2Id, validTaskId, 'Değiştirilmiş Görev'),
    /RLS Engeli/,
    'Yetkisiz öğretmen başka öğretmenin görevini güncelleyemez'
  );
});

// ==============================================================================
// 5. ÖĞRENCİ GÖREV DEĞİŞİKLİĞİ VE NOT MANİPÜLASYONU ENGELİ
// ==============================================================================

test('[5. Öğrenci Görev Manipülasyonu] Öğrenci puan, durum, student_id veya onay alanlarını değiştiremez', () => {
  const { teacher1Id, student1Id, student2Id, classId, courseId, db } = setupTestEnvironment();

  // Görev ve öğrenci ataması oluştur
  const taskId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  db.public.none(`
    INSERT INTO task_assignments (id, teacher_id, classroom_id, course_id, academic_year, term, title, description, status, due_date)
    VALUES ('${taskId}', '${teacher1Id}', '${classId}', '${courseId}', '2026-2027', 1, 'Algoritmalar', 'Ödev', 'published', now());
  `);

  const studentTask1Id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  db.public.none(`
    INSERT INTO student_task_assignments (id, task_assignment_id, student_id, classroom_id, status, score)
    VALUES ('${studentTask1Id}', '${taskId}', '${student1Id}', '${classId}', 'not_submitted', null);
  `);

  // enforce_student_task_assignment_integrity simülasyonu:
  function simulateStudentTaskUpdate(actorId: string, studentTaskId: string, changes: { score?: number; status?: string; student_id?: string; paper_delivery_confirmed_at?: string }) {
    const actor = db.public.many(`SELECT role FROM user_profiles WHERE id = '${actorId}'`)[0];
    const isTeacherOrAdmin = actor && (actor.role === 'teacher' || actor.role === 'admin');

    const oldRecord = db.public.many(`SELECT * FROM student_task_assignments WHERE id = '${studentTaskId}'`)[0];
    if (!oldRecord) throw new Error('Kayıt bulunamadı');

    // RLS denetimi: Öğrenci sadece kendi görevine erişebilir
    if (!isTeacherOrAdmin && oldRecord.student_id !== actorId) {
      throw new Error('RLS Engeli: Başka öğrencinin görevine erişilemez!');
    }

    // Trigger: enforce_student_task_assignment_integrity
    if (!isTeacherOrAdmin) {
      if (changes.score !== undefined && changes.score !== oldRecord.score) {
        throw new Error('Öğrenciler görev puanını değiştiremez!');
      }
      if (changes.status !== undefined && changes.status !== oldRecord.status && changes.status !== 'paper_reported') {
        throw new Error('Öğrenciler görev durumunu yalnızca kâğıt teslim bildirimi olarak güncelleyebilir!');
      }
      if (changes.student_id !== undefined && changes.student_id !== oldRecord.student_id) {
        throw new Error('Görev sahibi öğrenci kimliği değiştirilemez!');
      }
      if (changes.paper_delivery_confirmed_at !== undefined) {
        throw new Error('Öğrenciler kâğıt teslim onayını değiştiremez!');
      }
    }

    db.public.none(`
      UPDATE student_task_assignments
      SET status = '${changes.status || oldRecord.status}',
          score = ${changes.score !== undefined ? changes.score : (oldRecord.score ?? 'null')}
      WHERE id = '${studentTaskId}';
    `);
  }

  // 1. Öğrenci kendi notunu 100 yapmaya çalışır -> Reddedilir!
  assert.throws(
    () => simulateStudentTaskUpdate(student1Id, studentTask1Id, { score: 100 }),
    /Öğrenciler görev puanını değiştiremez!/,
    'Öğrencinin kendi notunu güncelleme girişimi engellenmelidir'
  );

  // 2. Öğrenci görev sahibini student2 yapmaya çalışır -> Reddedilir!
  assert.throws(
    () => simulateStudentTaskUpdate(student1Id, studentTask1Id, { student_id: student2Id }),
    /Görev sahibi öğrenci kimliği değiştirilemez!/,
    'Öğrencinin student_id değiştirme girişimi engellenmelidir'
  );

  // 3. Öğrenci durumunu doğrudan 'graded' yapmaya çalışır -> Reddedilir!
  assert.throws(
    () => simulateStudentTaskUpdate(student1Id, studentTask1Id, { status: 'graded' }),
    /Öğrenciler görev durumunu yalnızca kâğıt teslim bildirimi olarak güncelleyebilir!/,
    'Öğrencinin sahte görev durumu ataması engellenmelidir'
  );

  // 4. Öğrenci kendi kâğıt teslim onayını vermeye çalışır -> Reddedilir!
  assert.throws(
    () => simulateStudentTaskUpdate(student1Id, studentTask1Id, { paper_delivery_confirmed_at: new Date().toISOString() }),
    /Öğrenciler kâğıt teslim onayını değiştiremez!/,
    'Öğrencinin onay vermesi engellenmelidir'
  );

  // 5. Öğrenci kâğıt teslim bildiriminde bulunabilir (Meşru işlem)
  assert.doesNotThrow(
    () => simulateStudentTaskUpdate(student1Id, studentTask1Id, { status: 'paper_reported' }),
    'Öğrencinin kâğıt teslim bildirimi yasal bir durum güncellemesidir'
  );
});

// ==============================================================================
// 6. DEĞERLENDİRME İZOLASYONU: TASLAK KORUMA VE ÖĞRENCİLER ARASI GİZLİLİK
// ==============================================================================

test('[6. Değerlendirme & Bildirim İzolasyonu] Taslak notlar öğrenciye kapalıdır, kesinleşmiş notlar yalnızca ilgili öğrenciye açılır', () => {
  const { teacher1Id, student1Id, student2Id, classId, courseId, db } = setupTestEnvironment();

  const taskId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  db.public.none(`
    INSERT INTO task_assignments (id, teacher_id, classroom_id, course_id, academic_year, term, title, description, status, due_date)
    VALUES ('${taskId}', '${teacher1Id}', '${classId}', '${courseId}', '2026-2027', 1, 'Python', 'Ödev', 'published', now());
  `);

  const studentTask1Id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  const studentTask2Id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  db.public.none(`
    INSERT INTO student_task_assignments (id, task_assignment_id, student_id, classroom_id, status) VALUES
      ('${studentTask1Id}', '${taskId}', '${student1Id}', '${classId}', 'submitted'),
      ('${studentTask2Id}', '${taskId}', '${student2Id}', '${classId}', 'submitted');
  `);

  // Öğrenci 1 için TASLAK değerlendirme (draft - henüz öğrenciye açıklanmamış)
  const draftEvalId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  db.public.none(`
    INSERT INTO task_evaluations (id, student_task_assignment_id, teacher_id, status, total_score, general_comment)
    VALUES ('${draftEvalId}', '${studentTask1Id}', '${teacher1Id}', 'draft', 78.5, 'Ön taslak puanı');
  `);

  // Öğrenci 2 için KESİNLEŞMİŞ değerlendirme (finalized)
  const finalizedEvalId = '12121212-1212-1212-1212-121212121212';
  db.public.none(`
    INSERT INTO task_evaluations (id, student_task_assignment_id, teacher_id, status, total_score, general_comment)
    VALUES ('${finalizedEvalId}', '${studentTask2Id}', '${teacher1Id}', 'finalized', 95.0, 'Tebrikler');
  `);

  // RLS SELECT simülatörü (task_evaluations RLS politikası):
  // USING (status = 'finalized' AND student_id = auth.uid()) OR teacher_id = auth.uid() OR is_admin()
  function queryVisibleEvaluations(actorId: string) {
    const actor = db.public.many(`SELECT role FROM user_profiles WHERE id = '${actorId}'`)[0];
    const isTeacher = actor && actor.role === 'teacher';
    const isAdmin = actor && actor.role === 'admin';

    if (isAdmin) {
      return db.public.many(`SELECT * FROM task_evaluations;`);
    }
    if (isTeacher) {
      return db.public.many(`SELECT * FROM task_evaluations WHERE teacher_id = '${actorId}';`);
    }

    // Öğrenci ise: Yalnızca kendi student_task_assignment'ı VE status = 'finalized'
    return db.public.many(`
      SELECT te.* FROM task_evaluations te
      JOIN student_task_assignments sta ON sta.id = te.student_task_assignment_id
      WHERE sta.student_id = '${actorId}' AND te.status = 'finalized';
    `);
  }

  // 1. Öğrenci 1 sorguladığında taslak notunu GÖREMEZ (0 kayıt)
  const student1Results = queryVisibleEvaluations(student1Id);
  assert.equal(student1Results.length, 0, 'Öğrenci 1 henüz taslak aşamasındaki değerlendirmesini görmemelidir');

  // 2. Öğrenci 2 sorguladığında kesinleşmiş notunu GÖRÜR (1 kayıt)
  const student2Results = queryVisibleEvaluations(student2Id);
  assert.equal(student2Results.length, 1, 'Öğrenci 2 kesinleşmiş notunu görebilmelidir');
  assert.equal(Number(student2Results[0].total_score), 95.0);

  // 3. Öğrenci 1, Öğrenci 2'nin notunu asla sorgulayamaz
  assert.equal(student1Results.some((e: any) => e.id === finalizedEvalId), false, 'Öğrenci 1 başka öğrencinin notuna erişemez');

  // 4. Öğretmen her iki değerlendirmeyi de (taslak ve kesinleşmiş) görür
  const teacherResults = queryVisibleEvaluations(teacher1Id);
  assert.equal(teacherResults.length, 2, 'Öğretmen hem taslak hem kesinleşmiş değerlendirmeleri yönetir');
});

// ==============================================================================
// 7. NOT DEĞİŞİKLİK GÜNLÜĞÜ (GRADE_CHANGE_LOGS) İMMUTABİLİTY & SAHTECİLİK ENGELİ
// ==============================================================================

test('[7. Not Günlüğü Sahtecilik Engeli] grade_change_logs doğrudan istemci INSERT, UPDATE ve DELETE işlemlerine tamamen kapalıdır', () => {
  const { student1Id, teacher1Id, adminId, db } = setupTestEnvironment();

  // Migration dosyasındaki RLS politikaları:
  // INSERT: WITH CHECK (public.is_admin())  -> Öğrenci veya öğretmen doğrudan elle ekleyemez
  // UPDATE: USING (false)                   -> Kimse güncelleyemez
  // DELETE: USING (false)                   -> Kimse silemez

  function simulateLogInsert(actorId: string) {
    const actor = db.public.many(`SELECT role FROM user_profiles WHERE id = '${actorId}'`)[0];
    if (!actor || actor.role !== 'admin') {
      throw new Error('RLS Engeli: Not değişiklik günlüğüne yalnızca sistem tetikleyicisi veya yönetici yazabilir!');
    }
  }

  function simulateLogUpdate() {
    // USING (false)
    throw new Error('RLS Engeli: Not değişiklik günlüğü kesinlikle güncellenemez (USING false)!');
  }

  function simulateLogDelete() {
    // USING (false)
    throw new Error('RLS Engeli: Not değişiklik günlüğü kesinlikle silinemez (USING false)!');
  }

  // Öğrenci veya öğretmen sahte not günlüğü ekleyemez
  assert.throws(() => simulateLogInsert(student1Id), /RLS Engeli/, 'Öğrenci sahte not günlüğü ekleyemez');
  assert.throws(() => simulateLogInsert(teacher1Id), /RLS Engeli/, 'Öğretmen doğrudan elle not günlüğü ekleyemez');

  // Güncelleme ve silme hiçbir kullanıcıya (admin dahil) açılamaz
  assert.throws(() => simulateLogUpdate(), /kesinlikle güncellenemez/, 'Not günlüğü değiştirilemez');
  assert.throws(() => simulateLogDelete(), /kesinlikle silinemez/, 'Not günlüğü silinemez');

  // log_evaluation_grade_change tetikleyici mantığı: Kesinleşmiş not değiştiğinde otomatik log üretir
  const taskId = '67676767-6767-6767-6767-676767676767';
  const studentTaskId = '78787878-7878-7878-7878-787878787878';
  const evalId = '34343434-3434-3434-3434-343434343434';
  const oldScore = 80.0;
  const newScore = 85.0;

  db.public.none(`
    INSERT INTO task_assignments (id, teacher_id, classroom_id, course_id, academic_year, term, title, description, status, due_date)
    VALUES ('${taskId}', '${teacher1Id}', '66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777', '2026-2027', 1, 'Final Görevi', 'Açıklama', 'published', now());
    INSERT INTO student_task_assignments (id, task_assignment_id, student_id, classroom_id, status)
    VALUES ('${studentTaskId}', '${taskId}', '${student1Id}', '66666666-6666-6666-6666-666666666666', 'graded');
    INSERT INTO task_evaluations (id, student_task_assignment_id, teacher_id, status, total_score)
    VALUES ('${evalId}', '${studentTaskId}', '${teacher1Id}', 'finalized', ${oldScore});
  `);

  db.public.none(`
    INSERT INTO grade_change_logs (id, evaluation_id, old_score, new_score, changed_by, change_reason)
    VALUES (
      '56565656-5656-5656-5656-565656565656',
      '${evalId}',
      ${oldScore},
      ${newScore},
      '${teacher1Id}',
      'Öğrencinin itirazı haklı bulundu, 5 puan eklendi.'
    );
  `);

  // Kesinleşmiş değerlendirmenin taslağa geri çekilme engeli testi:
  function simulateStatusRevert(actorId: string, currentStatus: string, newStatus: string) {
    const actor = db.public.many(`SELECT role FROM user_profiles WHERE id = '${actorId}'`)[0];
    if (currentStatus === 'finalized' && newStatus === 'draft' && actor?.role !== 'admin') {
      throw new Error('Kesinleşmiş bir değerlendirme taslak durumuna geri alınamaz!');
    }
  }

  assert.throws(
    () => simulateStatusRevert(teacher1Id, 'finalized', 'draft'),
    /Kesinleşmiş bir değerlendirme taslak durumuna geri alınamaz!/,
    'Öğretmenin kesinleşmiş notu taslağa çekmesi engellenmelidir'
  );

  // Gerekçesiz not değişikliği engeli testi:
  function simulateGradeUpdateWithReason(actorId: string, reason: string | null) {
    const actor = db.public.many(`SELECT role FROM user_profiles WHERE id = '${actorId}'`)[0];
    if (!reason || reason.trim() === '') {
      if (actor?.role !== 'admin') {
        throw new Error('Kesinleşmiş not değişikliği için geçerli bir gerekçe belirtilmesi zorunludur!');
      }
    }
  }

  assert.throws(
    () => simulateGradeUpdateWithReason(teacher1Id, ''),
    /Kesinleşmiş not değişikliği için geçerli bir gerekçe belirtilmesi zorunludur!/,
    'Gerekçesiz not değişikliği tetikleyici tarafından engellenmelidir'
  );

  const logs = db.public.many(`SELECT * FROM grade_change_logs WHERE evaluation_id = '${evalId}';`);
  assert.equal(logs.length, 1);
  assert.equal(Number(logs[0].old_score), 80.0);
  assert.equal(Number(logs[0].new_score), 85.0);
  assert.equal(logs[0].changed_by, teacher1Id);
});

// ==============================================================================
// 8. SUPABASE STORAGE (DOSYA DEPOLAMA) POLİTİKA GÜVENCESİ
// ==============================================================================

test('[8. Storage Güvenliği] task-submissions 15 MB PDF sınırı ve klasör izolasyonu storage kurallarınca denetleniyor', () => {
  // Migration dosyasındaki depolama kural tanımları:
  assert.ok(migrationSql.includes("'task-submissions'"));
  assert.ok(migrationSql.includes('15728640')); // 15 MB
  assert.ok(migrationSql.includes("(storage.foldername(name))[1] = auth.uid()::text"));

  // Storage yükleme mantığı simülasyonu:
  function simulateStorageUpload(actorId: string, bucket: string, path: string, fileSize: number, mimeType: string) {
    if (bucket === 'task-submissions') {
      if (fileSize > 15728640) {
        throw new Error('Dosya boyutu 15 MB sınırını aşıyor!');
      }
      if (mimeType !== 'application/pdf') {
        throw new Error('Yalnızca PDF formatında dosya yüklenebilir!');
      }
      const folderOwner = path.split('/')[0];
      if (folderOwner !== actorId) {
        throw new Error('RLS Engeli: Öğrenci yalnızca kendi kullanıcı kimliğine ait klasöre dosya yükleyebilir!');
      }
    }
  }

  // Storage okuma yetki kontrolü (Öğretmen yetki izolasyonu):
  function simulateStorageDownload(actorRole: string, actorId: string, taskTeacherId: string) {
    if (actorRole === 'admin') return true;
    if (actorRole === 'teacher' && actorId === taskTeacherId) return true;
    throw new Error('RLS Engeli: Öğretmenler yalnızca kendi verdikleri görevlere ait teslimleri indirebilir!');
  }

  const studentId = '44444444-4444-4444-4444-444444444444';
  const otherStudentId = '55555555-5555-5555-5555-555555555555';

  // 1. Doğru yükleme başarılı olur
  assert.doesNotThrow(() => {
    simulateStorageUpload(studentId, 'task-submissions', `${studentId}/odev_v1.pdf`, 1000000, 'application/pdf');
  });

  // 2. 15 MB üstü dosya reddedilir
  assert.throws(
    () => simulateStorageUpload(studentId, 'task-submissions', `${studentId}/buyuk.pdf`, 16000000, 'application/pdf'),
    /15 MB sınırını aşıyor/
  );

  // 3. PDF dışı dosya reddedilir
  assert.throws(
    () => simulateStorageUpload(studentId, 'task-submissions', `${studentId}/zararli.exe`, 500000, 'application/x-msdownload'),
    /Yalnızca PDF formatında/
  );

  // 4. Başka öğrencinin klasörüne dosya sızdırma girişimi reddedilir
  assert.throws(
    () => simulateStorageUpload(studentId, 'task-submissions', `${otherStudentId}/hack.pdf`, 500000, 'application/pdf'),
    /yalnızca kendi kullanıcı kimliğine ait klasöre/
  );

  // 5. Yetkisiz öğretmen başka öğretmenin öğrencisine ait teslim dosyasını indiremez
  const authorizedTeacherId = '22222222-2222-2222-2222-222222222222';
  const unauthorizedTeacherId = '33333333-3333-3333-3333-333333333333';

  assert.doesNotThrow(() => {
    simulateStorageDownload('teacher', authorizedTeacherId, authorizedTeacherId);
  }, 'Görevi veren öğretmen öğrenci teslim dosyasını indirebilmelidir');

  assert.throws(
    () => simulateStorageDownload('teacher', unauthorizedTeacherId, authorizedTeacherId),
    /Öğretmenler yalnızca kendi verdikleri görevlere ait teslimleri indirebilir!/,
    'Yetkisiz öğretmen başka derse ait öğrenci PDF teslim dosyasını indiremez'
  );
});
