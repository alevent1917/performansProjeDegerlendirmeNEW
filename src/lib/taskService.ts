/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Görev & Teslim Veri Kalıcılığı ve Supabase / Offline Fallback Servisi
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { TeacherAssignmentItem, TeacherStudentSubmission } from '../components/TeacherDashboard';
import { validateStudentPdfFile, calculateTotalScore } from '../utils/validation';

const STORAGE_KEYS = {
  ASSIGNMENTS: 'perf_tasks_assignments_v2',
  SUBMISSIONS: 'perf_tasks_submissions_v2',
};

/**
 * Standart RFC 4122 Demo ve Test UUID Sabitleri:
 * Canlı PostgreSQL UUID tipleri ve RLS politikaları ile %100 uyumludur.
 */
export const DEMO_UUIDS = {
  TEACHER: '550e8400-e29b-41d4-a716-446655440000',
  ADMIN: '660e8400-e29b-41d4-a716-446655440000',
  STUDENT_1: '11111111-1111-4111-8111-111111111111', // Ali Demir - 1042
  STUDENT_2: '22222222-2222-4222-8222-222222222222', // Ayşe Yılmaz - 1043
  STUDENT_3: '33333333-3333-4333-8333-333333333333', // Can Öztürk - 1044
  STUDENT_4: '44444444-4444-4444-8444-444444444444', // Zeynep Kaya - 1045
  CLASSROOM_10B: 'c1000000-0000-4000-8000-000000000001',
  CLASSROOM_11B: 'c2000000-0000-4000-8000-000000000002',
  COURSE_PRG101: 'd1000000-0000-4000-8000-000000000001',
  COURSE_NET201: 'd2000000-0000-4000-8000-000000000002',
  ASSIGNMENT_1: 'a1000000-0000-4000-8000-000000000001',
  ASSIGNMENT_2: 'a2000000-0000-4000-8000-000000000002',
  ASSIGNMENT_3: 'a3000000-0000-4000-8000-000000000003',
};

// Başlangıç Tohum Verileri (İlk yükleme veya sıfırlama durumunda)
export const INITIAL_SEED_ASSIGNMENTS: TeacherAssignmentItem[] = [
  {
    id: DEMO_UUIDS.ASSIGNMENT_1,
    classroomId: DEMO_UUIDS.CLASSROOM_10B,
    classroomName: '10/B',
    courseId: DEMO_UUIDS.COURSE_PRG101,
    courseCode: 'PRG101',
    courseName: 'Programlama Temelleri',
    title: 'Döngüler, Diziler ve Fonksiyonlar Uygulaması',
    description:
      'C# veya Python dilinde döngüler, çok boyutlu diziler ve modüler fonksiyon yapıları kullanılarak bir öğrenci bilgi yönetim konsol uygulaması geliştirilecek ve teknik rapor PDF olarak teslim edilecektir.',
    deliveryFormat: 'digital_pdf',
    dueDate: '2026-11-15T23:59:00Z',
    status: 'published',
    studentCount: 34,
    submittedCount: 22,
    gradedCount: 12,
    paperPendingCount: 0,
    criteria: [
      { id: 'e1000000-0000-4000-8000-000000000001', name: 'Algoritmik Doğruluk ve Mantıksal Akış', maxPoints: 30 },
      { id: 'e1000000-0000-4000-8000-000000000002', name: 'Kodlama Standartları ve Yorum Satırları', maxPoints: 20 },
      { id: 'e1000000-0000-4000-8000-000000000003', name: 'Hata Yakalama ve Uç Durum Kontrolleri', maxPoints: 25 },
      { id: 'e1000000-0000-4000-8000-000000000004', name: 'Teknik Rapor Formatı ve Şablon Uyumu', maxPoints: 25 },
    ],
  },
  {
    id: DEMO_UUIDS.ASSIGNMENT_2,
    classroomId: DEMO_UUIDS.CLASSROOM_10B,
    classroomName: '10/B',
    courseId: DEMO_UUIDS.COURSE_NET201,
    courseCode: 'NET201',
    courseName: 'Ağ Sistemleri ve Anahtarlama',
    title: 'VLAN ve Alt Ağ Segmentasyonu Tasarım Raporu',
    description:
      'Cisco Packet Tracer üzerinde 3 katlı bir okul binası için VLAN 10, 20 ve 30 yapılandırması simüle edilerek tasarım şeması ve test çıktıları raporda sunulacaktır.',
    deliveryFormat: 'digital_pdf',
    dueDate: '2026-10-20T23:59:00Z',
    status: 'published',
    studentCount: 34,
    submittedCount: 1,
    gradedCount: 1,
    paperPendingCount: 0,
    criteria: [
      { id: 'e2000000-0000-4000-8000-000000000021', name: 'Topoloji ve Adresleme Planı', maxPoints: 25 },
      { id: 'e2000000-0000-4000-8000-000000000022', name: 'VLAN ve Trunk Yapılandırması', maxPoints: 35 },
      { id: 'e2000000-0000-4000-8000-000000000023', name: 'DHCP ve Yönlendirme Testleri', maxPoints: 20 },
      { id: 'e2000000-0000-4000-8000-000000000024', name: 'Rapor Düzeni ve Görseller', maxPoints: 20 },
    ],
  },
  {
    id: DEMO_UUIDS.ASSIGNMENT_3,
    classroomId: DEMO_UUIDS.CLASSROOM_10B,
    classroomName: '10/B',
    courseId: DEMO_UUIDS.COURSE_NET201,
    courseCode: 'NET201',
    courseName: 'Ağ Sistemleri ve Anahtarlama',
    title: 'Ağ Kablolama ve Patch Panel Montaj Pratiği',
    description:
      'Atölyede gerçekleştirilen T568B standartlarında UTP Cat6 kablo sonlandırma ve test formu çıktısı alınıp elden öğretmene teslim edilecektir.',
    deliveryFormat: 'paper',
    dueDate: '2026-11-25T17:00:00Z',
    status: 'published',
    studentCount: 34,
    submittedCount: 0,
    gradedCount: 0,
    paperPendingCount: 1,
    criteria: [
      { id: 'e3000000-0000-4000-8000-000000000031', name: 'Standart T568B Renk Sıralaması', maxPoints: 40 },
      { id: 'e3000000-0000-4000-8000-000000000032', name: 'Kablo Soyma ve Soketleme Kalitesi', maxPoints: 30 },
      { id: 'e3000000-0000-4000-8000-000000000033', name: 'Kablo Test Cihazı Doğrulaması', maxPoints: 30 },
    ],
  },
];

export const INITIAL_SEED_SUBMISSIONS: Record<string, TeacherStudentSubmission[]> = {
  [DEMO_UUIDS.ASSIGNMENT_1]: [
    {
      id: 'b1000000-0000-4000-8000-000000000001',
      studentId: DEMO_UUIDS.STUDENT_1,
      studentName: 'Ali Demir',
      schoolNumber: '1042',
      status: 'submitted',
      submissionCount: 1,
      lastSubmittedAt: '2026-10-27T16:40:00Z',
      pdfFileName: '1042_Ali_Demir_Donguler_v1.pdf',
      fileSizeBytes: 2450000,
      criteriaScores: {},
    },
    {
      id: 'b1000000-0000-4000-8000-000000000002',
      studentId: DEMO_UUIDS.STUDENT_2,
      studentName: 'Ayşe Yılmaz',
      schoolNumber: '1043',
      status: 'graded',
      submissionCount: 2,
      lastSubmittedAt: '2026-10-26T14:10:00Z',
      score: 95.0,
      evaluationStatus: 'finalized',
      evaluationComment: 'Harika kod organizasyonu ve kapsamlı hata yakalama.',
      criteriaScores: {
        'e1000000-0000-4000-8000-000000000001': 30.0,
        'e1000000-0000-4000-8000-000000000002': 19.0,
        'e1000000-0000-4000-8000-000000000003': 24.0,
        'e1000000-0000-4000-8000-000000000004': 22.0,
      },
      pdfFileName: '1043_Ayse_Yilmaz_v2.pdf',
      fileSizeBytes: 2900000,
    },
    {
      id: 'b1000000-0000-4000-8000-000000000003',
      studentId: DEMO_UUIDS.STUDENT_3,
      studentName: 'Can Öztürk',
      schoolNumber: '1044',
      status: 'paper_reported',
      submissionCount: 0,
      paperReportedAt: '2026-10-28T09:15:00Z',
      criteriaScores: {},
    },
    {
      id: 'b1000000-0000-4000-8000-000000000004',
      studentId: DEMO_UUIDS.STUDENT_4,
      studentName: 'Zeynep Kaya',
      schoolNumber: '1045',
      status: 'not_submitted',
      submissionCount: 0,
      criteriaScores: {},
    },
  ],
  [DEMO_UUIDS.ASSIGNMENT_2]: [
    {
      id: 'b2000000-0000-4000-8000-000000000001',
      studentId: DEMO_UUIDS.STUDENT_1,
      studentName: 'Ali Demir',
      schoolNumber: '1042',
      status: 'graded',
      submissionCount: 1,
      lastSubmittedAt: '2026-10-19T21:10:00Z',
      pdfFileName: '1042_Ali_Demir_VLAN_v1.pdf',
      fileSizeBytes: 3100000,
      score: 93.5,
      evaluationStatus: 'finalized',
      evaluationComment: 'Tasarım şeması ve yönlendirme tabloları çok başarılı hazırlanmış. Tebrikler Ali.',
      criteriaScores: {
        'e2000000-0000-4000-8000-000000000021': 25.0,
        'e2000000-0000-4000-8000-000000000022': 33.5,
        'e2000000-0000-4000-8000-000000000023': 18.0,
        'e2000000-0000-4000-8000-000000000024': 17.0,
      },
    },
    {
      id: 'b2000000-0000-4000-8000-000000000002',
      studentId: DEMO_UUIDS.STUDENT_2,
      studentName: 'Ayşe Yılmaz',
      schoolNumber: '1043',
      status: 'graded',
      submissionCount: 1,
      lastSubmittedAt: '2026-10-19T18:00:00Z',
      pdfFileName: '1043_Ayse_Yilmaz_VLAN_v1.pdf',
      fileSizeBytes: 2750000,
      score: 91.0,
      evaluationStatus: 'finalized',
      evaluationComment: 'Başarılı rapor.',
      criteriaScores: {
        'e2000000-0000-4000-8000-000000000021': 24.0,
        'e2000000-0000-4000-8000-000000000022': 32.0,
        'e2000000-0000-4000-8000-000000000023': 18.0,
        'e2000000-0000-4000-8000-000000000024': 17.0,
      },
    },
    {
      id: 'b2000000-0000-4000-8000-000000000003',
      studentId: DEMO_UUIDS.STUDENT_3,
      studentName: 'Can Öztürk',
      schoolNumber: '1044',
      status: 'not_submitted',
      submissionCount: 0,
      criteriaScores: {},
    },
    {
      id: 'b2000000-0000-4000-8000-000000000004',
      studentId: DEMO_UUIDS.STUDENT_4,
      studentName: 'Zeynep Kaya',
      schoolNumber: '1045',
      status: 'not_submitted',
      submissionCount: 0,
      criteriaScores: {},
    },
  ],
  [DEMO_UUIDS.ASSIGNMENT_3]: [
    {
      id: 'b3000000-0000-4000-8000-000000000001',
      studentId: DEMO_UUIDS.STUDENT_1,
      studentName: 'Ali Demir',
      schoolNumber: '1042',
      status: 'not_submitted',
      submissionCount: 0,
      criteriaScores: {},
    },
    {
      id: 'b3000000-0000-4000-8000-000000000002',
      studentId: DEMO_UUIDS.STUDENT_2,
      studentName: 'Ayşe Yılmaz',
      schoolNumber: '1043',
      status: 'not_submitted',
      submissionCount: 0,
      criteriaScores: {},
    },
    {
      id: 'b3000000-0000-4000-8000-000000000003',
      studentId: DEMO_UUIDS.STUDENT_3,
      studentName: 'Can Öztürk',
      schoolNumber: '1044',
      status: 'paper_reported',
      submissionCount: 0,
      paperReportedAt: '2026-10-28T09:15:00Z',
      criteriaScores: {},
    },
    {
      id: 'b3000000-0000-4000-8000-000000000004',
      studentId: DEMO_UUIDS.STUDENT_4,
      studentName: 'Zeynep Kaya',
      schoolNumber: '1045',
      status: 'not_submitted',
      submissionCount: 0,
      criteriaScores: {},
    },
  ],
};

// Bellek içi saklama alanı (Node testleri ve fallback için)
const memoryStorage: Record<string, string> = {};

/**
 * Tarayıcı Storage Yardımcıları (Demo/Offline Mod Kalıcılığı & Bellek Desteği)
 */
function readFromStorage<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw);
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      const raw = (globalThis as any).localStorage.getItem(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw);
    }
    const mem = memoryStorage[key];
    if (mem) return JSON.parse(mem);
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

function writeToStorage<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    memoryStorage[key] = serialized;

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, serialized);
      window.dispatchEvent(
        new CustomEvent('perf_tasks_storage_sync', {
          detail: { key, value },
        })
      );
    } else if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      (globalThis as any).localStorage.setItem(key, serialized);
    }
  } catch {
    // Storage kotası veya erişim engeli
  }
}

/**
 * Test ve geliştirme ortamı için yerel belleği sıfırlama yardımcısı
 */
export function resetTaskStorage(): void {
  delete memoryStorage[STORAGE_KEYS.ASSIGNMENTS];
  delete memoryStorage[STORAGE_KEYS.SUBMISSIONS];
  isLiveDatabaseAvailable = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEYS.ASSIGNMENTS);
      window.localStorage.removeItem(STORAGE_KEYS.SUBMISSIONS);
    }
  } catch {
    // ignore
  }
}

// Açık mod seçimi: 'auto' (çevreye göre), 'demo' (yerel fallback zorunlu), 'live' (Supabase zorunlu)
let currentTaskServiceMode: 'auto' | 'demo' | 'live' = 'auto';
let isLiveDatabaseAvailable: boolean | null = null;

export function setTaskServiceMode(mode: 'auto' | 'demo' | 'live'): void {
  currentTaskServiceMode = mode;
  if (mode === 'demo') {
    isLiveDatabaseAvailable = false;
  } else if (mode === 'live') {
    isLiveDatabaseAvailable = true;
  } else {
    isLiveDatabaseAvailable = null;
  }
}

export function isTaskServiceInDemoMode(): boolean {
  if (currentTaskServiceMode === 'demo') return true;
  if (currentTaskServiceMode === 'live') return false;
  return !isSupabaseConfigured || isLiveDatabaseAvailable === false;
}

function shouldUseSupabase(): boolean {
  if (currentTaskServiceMode === 'demo') return false;
  if (currentTaskServiceMode === 'live') return true;
  if (isLiveDatabaseAvailable === false) return false;
  return Boolean(isSupabaseConfigured && supabase);
}

/**
 * 1. Tüm Görev ve Teslim Verilerini Yükle
 */
export async function loadAssignmentsAndSubmissions(): Promise<{
  assignments: TeacherAssignmentItem[];
  submissionsByAssignment: Record<string, TeacherStudentSubmission[]>;
  isOfflineFallback: boolean;
}> {
  // Canlı Supabase modu aktifse doğrudan veritabanından oku
  if (shouldUseSupabase() && supabase) {
    const { data: assignmentsData, error: asgErr } = await supabase
      .from('task_assignments')
      .select(`
        id,
        classroom_id,
        course_id,
        academic_year,
        title,
        description,
        delivery_format,
        due_date,
        status,
        classrooms (name),
        courses (name, code),
        rubric_criteria (id, name, max_points, description)
      `)
      .order('created_at', { ascending: false });

    if (asgErr) {
      if (currentTaskServiceMode === 'live') {
        throw new Error(`Görevler veritabanından alınamadı: ${asgErr.message}`);
      }

      // Auto modda tablolar henüz Supabase üzerinde oluşturulmamışsa (unmigrated database)
      // veya PostgREST şema önbelleğinde yoksa güvenli yerel fallback moduna geç
      isLiveDatabaseAvailable = false;
      console.warn(
        `Supabase tabloları henüz oluşturulmamış veya erişilemiyor (${asgErr.message}). Çevrimdışı/Demo kalıcılık moduna geçildi.`
      );
    } else if (assignmentsData !== null && assignmentsData !== undefined) {
      isLiveDatabaseAvailable = true;

      const { data: subsData, error: subsErr } = await supabase
        .from('student_task_assignments')
        .select(`
          id,
          task_assignment_id,
          student_id,
          status,
          submission_count,
          score,
          paper_delivery_reported_at,
          paper_delivery_confirmed_at,
          user_profiles (full_name, school_number),
          submission_versions (file_name, file_size_bytes, submitted_at),
          task_evaluations (id, status, general_comment, evaluation_criterion_scores (rubric_criterion_id, score))
        `);

      if (subsErr) {
        if (currentTaskServiceMode === 'live') {
          throw new Error(`Öğrenci teslim verileri veritabanından alınamadı: ${subsErr.message}`);
        }
        isLiveDatabaseAvailable = false;
        console.warn(
          `Öğrenci teslim tablosu henüz hazır değil (${subsErr.message}). Çevrimdışı/Demo kalıcılık moduna geçildi.`
        );
      } else {
        const mappedAssignments: TeacherAssignmentItem[] = assignmentsData.map((row: any) => ({
          id: row.id,
          classroomId: row.classroom_id,
          classroomName: row.classrooms?.name || '10/B',
          courseId: row.course_id,
          courseName: row.courses?.name || 'Ders',
          courseCode: row.courses?.code || 'CRS',
          title: row.title,
          description: row.description,
          deliveryFormat: row.delivery_format,
          dueDate: row.due_date,
          status: row.status,
          studentCount: 34,
          submittedCount: 0,
          gradedCount: 0,
          paperPendingCount: 0,
          criteria: (row.rubric_criteria || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            maxPoints: Number(c.max_points),
            description: c.description,
          })),
        }));

        const mappedSubs: Record<string, TeacherStudentSubmission[]> = {};
        mappedAssignments.forEach((asg) => {
          mappedSubs[asg.id] = [];
        });

        (subsData || []).forEach((row: any) => {
          const asgId = row.task_assignment_id;
          if (!mappedSubs[asgId]) mappedSubs[asgId] = [];

          const lastVersion = row.submission_versions?.[row.submission_versions.length - 1];
          const evaluation = row.task_evaluations?.[0];
          const criteriaScores: Record<string, number> = {};
          if (evaluation?.evaluation_criterion_scores) {
            evaluation.evaluation_criterion_scores.forEach((es: any) => {
              if (es.rubric_criterion_id) {
                criteriaScores[es.rubric_criterion_id] = Number(es.score);
              }
            });
          }

          mappedSubs[asgId].push({
            id: row.id,
            studentId: row.student_id,
            studentName: row.user_profiles?.full_name || 'Öğrenci',
            schoolNumber: row.user_profiles?.school_number || '0000',
            status: row.status,
            submissionCount: row.submission_count || 0,
            lastSubmittedAt: lastVersion?.submitted_at,
            paperReportedAt: row.paper_delivery_reported_at,
            paperConfirmedAt: row.paper_delivery_confirmed_at,
            score: row.score !== null && row.score !== undefined ? Number(row.score) : undefined,
            evaluationStatus: evaluation?.status,
            evaluationComment: evaluation?.general_comment,
            criteriaScores,
            pdfFileName: lastVersion?.file_name,
            fileSizeBytes: lastVersion?.file_size_bytes,
          });
        });

        return {
          assignments: mappedAssignments,
          submissionsByAssignment: mappedSubs,
          isOfflineFallback: false,
        };
      }
    }
  }

  // Yalnızca açık demo/offline modunda localStorage fallback kullanılır
  const cachedAssignments = readFromStorage<TeacherAssignmentItem[]>(
    STORAGE_KEYS.ASSIGNMENTS,
    INITIAL_SEED_ASSIGNMENTS
  );
  const cachedSubmissions = readFromStorage<Record<string, TeacherStudentSubmission[]>>(
    STORAGE_KEYS.SUBMISSIONS,
    INITIAL_SEED_SUBMISSIONS
  );

  return {
    assignments: cachedAssignments,
    submissionsByAssignment: cachedSubmissions,
    isOfflineFallback: true,
  };
}

/**
 * 2. Yeni Görev Kaydet
 */
export async function saveCreatedAssignment(
  newTask: TeacherAssignmentItem,
  initialStudents: TeacherStudentSubmission[],
  teacherId?: string
): Promise<{ assignmentId: string }> {
  if (shouldUseSupabase() && supabase) {
    const authUser = (await supabase.auth.getUser()).data.user;
    const resolvedTeacherId = teacherId || authUser?.id;
    if (!resolvedTeacherId) {
      throw new Error('Görev oluşturmak için geçerli ve yetkilendirilmiş bir öğretmen oturumu gereklidir.');
    }

    const assignmentUuid =
      newTask.id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newTask.id)
        ? newTask.id
        : typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : newTask.id;

    const { error: asgErr } = await supabase.from('task_assignments').insert({
      id: assignmentUuid,
      teacher_id: resolvedTeacherId,
      classroom_id: newTask.classroomId,
      course_id: newTask.courseId,
      academic_year: '2026-2027',
      term: 1,
      title: newTask.title,
      description: newTask.description,
      delivery_format: newTask.deliveryFormat,
      due_date: newTask.dueDate,
      status: 'published',
      published_at: new Date().toISOString(),
    });

    if (asgErr) {
      throw new Error(`Görev veritabanına kaydedilemedi: ${asgErr.message}`);
    }

    if (newTask.criteria.length > 0) {
      const criteriaRows = newTask.criteria.map((c, idx) => ({
        id:
          c.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id)
            ? c.id
            : typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : undefined,
        task_assignment_id: assignmentUuid,
        name: c.name,
        description: c.description || null,
        max_points: c.maxPoints,
        sort_order: idx + 1,
      }));

      const { error: critErr } = await supabase.from('rubric_criteria').insert(criteriaRows);
      if (critErr) {
        throw new Error(`Rubrik ölçütleri kaydedilemedi: ${critErr.message}`);
      }
    }

    return { assignmentId: assignmentUuid };
  }

  // Demo Fallback: localStorage
  const currentAsgs = readFromStorage<TeacherAssignmentItem[]>(
    STORAGE_KEYS.ASSIGNMENTS,
    INITIAL_SEED_ASSIGNMENTS
  );
  const currentSubs = readFromStorage<Record<string, TeacherStudentSubmission[]>>(
    STORAGE_KEYS.SUBMISSIONS,
    INITIAL_SEED_SUBMISSIONS
  );

  writeToStorage(STORAGE_KEYS.ASSIGNMENTS, [newTask, ...currentAsgs]);
  writeToStorage(STORAGE_KEYS.SUBMISSIONS, {
    ...currentSubs,
    [newTask.id]: initialStudents,
  });

  return { assignmentId: newTask.id };
}

/**
 * 3. Öğrenci PDF Teslimini Kaydet (15 MB Sınırı)
 */
export async function saveStudentPdfSubmission(
  taskId: string,
  schoolNumber: string,
  file: { name: string; size: number; type: string },
  studentId?: string
): Promise<{ nextVersion: number; fileName: string }> {
  // 15 MB doğrulaması
  const validation = validateStudentPdfFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Dosya 15 MB sınırını aşıyor.');
  }

  if (shouldUseSupabase() && supabase) {
    const authUser = (await supabase.auth.getUser()).data.user;
    const resolvedStudentId = studentId || authUser?.id;
    if (!resolvedStudentId) {
      throw new Error('PDF teslimi için geçerli ve aktif bir öğrenci oturumu gereklidir.');
    }

    const { data: subRecord, error: findErr } = await supabase
      .from('student_task_assignments')
      .select('id, submission_count')
      .eq('task_assignment_id', taskId)
      .eq('student_id', resolvedStudentId)
      .single();

    if (findErr || !subRecord) {
      throw new Error(`Öğrenci görev ataması bulunamadı veya erişim yetkiniz yok: ${findErr?.message || ''}`);
    }

    const nextVersion = (subRecord.submission_count || 0) + 1;
    const fileName = `${schoolNumber}_v${nextVersion}.pdf`;
    const dummyFileUrl = `https://storage.supabase.co/storage/v1/object/public/task-submissions/${resolvedStudentId}/${taskId}/${fileName}`;

    const { error: verErr } = await supabase.from('submission_versions').insert({
      student_task_assignment_id: subRecord.id,
      version_number: nextVersion,
      file_name: fileName,
      file_url: dummyFileUrl,
      file_size_bytes: file.size,
      mime_type: 'application/pdf',
      is_late: false,
    });

    if (verErr) {
      throw new Error(`PDF teslim sürümü veritabanına kaydedilemedi: ${verErr.message}`);
    }

    const { error: updateErr } = await supabase
      .from('student_task_assignments')
      .update({
        status: 'submitted',
        submission_count: nextVersion,
      })
      .eq('id', subRecord.id);

    if (updateErr) {
      throw new Error(`Görev teslim durumu güncellenemedi: ${updateErr.message}`);
    }

    return { nextVersion, fileName };
  }

  // Demo Fallback: localStorage
  const currentSubs = readFromStorage<Record<string, TeacherStudentSubmission[]>>(
    STORAGE_KEYS.SUBMISSIONS,
    INITIAL_SEED_SUBMISSIONS
  );

  const taskSubs = currentSubs[taskId] || [];
  const student = taskSubs.find((s) => s.schoolNumber === schoolNumber);
  const nextVersion = (student?.submissionCount || 0) + 1;
  const fileName = `${schoolNumber}_${(student?.studentName || 'Ogrenci').replace(/\s+/g, '_')}_v${nextVersion}.pdf`;

  const updatedTaskSubs = taskSubs.map((s) =>
    s.schoolNumber === schoolNumber
      ? {
          ...s,
          status: 'submitted' as const,
          submissionCount: nextVersion,
          lastSubmittedAt: new Date().toISOString(),
          pdfFileName: fileName,
          fileSizeBytes: file.size,
        }
      : s
  );

  writeToStorage(STORAGE_KEYS.SUBMISSIONS, {
    ...currentSubs,
    [taskId]: updatedTaskSubs,
  });

  return { nextVersion, fileName };
}

/**
 * 4. Kâğıt Teslim Bildirimi Kaydet
 */
export async function savePaperDeliveryReport(
  taskId: string,
  schoolNumber: string,
  studentId?: string
): Promise<void> {
  if (shouldUseSupabase() && supabase) {
    const authUser = (await supabase.auth.getUser()).data.user;
    const resolvedStudentId = studentId || authUser?.id;
    if (!resolvedStudentId) {
      throw new Error('Kâğıt teslim bildirimi için aktif öğrenci oturumu gereklidir.');
    }

    const { error: updateErr } = await supabase
      .from('student_task_assignments')
      .update({
        status: 'paper_reported',
        paper_delivery_reported_at: new Date().toISOString(),
      })
      .eq('task_assignment_id', taskId)
      .eq('student_id', resolvedStudentId);

    if (updateErr) {
      throw new Error(`Kâğıt teslim bildirimi kaydedilemedi: ${updateErr.message}`);
    }
    return;
  }

  // Demo Fallback: localStorage
  const currentSubs = readFromStorage<Record<string, TeacherStudentSubmission[]>>(
    STORAGE_KEYS.SUBMISSIONS,
    INITIAL_SEED_SUBMISSIONS
  );

  const taskSubs = currentSubs[taskId] || [];
  const updatedTaskSubs = taskSubs.map((s) =>
    s.schoolNumber === schoolNumber
      ? {
          ...s,
          status: 'paper_reported' as const,
          paperReportedAt: new Date().toISOString(),
        }
      : s
  );

  writeToStorage(STORAGE_KEYS.SUBMISSIONS, {
    ...currentSubs,
    [taskId]: updatedTaskSubs,
  });
}

/**
 * 5. Kâğıt Teslimini Öğretmence Onayla
 */
export async function savePaperDeliveryConfirmation(
  assignmentId: string,
  submissionId: string,
  teacherId?: string
): Promise<void> {
  if (shouldUseSupabase() && supabase) {
    const authUser = (await supabase.auth.getUser()).data.user;
    const resolvedTeacherId = teacherId || authUser?.id;
    if (!resolvedTeacherId) {
      throw new Error('Kâğıt teslimini onaylamak için yetkili öğretmen oturumu gereklidir.');
    }

    const { error: updateErr } = await supabase
      .from('student_task_assignments')
      .update({
        status: 'paper_confirmed',
        paper_delivery_confirmed_at: new Date().toISOString(),
        paper_delivery_confirmed_by: resolvedTeacherId,
      })
      .eq('id', submissionId);

    if (updateErr) {
      throw new Error(`Kâğıt teslim onayı kaydedilemedi: ${updateErr.message}`);
    }
    return;
  }

  // Demo Fallback: localStorage
  const currentSubs = readFromStorage<Record<string, TeacherStudentSubmission[]>>(
    STORAGE_KEYS.SUBMISSIONS,
    INITIAL_SEED_SUBMISSIONS
  );

  const taskSubs = currentSubs[assignmentId] || [];
  const updatedTaskSubs = taskSubs.map((s) =>
    s.id === submissionId
      ? {
          ...s,
          status: 'paper_confirmed' as const,
          paperConfirmedAt: new Date().toISOString(),
        }
      : s
  );

  writeToStorage(STORAGE_KEYS.SUBMISSIONS, {
    ...currentSubs,
    [assignmentId]: updatedTaskSubs,
  });
}

/**
 * 6. Öğretmen Notlandırmasını Kaydet (0.1 Hassasiyet)
 */
export async function saveGradingEvaluation(
  assignmentId: string,
  submissionId: string,
  scores: Record<string, number>,
  comment: string,
  isFinal: boolean,
  teacherId?: string,
  reason?: string
): Promise<{ totalScore: number }> {
  const totalScore = calculateTotalScore(
    Object.entries(scores).map(([criterionId, score]) => ({
      criterionId,
      score,
    }))
  );

  if (shouldUseSupabase() && supabase) {
    const authUser = (await supabase.auth.getUser()).data.user;
    const resolvedTeacherId = teacherId || authUser?.id;
    if (!resolvedTeacherId) {
      throw new Error('Notlandırma kaydetmek için yetkili öğretmen oturumu gereklidir.');
    }

    let evaluationId: string | null = null;

    // Gerekçe varsa veya RPC tanımlıysa atomik RPC fonksiyonunu çağır (app.grade_change_reason ayarlar)
    if (reason && reason.trim()) {
      try {
        const { data: rpcEvalId, error: rpcErr } = await (supabase.rpc as any)(
          'save_evaluation_with_reason',
          {
            p_student_task_assignment_id: submissionId,
            p_teacher_id: resolvedTeacherId,
            p_status: isFinal ? 'finalized' : 'draft',
            p_total_score: totalScore,
            p_general_comment: comment,
            p_change_reason: reason.trim(),
          }
        );
        if (!rpcErr && rpcEvalId) {
          evaluationId = rpcEvalId;
        }
      } catch {
        // RPC henüz veritabanında oluşturulmamışsa standart upsert ile devam edilir
      }
    }

    if (!evaluationId) {
      // 1. task_evaluations kaydını standart upsert et
      const { data: evalRecord, error: evalErr } = await supabase
        .from('task_evaluations')
        .upsert(
          {
            student_task_assignment_id: submissionId,
            teacher_id: resolvedTeacherId,
            status: isFinal ? 'finalized' : 'draft',
            total_score: totalScore,
            general_comment: comment,
            finalized_at: isFinal ? new Date().toISOString() : null,
          },
          { onConflict: 'student_task_assignment_id' }
        )
        .select('id')
        .single();

      if (evalErr || !evalRecord) {
        if (evalErr?.message?.includes('gerekçe')) {
          throw new Error(
            `Kesinleşmiş not değişikliği için gerekçe belirtilmesi zorunludur: ${evalErr.message}`
          );
        }
        throw new Error(`Değerlendirme kaydedilemedi: ${evalErr?.message || ''}`);
      }
      evaluationId = evalRecord.id;
    }
    const scoreRows = Object.entries(scores).map(([rubricCriterionId, score]) => ({
      evaluation_id: evaluationId,
      rubric_criterion_id: rubricCriterionId,
      score: score,
    }));

    if (scoreRows.length > 0) {
      const { error: scoresErr } = await supabase
        .from('evaluation_criterion_scores')
        .upsert(scoreRows, { onConflict: 'evaluation_id,rubric_criterion_id' });

      if (scoresErr) {
        throw new Error(`Ölçüt puanları kaydedilemedi: ${scoresErr.message}`);
      }
    }

    // 3. student_task_assignments tablosunda toplam puanı ve durumu güncelle
    const { error: subErr } = await supabase
      .from('student_task_assignments')
      .update({
        score: totalScore,
        status: 'graded',
      })
      .eq('id', submissionId);

    if (subErr) {
      throw new Error(`Öğrenci genel puan durumu güncellenemedi: ${subErr.message}`);
    }

    return { totalScore };
  }

  // Demo Fallback: localStorage
  const currentSubs = readFromStorage<Record<string, TeacherStudentSubmission[]>>(
    STORAGE_KEYS.SUBMISSIONS,
    INITIAL_SEED_SUBMISSIONS
  );

  const taskSubs = currentSubs[assignmentId] || [];
  const updatedTaskSubs = taskSubs.map((s) =>
    s.id === submissionId
      ? {
          ...s,
          status: 'graded' as const,
          score: totalScore,
          evaluationStatus: isFinal ? ('finalized' as const) : ('draft' as const),
          evaluationComment: comment,
          criteriaScores: { ...scores },
          changeReason: reason,
        }
      : s
  );

  writeToStorage(STORAGE_KEYS.SUBMISSIONS, {
    ...currentSubs,
    [assignmentId]: updatedTaskSubs,
  });

  return { totalScore };
}

/**
 * 7. Gerçek Zamanlı Değişiklik Aboneliği (Supabase Realtime & Tab Sync)
 */
export function subscribeToTaskChanges(
  onUpdate: (data: {
    assignments: TeacherAssignmentItem[];
    submissionsByAssignment: Record<string, TeacherStudentSubmission[]>;
  }) => void
): () => void {
  // 1. Supabase Realtime Kanalı (Tüm İlgili Tabloları Dinler)
  let supabaseChannel: any = null;
  if (shouldUseSupabase() && supabase) {
    try {
      const handleRealtimeChange = async () => {
        try {
          const fresh = await loadAssignmentsAndSubmissions();
          onUpdate({
            assignments: fresh.assignments,
            submissionsByAssignment: fresh.submissionsByAssignment,
          });
        } catch {
          // Geçici yükleme hatalarını yut
        }
      };

      supabaseChannel = supabase
        .channel('public:task_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, handleRealtimeChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'student_task_assignments' }, handleRealtimeChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_evaluations' }, handleRealtimeChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'evaluation_criterion_scores' }, handleRealtimeChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'submission_versions' }, handleRealtimeChange)
        .subscribe();
    } catch {
      // Realtime hatası durumunda yerel dinleyici çalışmaya devam eder
    }
  }

  // 2. Tarayıcı İçi Sekme ve Sayfa Senkronizasyonu (localStorage / CustomEvent)
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.ASSIGNMENTS || e.key === STORAGE_KEYS.SUBMISSIONS) {
      const freshAssignments = readFromStorage<TeacherAssignmentItem[]>(
        STORAGE_KEYS.ASSIGNMENTS,
        INITIAL_SEED_ASSIGNMENTS
      );
      const freshSubmissions = readFromStorage<Record<string, TeacherStudentSubmission[]>>(
        STORAGE_KEYS.SUBMISSIONS,
        INITIAL_SEED_SUBMISSIONS
      );
      onUpdate({
        assignments: freshAssignments,
        submissionsByAssignment: freshSubmissions,
      });
    }
  };

  const handleCustomSync = () => {
    const freshAssignments = readFromStorage<TeacherAssignmentItem[]>(
      STORAGE_KEYS.ASSIGNMENTS,
      INITIAL_SEED_ASSIGNMENTS
    );
    const freshSubmissions = readFromStorage<Record<string, TeacherStudentSubmission[]>>(
      STORAGE_KEYS.SUBMISSIONS,
      INITIAL_SEED_SUBMISSIONS
    );
    onUpdate({
      assignments: freshAssignments,
      submissionsByAssignment: freshSubmissions,
    });
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('perf_tasks_storage_sync', handleCustomSync);
  }

  // Cleanup fonksiyonu
  return () => {
    if (supabase && supabaseChannel) {
      supabase.removeChannel(supabaseChannel);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('perf_tasks_storage_sync', handleCustomSync);
    }
  };
}

/**
 * 8. Öğrenci Veri İzolasyon Fonksiyonu:
 * Demo ve çevrimdışı fallback modunda dahi, öğrenci arayüzüne diğer öğrencilerin teslimleri,
 * notları veya kişisel bilgileri sızdırılamaz.
 */
export function sanitizeSubmissionsForStudent(
  submissionsByAssignment: Record<string, TeacherStudentSubmission[]>,
  currentSchoolNumber: string
): Record<string, TeacherStudentSubmission[]> {
  const isolated: Record<string, TeacherStudentSubmission[]> = {};
  for (const [asgId, list] of Object.entries(submissionsByAssignment)) {
    // Sadece bu öğrencinin kendi kaydını tut; diğer öğrencilerin hiçbir bilgisini aktarma
    isolated[asgId] = list.filter((item) => item.schoolNumber === currentSchoolNumber);
  }
  return isolated;
}

/**
 * 9. Öğretmen Sınıf ve Ders Yetki Kontrolü
 * Canlı Supabase ortamında teacher_permissions tablosunu sorgular.
 */
export async function checkTeacherPermission(
  teacherId: string,
  classroomId: string,
  courseId: string,
  academicYear: string = '2026-2027'
): Promise<boolean> {
  if (shouldUseSupabase() && supabase) {
    const { data, error } = await supabase
      .from('teacher_permissions')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('classroom_id', classroomId)
      .eq('course_id', courseId)
      .eq('academic_year', academicYear)
      .maybeSingle();

    if (error) {
      console.warn('Öğretmen yetki kontrolü sorgu hatası:', error.message);
      return false;
    }
    return !!data;
  }
  // Demo modunda varsayılan yetkilendirilmiş kabul edilir
  return true;
}

/**
 * 10. Özel (Private) task-submissions Deposu İçin İmzalı İndirme Bağlantısı (Signed URL)
 * RLS kurallarına uygun olarak geçerli oturumla 1 saatlik geçici güvenli bağlantı üretir.
 */
export async function getSubmissionPdfSignedUrl(
  filePath: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  if (shouldUseSupabase() && supabase) {
    const { data, error } = await supabase.storage
      .from('task-submissions')
      .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn('İmzalı indirme bağlantısı üretilemedi:', error?.message);
      return null;
    }
    return data.signedUrl;
  }
  return null;
}

