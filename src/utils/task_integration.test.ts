/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Görev–Teslim Entegrasyonu Birim Testleri
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTotalScore,
  validateStudentPdfFile,
  validateCriteriaSum,
} from './validation';
import { sanitizeSubmissionsForStudent } from '../lib/taskService';

// Mock types for testing integration logic
interface Assignment {
  id: string;
  classroomId: string;
  courseId: string;
  title: string;
  deliveryFormat: 'digital_pdf' | 'paper';
  criteria: { id: string; name: string; maxPoints: number }[];
}

interface StudentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  schoolNumber: string;
  studentName: string;
  status: 'not_submitted' | 'submitted' | 'paper_reported' | 'paper_confirmed' | 'graded';
  submissionCount: number;
  lastSubmittedAt?: string;
  paperReportedAt?: string;
  paperConfirmedAt?: string;
  pdfFileName?: string;
  fileSizeBytes?: number;
  score?: number;
  evaluationStatus?: 'draft' | 'finalized';
  evaluationComment?: string;
  criteriaScores: Record<string, number>;
  changeReason?: string;
}

// Helper functions mirroring application workflow
function createAssignmentForClass(
  assignment: Assignment,
  studentsInClass: { id: string; name: string; schoolNumber: string }[]
): { assignment: Assignment; submissions: StudentSubmission[] } {
  const sumCheck = validateCriteriaSum(assignment.criteria);
  if (!sumCheck.isValid) {
    throw new Error('Rubrik ölçütleri toplamı 100 olmalıdır.');
  }

  const submissions: StudentSubmission[] = studentsInClass.map((student) => ({
    id: `sub-${assignment.id}-${student.id}`,
    assignmentId: assignment.id,
    studentId: student.id,
    schoolNumber: student.schoolNumber,
    studentName: student.name,
    status: 'not_submitted',
    submissionCount: 0,
    criteriaScores: {},
  }));

  return { assignment, submissions };
}

function submitStudentPdf(
  submission: StudentSubmission,
  file: { name: string; size: number; type: string }
): StudentSubmission {
  const validation = validateStudentPdfFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Geçersiz dosya');
  }

  const nextVersion = submission.submissionCount + 1;
  const fileName = `${submission.schoolNumber}_${submission.studentName.replace(/\s+/g, '_')}_v${nextVersion}.pdf`;

  return {
    ...submission,
    status: 'submitted',
    submissionCount: nextVersion,
    lastSubmittedAt: new Date().toISOString(),
    pdfFileName: fileName,
    fileSizeBytes: file.size,
  };
}

function reportPaperSubmission(submission: StudentSubmission): StudentSubmission {
  return {
    ...submission,
    status: 'paper_reported',
    paperReportedAt: new Date().toISOString(),
  };
}

function confirmPaperSubmission(submission: StudentSubmission): StudentSubmission {
  if (submission.status !== 'paper_reported') {
    throw new Error('Yalnızca bildirilmiş kâğıt teslimleri onaylanabilir.');
  }
  return {
    ...submission,
    status: 'paper_confirmed',
    paperConfirmedAt: new Date().toISOString(),
  };
}

function gradeSubmission(
  submission: StudentSubmission,
  scores: Record<string, number>,
  comment: string,
  isFinal: boolean,
  reason?: string
): StudentSubmission {
  const total = calculateTotalScore(
    Object.entries(scores).map(([criterionId, score]) => ({
      criterionId,
      score,
    }))
  );

  // Kesinleşmiş notun değiştirilmesinde gerekçe kontrolü (trg_log_grade_change kuralı)
  if (submission.evaluationStatus === 'finalized' && isFinal && submission.score !== undefined) {
    if (total !== submission.score && (!reason || !reason.trim())) {
      throw new Error('Kesinleşmiş not değişikliği için geçerli bir gerekçe belirtilmesi zorunludur!');
    }
  }

  return {
    ...submission,
    status: 'graded',
    score: total,
    evaluationStatus: isFinal ? 'finalized' : 'draft',
    evaluationComment: comment,
    criteriaScores: { ...scores },
    changeReason: reason,
  };
}

// Testler için RFC 4122 standartlarına uygun test UUID sabitleri
const TEST_UUIDS = {
  TEACHER: '550e8400-e29b-41d4-a716-446655440000',
  STUDENT_1: '11111111-1111-4111-8111-111111111111',
  STUDENT_2: '22222222-2222-4222-8222-222222222222',
  CLASSROOM: 'c1111111-1111-4111-8111-111111111111',
  COURSE: 'd1111111-1111-4111-8111-111111111111',
  ASSIGNMENT_1: 'a1111111-1111-4111-8111-111111111111',
  ASSIGNMENT_2: 'a2222222-2222-4222-8222-222222222222',
  ASSIGNMENT_3: 'a3333333-3333-4333-8333-333333333333',
  SUBMISSION_1: 'b1111111-1111-4111-8111-111111111111',
  SUBMISSION_2: 'b2222222-2222-4222-8222-222222222222',
  SUBMISSION_3: 'b3333333-3333-4333-8333-333333333333',
  CRITERION_1: 'e1111111-1111-4111-8111-111111111111',
  CRITERION_2: 'e2222222-2222-4222-8222-222222222222',
};

test('1. Öğretmenin yayımladığı görev ilgili sınıf öğrencilerine atanır', () => {
  const newAssignment: Assignment = {
    id: TEST_UUIDS.ASSIGNMENT_1,
    classroomId: TEST_UUIDS.CLASSROOM,
    courseId: TEST_UUIDS.COURSE,
    title: 'Yeni Algoritma Projesi',
    deliveryFormat: 'digital_pdf',
    criteria: [
      { id: TEST_UUIDS.CRITERION_1, name: 'Kod Kalitesi', maxPoints: 50 },
      { id: TEST_UUIDS.CRITERION_2, name: 'Rapor Düzeni', maxPoints: 50 },
    ],
  };

  const classStudents = [
    { id: TEST_UUIDS.STUDENT_1, name: 'Ali Demir', schoolNumber: '1042' },
    { id: TEST_UUIDS.STUDENT_2, name: 'Ayşe Yılmaz', schoolNumber: '1043' },
  ];

  const result = createAssignmentForClass(newAssignment, classStudents);
  assert.equal(result.submissions.length, 2);
  assert.equal(result.submissions[0].status, 'not_submitted');
  assert.equal(result.submissions[0].studentName, 'Ali Demir');
  assert.equal(result.submissions[1].schoolNumber, '1043');
});

test('2. Öğrenci PDF teslimi 15 MB sınırını doğrular ve teslim kaydını oluşturur', () => {
  const initialSub: StudentSubmission = {
    id: TEST_UUIDS.SUBMISSION_1,
    assignmentId: TEST_UUIDS.ASSIGNMENT_1,
    studentId: TEST_UUIDS.STUDENT_1,
    schoolNumber: '1042',
    studentName: 'Ali Demir',
    status: 'not_submitted',
    submissionCount: 0,
    criteriaScores: {},
  };

  // 15 MB altı geçerli PDF
  const validFile = { name: 'proje_raporu.pdf', size: 5 * 1024 * 1024, type: 'application/pdf' };
  const updatedSub = submitStudentPdf(initialSub, validFile);
  assert.equal(updatedSub.status, 'submitted');
  assert.equal(updatedSub.submissionCount, 1);
  assert.match(updatedSub.pdfFileName || '', /^1042_Ali_Demir_v1\.pdf$/);

  // 15 MB üzeri dosya reddedilir
  const oversizedFile = { name: 'buyuk.pdf', size: 16 * 1024 * 1024, type: 'application/pdf' };
  assert.throws(() => submitStudentPdf(initialSub, oversizedFile), /15 MB/);
});

test('3. Kâğıt teslim bildirimi ve öğretmen onayı akışı tutarlı çalışır', () => {
  const initialSub: StudentSubmission = {
    id: TEST_UUIDS.SUBMISSION_2,
    assignmentId: TEST_UUIDS.ASSIGNMENT_2,
    studentId: TEST_UUIDS.STUDENT_1,
    schoolNumber: '1042',
    studentName: 'Ali Demir',
    status: 'not_submitted',
    submissionCount: 0,
    criteriaScores: {},
  };

  // Öğrenci bildirir
  const reportedSub = reportPaperSubmission(initialSub);
  assert.equal(reportedSub.status, 'paper_reported');
  assert.ok(reportedSub.paperReportedAt);

  // Öğretmen onaylar
  const confirmedSub = confirmPaperSubmission(reportedSub);
  assert.equal(confirmedSub.status, 'paper_confirmed');
  assert.ok(confirmedSub.paperConfirmedAt);
});

test('4. Öğretmen değerlendirmesi 0.1 hassasiyetinde toplam not hesaplar', () => {
  const submittedSub: StudentSubmission = {
    id: TEST_UUIDS.SUBMISSION_3,
    assignmentId: TEST_UUIDS.ASSIGNMENT_3,
    studentId: TEST_UUIDS.STUDENT_1,
    schoolNumber: '1042',
    studentName: 'Ali Demir',
    status: 'submitted',
    submissionCount: 1,
    criteriaScores: {},
  };

  const scores = {
    [TEST_UUIDS.CRITERION_1]: 45.5,
    [TEST_UUIDS.CRITERION_2]: 48.0,
  };

  const graded = gradeSubmission(submittedSub, scores, 'Harika çalışma Ali.', true);
  assert.equal(graded.status, 'graded');
  assert.equal(graded.score, 93.5);
  assert.equal(graded.evaluationStatus, 'finalized');
  assert.equal(graded.evaluationComment, 'Harika çalışma Ali.');
});

test('5. İki öğrenci ve bir öğretmen uçtan uca senaryosu: Görev, PDF/kâğıt teslimi, izolasyon, taslak/kesinleşmiş not, gerekçeli güncelleme', () => {
  // 1. Öğretmen 10/B sınıfı için 100 puanlık görev yayımlar
  const duoAssignment: Assignment = {
    id: 'a0000000-0000-4000-8000-000000000101',
    classroomId: TEST_UUIDS.CLASSROOM,
    courseId: TEST_UUIDS.COURSE,
    title: 'Gelişmiş Veri Yapıları ve Dosyalama',
    deliveryFormat: 'digital_pdf',
    criteria: [
      { id: 'e0000000-0000-4000-8000-000000000011', name: 'Algoritma ve Mantık', maxPoints: 60 },
      { id: 'e0000000-0000-4000-8000-000000000012', name: 'Test ve Dokümantasyon', maxPoints: 40 },
    ],
  };

  const classStudents = [
    { id: TEST_UUIDS.STUDENT_1, name: 'Ali Demir', schoolNumber: '1042' },
    { id: TEST_UUIDS.STUDENT_2, name: 'Ayşe Yılmaz', schoolNumber: '1043' },
  ];

  const created = createAssignmentForClass(duoAssignment, classStudents);
  assert.equal(created.submissions.length, 2);

  let aliSub = created.submissions[0];
  let ayseSub = created.submissions[1];

  // 2. Öğrenci 1 (Ali) 5 MB geçerli PDF yükler
  const aliFile = { name: 'ali_rapor.pdf', size: 5 * 1024 * 1024, type: 'application/pdf' };
  aliSub = submitStudentPdf(aliSub, aliFile);
  assert.equal(aliSub.status, 'submitted');
  assert.equal(aliSub.submissionCount, 1);
  // Supabase Storage klasör kuralı: auth.uid()/taskId/fileName
  const storageObjectPath = `${aliSub.studentId}/${duoAssignment.id}/${aliSub.pdfFileName}`;
  assert.ok(storageObjectPath.startsWith(`${TEST_UUIDS.STUDENT_1}/`));

  // 3. Öğrenci 2 (Ayşe) kâğıt teslim bildirir
  ayseSub = reportPaperSubmission(ayseSub);
  assert.equal(ayseSub.status, 'paper_reported');

  // 4. Veri İzolasyon Testi: Ali Ayşe'yi, Ayşe Ali'yi göremez
  const allSubsMap = {
    [duoAssignment.id]: [aliSub, ayseSub] as any,
  };
  const aliView = sanitizeSubmissionsForStudent(allSubsMap, '1042');
  const ayseView = sanitizeSubmissionsForStudent(allSubsMap, '1043');

  assert.equal(aliView[duoAssignment.id].length, 1);
  assert.equal(aliView[duoAssignment.id][0].studentName, 'Ali Demir');
  assert.equal(ayseView[duoAssignment.id].length, 1);
  assert.equal(ayseView[duoAssignment.id][0].studentName, 'Ayşe Yılmaz');

  // 5. Öğretmen Ali'ye önce TASLAK not verir (Öğrenci taslağı göremez)
  aliSub = gradeSubmission(aliSub, { 'crit-a': 50, 'crit-b': 35 }, 'İyi başlangıç', false);
  assert.equal(aliSub.evaluationStatus, 'draft');
  assert.equal(aliSub.score, 85);
  // RLS kuralı: Öğrenci yalnızca status = 'finalized' olanları görebilir
  const isStudentVisible = (aliSub.evaluationStatus as string | undefined) === 'finalized';
  assert.equal(isStudentVisible, false, 'Taslak not öğrenciye gösterilmemelidir');

  // 6. Öğretmen Ali'nin notunu KESİNLEŞTİRİR
  aliSub = gradeSubmission(aliSub, { 'crit-a': 52, 'crit-b': 36 }, 'Nihai değerlendirme tamamlandı', true);
  assert.equal(aliSub.evaluationStatus, 'finalized');
  assert.equal(aliSub.score, 88);

  // 7. Kesinleşmiş notun gerekçesiz değiştirilmesi REDDEDİLİR (trg_log_grade_change)
  assert.throws(
    () => {
      gradeSubmission(aliSub, { 'crit-a': 55, 'crit-b': 38 }, 'Gerekçesiz puan artırımı', true, '');
    },
    /Kesinleşmiş not değişikliği için geçerli bir gerekçe belirtilmesi zorunludur/
  );

  // 8. Geçerli gerekçe ile kesinleşmiş not güncellenir
  const validReason = 'Öğrencinin ek sınav itiraz dilekçesi doğrultusunda algoritmik adım tekrar incelendi.';
  aliSub = gradeSubmission(
    aliSub,
    { 'crit-a': 55, 'crit-b': 38 },
    'İtiraz kabul edildi ve puan güncellendi.',
    true,
    validReason
  );
  assert.equal(aliSub.score, 93);
  assert.equal(aliSub.changeReason, validReason);

  // 9. Öğretmen Ayşe'nin kâğıt teslimini onaylar
  ayseSub = confirmPaperSubmission(ayseSub);
  assert.equal(ayseSub.status, 'paper_confirmed');
  assert.ok(ayseSub.paperConfirmedAt);
});

