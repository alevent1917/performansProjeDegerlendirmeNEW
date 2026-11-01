/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Görev & Teslim Veri Kalıcılığı ve Oturum Senaryoları Birim Testleri
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { TeacherStudentSubmission } from '../components/TeacherDashboard';
import {
  loadAssignmentsAndSubmissions,
  saveCreatedAssignment,
  saveStudentPdfSubmission,
  savePaperDeliveryReport,
  savePaperDeliveryConfirmation,
  saveGradingEvaluation,
  sanitizeSubmissionsForStudent,
  resetTaskStorage,
  setTaskServiceMode,
  INITIAL_SEED_ASSIGNMENTS,
  DEMO_UUIDS,
} from '../lib/taskService';

// Fallback testleri için açık demo modu ayarlanır
setTaskServiceMode('demo');

test('1. İlk yüklemede başlangıç tohum verileri yüklenir ve offline fallback modundadır', async () => {
  setTaskServiceMode('demo');
  resetTaskStorage();
  const data = await loadAssignmentsAndSubmissions();

  assert.strictEqual(data.isOfflineFallback, true);
  assert.ok(data.assignments.length >= 3);
  assert.strictEqual(data.assignments[0].id, DEMO_UUIDS.ASSIGNMENT_1);
  assert.ok(data.submissionsByAssignment[DEMO_UUIDS.ASSIGNMENT_1]);
});

test('2. Yeni görev kaydedildiğinde sayfa yenileme (yeniden yükleme) simülasyonunda veri korunur', async () => {
  resetTaskStorage();

  const testAssignmentId = 'a9999999-9999-4999-8999-999999999999';
  const testStudentId = '11111111-1111-4111-8111-111111111111';
  const testSubId = 'b9999999-9999-4999-8999-999999999999';

  const newAssignment = {
    id: testAssignmentId,
    classroomId: 'c1111111-1111-4111-8111-111111111111',
    classroomName: '10/B',
    courseId: 'd1111111-1111-4111-8111-111111111111',
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
      { id: 'e1111111-1111-4111-8111-111111111111', name: 'PID Algoritma Tasarımı', maxPoints: 50 },
      { id: 'e2222222-2222-4222-8222-222222222222', name: 'Sensör Kalibrasyon Tablosu', maxPoints: 50 },
    ],
  };

  const initialStudents = [
    {
      id: testSubId,
      studentId: testStudentId,
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
  const foundAsg = reloaded.assignments.find((a) => a.id === testAssignmentId);

  assert.ok(foundAsg, 'Yeni görev depolamada bulunmalı');
  assert.strictEqual(foundAsg?.title, 'Çizgi İzleyen Robot Tasarım Raporu');
  assert.strictEqual(foundAsg?.criteria.length, 2);

  const foundSubs = reloaded.submissionsByAssignment[testAssignmentId];
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
      await saveStudentPdfSubmission(DEMO_UUIDS.ASSIGNMENT_1, '1042', oversizedFile);
    },
    /15 MB/
  );

  // Geçerli PDF dosya testi
  const validFile = {
    name: '1042_Ali_Demir_Donguler.pdf',
    size: 3 * 1024 * 1024, // 3 MB
    type: 'application/pdf',
  };

  const result = await saveStudentPdfSubmission(DEMO_UUIDS.ASSIGNMENT_1, '1042', validFile);
  assert.strictEqual(result.nextVersion, 2); // 1. sürüm tohum veride vardı, 2'ye çıkmalı

  // Sayfa yenileme simülasyonu
  const reloaded = await loadAssignmentsAndSubmissions();
  const studentSub = reloaded.submissionsByAssignment[DEMO_UUIDS.ASSIGNMENT_1]?.find((s) => s.schoolNumber === '1042');

  assert.ok(studentSub);
  assert.strictEqual(studentSub?.status, 'submitted');
  assert.strictEqual(studentSub?.submissionCount, 2);
  assert.ok(studentSub?.pdfFileName?.includes('v2.pdf'));
  assert.strictEqual(studentSub?.fileSizeBytes, 3 * 1024 * 1024);
});

test('4. Kâğıt teslim bildirimi ve öğretmen onayı kalıcılığı korunur', async () => {
  resetTaskStorage();

  // Öğrenci kâğıt teslim bildirdi
  await savePaperDeliveryReport(DEMO_UUIDS.ASSIGNMENT_3, '1042');

  let reloaded = await loadAssignmentsAndSubmissions();
  let studentSub = reloaded.submissionsByAssignment[DEMO_UUIDS.ASSIGNMENT_3]?.find((s) => s.schoolNumber === '1042');
  assert.strictEqual(studentSub?.status, 'paper_reported');
  assert.ok(studentSub?.paperReportedAt);

  // Öğretmen kâğıdı onayladı
  const submissionId = studentSub!.id;
  await savePaperDeliveryConfirmation(DEMO_UUIDS.ASSIGNMENT_3, submissionId);

  reloaded = await loadAssignmentsAndSubmissions();
  studentSub = reloaded.submissionsByAssignment[DEMO_UUIDS.ASSIGNMENT_3]?.find((s) => s.id === submissionId);
  assert.strictEqual(studentSub?.status, 'paper_confirmed');
  assert.ok(studentSub?.paperConfirmedAt);
});

test('5. Öğretmen rubrik notlandırması 0.1 hassasiyetle kalıcı kaydedilir', async () => {
  resetTaskStorage();

  const scores = {
    'e1000000-0000-4000-8000-000000000001': 28.5,
    'e1000000-0000-4000-8000-000000000002': 18.2,
    'e1000000-0000-4000-8000-000000000003': 22.3,
    'e1000000-0000-4000-8000-000000000004': 24.5,
  };

  const evalResult = await saveGradingEvaluation(
    DEMO_UUIDS.ASSIGNMENT_1,
    'b1000000-0000-4000-8000-000000000001',
    scores,
    'Çok başarılı çalışma ve temiz dokümantasyon.',
    true
  );

  assert.strictEqual(evalResult.totalScore, 93.5);

  // Sayfa yenileme simülasyonu
  const reloaded = await loadAssignmentsAndSubmissions();
  const sub = reloaded.submissionsByAssignment[DEMO_UUIDS.ASSIGNMENT_1]?.find((s) => s.id === 'b1000000-0000-4000-8000-000000000001');

  assert.ok(sub);
  assert.strictEqual(sub?.status, 'graded');
  assert.strictEqual(sub?.score, 93.5);
  assert.strictEqual(sub?.evaluationStatus, 'finalized');
  assert.strictEqual(sub?.evaluationComment, 'Çok başarılı çalışma ve temiz dokümantasyon.');
  assert.strictEqual(sub?.criteriaScores['e1000000-0000-4000-8000-000000000001'], 28.5);
});

test('6. Demo/Fallback modunda dahi öğrenci veri izolasyonu (sanitizeSubmissionsForStudent) diğer öğrencileri filtreler', () => {
  const dummySubs: Record<string, TeacherStudentSubmission[]> = {
    [DEMO_UUIDS.ASSIGNMENT_1]: [
      {
        id: 'b1000000-0000-4000-8000-000000000001',
        studentId: DEMO_UUIDS.STUDENT_1,
        studentName: 'Ali Demir',
        schoolNumber: '1042',
        status: 'submitted' as const,
        submissionCount: 1,
        criteriaScores: {},
      },
      {
        id: 'b1000000-0000-4000-8000-000000000002',
        studentId: DEMO_UUIDS.STUDENT_2,
        studentName: 'Ayşe Yılmaz',
        schoolNumber: '1043',
        status: 'graded' as const,
        submissionCount: 1,
        score: 95,
        criteriaScores: { 'e1000000-0000-4000-8000-000000000001': 30 },
      },
    ],
  };

  const student1042View = sanitizeSubmissionsForStudent(dummySubs, '1042');

  // Yalnızca 1042 olmalı
  assert.strictEqual(student1042View[DEMO_UUIDS.ASSIGNMENT_1].length, 1);
  assert.strictEqual(student1042View[DEMO_UUIDS.ASSIGNMENT_1][0].schoolNumber, '1042');
  assert.strictEqual(student1042View[DEMO_UUIDS.ASSIGNMENT_1][0].studentName, 'Ali Demir');

  // 1043'ün notu veya teslimi asla sızmamalı
  const hasOtherStudent = student1042View[DEMO_UUIDS.ASSIGNMENT_1].some((s) => s.schoolNumber === '1043');
  assert.strictEqual(hasOtherStudent, false);
});

test('7. Şema uyumu: rubric_criteria ve evaluation_criterion_scores nesneleri doğru alanlarla saklanır', async () => {
  resetTaskStorage();

  const scores = {
    'e1000000-0000-4000-8000-000000000001': 25.0,
    'e1000000-0000-4000-8000-000000000002': 15.0,
  };

  const evalRes = await saveGradingEvaluation(DEMO_UUIDS.ASSIGNMENT_1, 'b1000000-0000-4000-8000-000000000001', scores, 'Başarılı', true);
  assert.strictEqual(evalRes.totalScore, 40.0);

  const reloaded = await loadAssignmentsAndSubmissions();
  const criteria = reloaded.assignments[0].criteria;
  assert.ok(criteria.length > 0);
  assert.ok(criteria[0].id);
  assert.ok(criteria[0].maxPoints > 0);
});

test('8. Canlı modda (Live mode) oturumsuz veya yetkisiz işlem sessizce fallbacke düşmez, hata fırlatır', async () => {
  setTaskServiceMode('live');

  const sampleAssignment = {
    id: 'a8888888-8888-4888-8888-888888888888',
    classroomId: 'c1111111-1111-4111-8111-111111111111',
    classroomName: '10/B',
    courseId: 'd1111111-1111-4111-8111-111111111111',
    courseCode: 'PRG101',
    courseName: 'Programlama Temelleri',
    title: 'Canlı Mod Görevi',
    description: 'Açıklama',
    deliveryFormat: 'digital_pdf' as const,
    dueDate: '2026-11-20T23:59:00Z',
    status: 'published' as const,
    studentCount: 30,
    submittedCount: 0,
    gradedCount: 0,
    paperPendingCount: 0,
    criteria: [{ id: 'e8888888-8888-4888-8888-888888888888', name: 'Kriter', maxPoints: 100 }],
  };

  // Öğretmen ID veya oturumu olmadan canlı modda çağrıldığında hata fırlatmalı, sessizce localStorage'a yazmamalı
  await assert.rejects(
    async () => {
      await saveCreatedAssignment(sampleAssignment, [], undefined);
    },
    /öğretmen oturumu gereklidir/
  );

  // Test bitiminde tekrar demo moduna döndür
  setTaskServiceMode('demo');
});
