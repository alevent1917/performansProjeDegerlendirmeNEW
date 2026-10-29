/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Görev & Teslim Veri Kalıcılığı ve Oturum Senaryoları Birim Testleri
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadAssignmentsAndSubmissions,
  saveCreatedAssignment,
  saveStudentPdfSubmission,
  savePaperDeliveryReport,
  savePaperDeliveryConfirmation,
  saveGradingEvaluation,
  sanitizeSubmissionsForStudent,
  resetTaskStorage,
  INITIAL_SEED_ASSIGNMENTS,
} from '../lib/taskService';

test('1. İlk yüklemede başlangıç tohum verileri yüklenir ve offline fallback modundadır', async () => {
  resetTaskStorage();
  const data = await loadAssignmentsAndSubmissions();

  assert.strictEqual(data.isOfflineFallback, true);
  assert.ok(data.assignments.length >= 3);
  assert.strictEqual(data.assignments[0].id, 'asg-1');
  assert.ok(data.submissionsByAssignment['asg-1']);
});

test('2. Yeni görev kaydedildiğinde sayfa yenileme (yeniden yükleme) simülasyonunda veri korunur', async () => {
  resetTaskStorage();

  const newAssignment = {
    id: 'asg-test-persisted',
    classroomId: 'c1',
    classroomName: '10/B',
    courseId: 'crs-robotics',
    courseCode: 'ROB301',
    courseName: 'Robotik Kodlama',
    title: 'Çizgi İzleyen Robot Tasarım Raporu',
    description: 'PID algoritması ve sensör kalibrasyon verileri PDF olarak teslim edilecektir.',
    deliveryFormat: 'digital_pdf' as const,
    dueDate: '2026-12-10T23:59:00Z',
    status: 'published' as const,
    studentCount: 34,
    submittedCount: 0,
    gradedCount: 0,
    paperPendingCount: 0,
    criteria: [
      { id: 'crit-p1', name: 'PID Algoritma Tasarımı', maxPoints: 50 },
      { id: 'crit-p2', name: 'Sensör Kalibrasyon Tablosu', maxPoints: 50 },
    ],
  };

  const initialStudents = [
    {
      id: 'sub-asg-test-persisted-st-1',
      studentId: 'st-1',
      studentName: 'Ali Demir',
      schoolNumber: '1042',
      status: 'not_submitted' as const,
      submissionCount: 0,
      criteriaScores: {},
    },
  ];

  await saveCreatedAssignment(newAssignment, initialStudents);

  // Sayfa yenileme simülasyonu: veriyi depolama katmanından yeniden oku
  const reloaded = await loadAssignmentsAndSubmissions();
  const foundAsg = reloaded.assignments.find((a) => a.id === 'asg-test-persisted');

  assert.ok(foundAsg, 'Yeni görev depolamada bulunmalı');
  assert.strictEqual(foundAsg?.title, 'Çizgi İzleyen Robot Tasarım Raporu');
  assert.strictEqual(foundAsg?.criteria.length, 2);

  const foundSubs = reloaded.submissionsByAssignment['asg-test-persisted'];
  assert.ok(foundSubs && foundSubs.length === 1);
  assert.strictEqual(foundSubs[0].schoolNumber, '1042');
});

test('3. Öğrenci PDF teslimi 15 MB kuralını doğrular ve sürüm artışı kalıcı kaydedilir', async () => {
  resetTaskStorage();

  // 15 MB aşan dosya testi
  const oversizedFile = {
    name: 'buyuk_dosya.pdf',
    size: 16 * 1024 * 1024, // 16 MB
    type: 'application/pdf',
  };

  await assert.rejects(
    async () => {
      await saveStudentPdfSubmission('asg-1', '1042', oversizedFile);
    },
    /15 MB/
  );

  // Geçerli PDF dosya testi
  const validFile = {
    name: '1042_Ali_Demir_Donguler.pdf',
    size: 3 * 1024 * 1024, // 3 MB
    type: 'application/pdf',
  };

  const result = await saveStudentPdfSubmission('asg-1', '1042', validFile);
  assert.strictEqual(result.nextVersion, 2); // 1. sürüm tohum veride vardı, 2'ye çıkmalı

  // Sayfa yenileme simülasyonu
  const reloaded = await loadAssignmentsAndSubmissions();
  const studentSub = reloaded.submissionsByAssignment['asg-1']?.find((s) => s.schoolNumber === '1042');

  assert.ok(studentSub);
  assert.strictEqual(studentSub?.status, 'submitted');
  assert.strictEqual(studentSub?.submissionCount, 2);
  assert.ok(studentSub?.pdfFileName?.includes('v2.pdf'));
  assert.strictEqual(studentSub?.fileSizeBytes, 3 * 1024 * 1024);
});

test('4. Kâğıt teslim bildirimi ve öğretmen onayı kalıcılığı korunur', async () => {
  resetTaskStorage();

  // Öğrenci kâğıt teslim bildirdi
  await savePaperDeliveryReport('asg-3', '1042');

  let reloaded = await loadAssignmentsAndSubmissions();
  let studentSub = reloaded.submissionsByAssignment['asg-3']?.find((s) => s.schoolNumber === '1042');
  assert.strictEqual(studentSub?.status, 'paper_reported');
  assert.ok(studentSub?.paperReportedAt);

  // Öğretmen kâğıdı onayladı
  const submissionId = studentSub!.id;
  await savePaperDeliveryConfirmation('asg-3', submissionId);

  reloaded = await loadAssignmentsAndSubmissions();
  studentSub = reloaded.submissionsByAssignment['asg-3']?.find((s) => s.id === submissionId);
  assert.strictEqual(studentSub?.status, 'paper_confirmed');
  assert.ok(studentSub?.paperConfirmedAt);
});

test('5. Öğretmen rubrik notlandırması 0.1 hassasiyetle kalıcı kaydedilir', async () => {
  resetTaskStorage();

  const scores = {
    'crit-1': 28.5,
    'crit-2': 18.2,
    'crit-3': 22.3,
    'crit-4': 24.5,
  };

  const evalResult = await saveGradingEvaluation(
    'asg-1',
    'sub-asg-1-st-1',
    scores,
    'Çok başarılı çalışma ve temiz dokümantasyon.',
    true
  );

  assert.strictEqual(evalResult.totalScore, 93.5);

  // Sayfa yenileme simülasyonu
  const reloaded = await loadAssignmentsAndSubmissions();
  const sub = reloaded.submissionsByAssignment['asg-1']?.find((s) => s.id === 'sub-asg-1-st-1');

  assert.ok(sub);
  assert.strictEqual(sub?.status, 'graded');
  assert.strictEqual(sub?.score, 93.5);
  assert.strictEqual(sub?.evaluationStatus, 'finalized');
  assert.strictEqual(sub?.evaluationComment, 'Çok başarılı çalışma ve temiz dokümantasyon.');
  assert.strictEqual(sub?.criteriaScores['crit-1'], 28.5);
});

test('6. Demo/Fallback modunda dahi öğrenci veri izolasyonu (sanitizeSubmissionsForStudent) diğer öğrencileri filtreler', () => {
  const dummySubs = {
    'asg-1': [
      {
        id: 'sub-1',
        studentId: 'st-1',
        studentName: 'Ali Demir',
        schoolNumber: '1042',
        status: 'submitted' as const,
        submissionCount: 1,
        criteriaScores: {},
      },
      {
        id: 'sub-2',
        studentId: 'st-2',
        studentName: 'Ayşe Yılmaz',
        schoolNumber: '1043',
        status: 'graded' as const,
        submissionCount: 1,
        score: 95,
        criteriaScores: { 'crit-1': 30 },
      },
    ],
  };

  const student1042View = sanitizeSubmissionsForStudent(dummySubs, '1042');

  // Yalnızca 1042 olmalı
  assert.strictEqual(student1042View['asg-1'].length, 1);
  assert.strictEqual(student1042View['asg-1'][0].schoolNumber, '1042');
  assert.strictEqual(student1042View['asg-1'][0].studentName, 'Ali Demir');

  // 1043'ün notu veya teslimi asla sızmamalı
  const hasOtherStudent = student1042View['asg-1'].some((s) => s.schoolNumber === '1043');
  assert.strictEqual(hasOtherStudent, false);
});

test('7. Şema uyumu: rubric_criteria ve evaluation_criterion_scores nesneleri doğru alanlarla saklanır', async () => {
  resetTaskStorage();

  const scores = {
    'crit-1': 25.0,
    'crit-2': 15.0,
  };

  const evalRes = await saveGradingEvaluation('asg-1', 'sub-asg-1-st-1', scores, 'Başarılı', true);
  assert.strictEqual(evalRes.totalScore, 40.0);

  const reloaded = await loadAssignmentsAndSubmissions();
  const criteria = reloaded.assignments[0].criteria;
  assert.ok(criteria.length > 0);
  assert.ok(criteria[0].id);
  assert.ok(criteria[0].maxPoints > 0);
});
