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
  isFinal: boolean
): StudentSubmission {
  const total = calculateTotalScore(
    Object.entries(scores).map(([criterionId, score]) => ({
      criterionId,
      score,
    }))
  );

  return {
    ...submission,
    status: 'graded',
    score: total,
    evaluationStatus: isFinal ? 'finalized' : 'draft',
    evaluationComment: comment,
    criteriaScores: { ...scores },
  };
}

test('1. Öğretmenin yayımladığı görev ilgili sınıf öğrencilerine atanır', () => {
  const newAssignment: Assignment = {
    id: 'asg-test-1',
    classroomId: 'c1',
    courseId: 'crs1',
    title: 'Yeni Algoritma Projesi',
    deliveryFormat: 'digital_pdf',
    criteria: [
      { id: 'cr1', name: 'Kod Kalitesi', maxPoints: 50 },
      { id: 'cr2', name: 'Rapor Düzeni', maxPoints: 50 },
    ],
  };

  const classStudents = [
    { id: 'st-1', name: 'Ali Demir', schoolNumber: '1042' },
    { id: 'st-2', name: 'Ayşe Yılmaz', schoolNumber: '1043' },
  ];

  const result = createAssignmentForClass(newAssignment, classStudents);
  assert.equal(result.submissions.length, 2);
  assert.equal(result.submissions[0].status, 'not_submitted');
  assert.equal(result.submissions[0].studentName, 'Ali Demir');
  assert.equal(result.submissions[1].schoolNumber, '1043');
});

test('2. Öğrenci PDF teslimi 15 MB sınırını doğrular ve teslim kaydını oluşturur', () => {
  const initialSub: StudentSubmission = {
    id: 'sub-1',
    assignmentId: 'asg-test-1',
    studentId: 'st-1',
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
    id: 'sub-paper-1',
    assignmentId: 'asg-paper-1',
    studentId: 'st-1',
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
    id: 'sub-grade-1',
    assignmentId: 'asg-grade-1',
    studentId: 'st-1',
    schoolNumber: '1042',
    studentName: 'Ali Demir',
    status: 'submitted',
    submissionCount: 1,
    criteriaScores: {},
  };

  const scores = {
    cr1: 45.5,
    cr2: 48.0,
  };

  const graded = gradeSubmission(submittedSub, scores, 'Harika çalışma Ali.', true);
  assert.equal(graded.status, 'graded');
  assert.equal(graded.score, 93.5);
  assert.equal(graded.evaluationStatus, 'finalized');
  assert.equal(graded.evaluationComment, 'Harika çalışma Ali.');
});
