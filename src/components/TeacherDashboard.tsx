/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Öğretmen Paneli (Teacher Dashboard) - Aşama 3 & 4
 * Yetkili sınıf/ders kontrolü, görev atama, rubrik oluşturucu (100 puan kuralı),
 * 0.1 hassasiyetinde notlandırma, not değişiklik gerekçesi ve toplu ZIP arşivi indirme.
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Users,
  CheckCircle,
  Clock,
  Download,
  Award,
  AlertCircle,
  FileCheck,
  CheckSquare,
  ShieldAlert,
  Archive,
  Save,
  Send,
  HelpCircle,
  FileText,
  Eye,
} from 'lucide-react';
import JSZip from 'jszip';
import {
  calculateCriteriaTotal,
  validateCriteriaSum,
  validateCriterionScore,
  calculateTotalScore,
  formatTurkishDate,
  sanitizeArchiveFileName,
} from '../utils/validation';

export interface TeacherAssignmentItem {
  id: string;
  classroomId: string;
  classroomName: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  title: string;
  description: string;
  deliveryFormat: 'digital_pdf' | 'paper';
  dueDate: string;
  status: 'draft' | 'published';
  studentCount: number;
  submittedCount: number;
  gradedCount: number;
  paperPendingCount: number;
  criteria: {
    id: string;
    name: string;
    maxPoints: number;
    description?: string;
  }[];
}

export interface TeacherStudentSubmission {
  id: string;
  studentId: string;
  studentName: string;
  schoolNumber: string;
  status: 'not_submitted' | 'submitted' | 'paper_reported' | 'paper_confirmed' | 'graded';
  submissionCount: number;
  lastSubmittedAt?: string;
  paperReportedAt?: string;
  paperConfirmedAt?: string;
  score?: number;
  evaluationStatus?: 'draft' | 'finalized';
  evaluationComment?: string;
  criteriaScores: Record<string, number>;
  pdfFileName?: string;
  fileSizeBytes?: number;
}

export interface TeacherDashboardProps {
  teacherName: string;
  assignments?: TeacherAssignmentItem[];
  submissionsByAssignment?: Record<string, TeacherStudentSubmission[]>;
  onTaskCreated?: (newTask: TeacherAssignmentItem, targetClassId: string) => void;
  onConfirmPaperDelivery?: (assignmentId: string, submissionId: string) => void;
  onSaveGrading?: (
    assignmentId: string,
    submissionId: string,
    scores: Record<string, number>,
    comment: string,
    isFinal: boolean,
    reason?: string
  ) => void;
  onOpenAuditLog?: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  teacherName,
  assignments: propAssignments,
  submissionsByAssignment,
  onTaskCreated,
  onConfirmPaperDelivery,
  onSaveGrading,
  onOpenAuditLog,
}) => {
  // Öğretmenin Yetkili Olduğu Sınıf ve Dersler (teacher_permissions tablosundan)
  const authorizedClasses = [
    { classroomId: 'c1', classroomName: '10/B', courseId: 'crs1', courseCode: 'PRG101', courseName: 'Programlama Temelleri' },
    { classroomId: 'c1', classroomName: '10/B', courseId: 'crs2', courseCode: 'NET201', courseName: 'Ağ Sistemleri ve Anahtarlama' },
    { classroomId: 'c2', classroomName: '11/B', courseId: 'crs2', courseCode: 'NET201', courseName: 'Ağ Sistemleri ve Anahtarlama' },
  ];

  // Aktif Görevler (Props varsa props, yoksa yerel state)
  const [localAssignments, setLocalAssignments] = useState<TeacherAssignmentItem[]>([
    {
      id: 'asg-1',
      classroomId: 'c1',
      classroomName: '10/B',
      courseId: 'crs1',
      courseCode: 'PRG101',
      courseName: 'Programlama Temelleri',
      title: 'Döngüler ve Fonksiyonlar Konsol Uygulaması',
      description: 'Döngüler, çok boyutlu diziler ve modüler fonksiyon yapıları kullanılarak bir öğrenci bilgi yönetim konsol uygulaması geliştirilecek ve teknik rapor PDF olarak teslim edilecektir.',
      deliveryFormat: 'digital_pdf',
      dueDate: '2026-11-15T23:59:00Z',
      status: 'published',
      studentCount: 34,
      submittedCount: 22,
      gradedCount: 12,
      paperPendingCount: 0,
      criteria: [
        { id: 'crit-1', name: 'Algoritmik Doğruluk ve Mantıksal Akış', maxPoints: 30 },
        { id: 'crit-2', name: 'Kodlama Standartları ve Yorum Satırları', maxPoints: 20 },
        { id: 'crit-3', name: 'Hata Yakalama ve Uç Durum Kontrolleri', maxPoints: 25 },
        { id: 'crit-4', name: 'Teknik Rapor Formatı ve Şablon Uyumu', maxPoints: 25 },
      ],
    },
    {
      id: 'asg-2',
      classroomId: 'c2',
      classroomName: '11/B',
      courseId: 'crs2',
      courseCode: 'NET201',
      courseName: 'Ağ Sistemleri ve Anahtarlama',
      title: 'Atölye UTP Cat6 Kablolama ve Patch Panel Pratiği',
      description: 'T568B renk standartlarında kablo sonlandırma ve test formunun fiziksel olarak öğretmene elden teslim edilmesi.',
      deliveryFormat: 'paper',
      dueDate: '2026-11-20T17:00:00Z',
      status: 'published',
      studentCount: 32,
      submittedCount: 18,
      gradedCount: 8,
      paperPendingCount: 4,
      criteria: [
        { id: 'crit-21', name: 'T568B Renk Sıralaması Doğruluğu', maxPoints: 40 },
        { id: 'crit-22', name: 'Kablo Soyma ve RJ45 Sıkma Kalitesi', maxPoints: 30 },
        { id: 'crit-23', name: 'Tester Doğrulaması', maxPoints: 30 },
      ],
    },
  ]);

  const assignments = propAssignments && propAssignments.length > 0 ? propAssignments : localAssignments;

  // Seçili Görev ve Öğrenci Listesi
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('asg-1');
  const activeAssignment =
    assignments.find((a) => a.id === selectedAssignmentId) || assignments[0] || localAssignments[0];

  // Öğrenci Teslim Listesi
  const [localSubmissions, setLocalSubmissions] = useState<TeacherStudentSubmission[]>([
    {
      id: 'sub-1',
      studentId: 'st-1',
      studentName: 'Ali Demir',
      schoolNumber: '1042',
      status: 'submitted',
      submissionCount: 1,
      lastSubmittedAt: '2026-10-27T16:40:00Z',
      pdfFileName: '1042_Ali_Demir_v1.pdf',
      criteriaScores: {},
    },
    {
      id: 'sub-2',
      studentId: 'st-2',
      studentName: 'Ayşe Yılmaz',
      schoolNumber: '1043',
      status: 'graded',
      submissionCount: 2,
      lastSubmittedAt: '2026-10-26T14:10:00Z',
      score: 95.0,
      evaluationStatus: 'finalized',
      evaluationComment: 'Harika kod organizasyonu ve kapsamlı hata yakalama.',
      criteriaScores: {
        'crit-1': 30.0,
        'crit-2': 19.0,
        'crit-3': 24.0,
        'crit-4': 22.0,
      },
      pdfFileName: '1043_Ayse_Yilmaz_v2.pdf',
    },
    {
      id: 'sub-3',
      studentId: 'st-3',
      studentName: 'Can Öztürk',
      schoolNumber: '1044',
      status: 'paper_reported',
      submissionCount: 0,
      paperReportedAt: '2026-10-28T09:15:00Z',
      criteriaScores: {},
    },
    {
      id: 'sub-4',
      studentId: 'st-4',
      studentName: 'Zeynep Kaya',
      schoolNumber: '1045',
      status: 'not_submitted',
      submissionCount: 0,
      criteriaScores: {},
    },
  ]);

  const submissions =
    submissionsByAssignment && submissionsByAssignment[activeAssignment.id]
      ? submissionsByAssignment[activeAssignment.id]
      : localSubmissions;

  // Dinamik İstatistik Hesaplamaları
  const activeStudentCount = submissions.length || activeAssignment.studentCount || 34;
  const activeSubmittedCount = submissions.filter(
    (s) => s.status === 'submitted' || s.status === 'graded'
  ).length;
  const activeGradedCount = submissions.filter((s) => s.status === 'graded').length;
  const activePaperPendingCount = submissions.filter((s) => s.status === 'paper_reported').length;

  // Modallar
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [selectedSubForPdfPreview, setSelectedSubForPdfPreview] = useState<TeacherStudentSubmission | null>(null);
  const [selectedSubForGrading, setSelectedSubForGrading] = useState<TeacherStudentSubmission | null>(null);
  const [isGradeChangeReasonModalOpen, setIsGradeChangeReasonModalOpen] = useState(false);
  const [gradeChangeReason, setGradeChangeReason] = useState('');
  const [pendingScoreUpdate, setPendingScoreUpdate] = useState<{
    newScores: Record<string, number>;
    comment: string;
    isFinal: boolean;
  } | null>(null);

  // Yeni Görev Form Durumu
  const [newTaskForm, setNewTaskForm] = useState({
    classroomAndCourse: 'c1:crs1',
    title: '',
    description: '',
    deliveryFormat: 'digital_pdf' as 'digital_pdf' | 'paper',
    dueDate: '2026-11-30',
    criteria: [
      { id: '1', name: 'Algoritmik Çözüm Doğruluğu', maxPoints: 40, description: '' },
      { id: '2', name: 'Kodlama Standartları', maxPoints: 30, description: '' },
      { id: '3', name: 'Rapor Düzeni', maxPoints: 30, description: '' },
    ],
  });

  // Not Verme Form Durumu
  const [currentGradingScores, setCurrentGradingScores] = useState<Record<string, number>>({});
  const [gradingComment, setGradingComment] = useState('');

  // 1. Yeni Görev Formunda Rubrik Ölçütü Ekleme
  const handleAddCriterion = () => {
    setNewTaskForm((prev) => ({
      ...prev,
      criteria: [
        ...prev.criteria,
        { id: String(Date.now()), name: '', maxPoints: 10, description: '' },
      ],
    }));
  };

  const handleRemoveCriterion = (id: string) => {
    setNewTaskForm((prev) => ({
      ...prev,
      criteria: prev.criteria.filter((c) => c.id !== id),
    }));
  };

  const handleUpdateCriterion = (id: string, field: 'name' | 'maxPoints', val: any) => {
    setNewTaskForm((prev) => ({
      ...prev,
      criteria: prev.criteria.map((c) =>
        c.id === id ? { ...c, [field]: field === 'maxPoints' ? Number(val) : val } : c
      ),
    }));
  };

  const criteriaSum = calculateCriteriaTotal(newTaskForm.criteria);
  const isSumValid = validateCriteriaSum(newTaskForm.criteria);

  // Yeni Görev Dağıtımı Kaydet
  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSumValid) return;
    if (!newTaskForm.title.trim() || !newTaskForm.description.trim()) return;

    const [classroomId, courseId] = newTaskForm.classroomAndCourse.split(':');
    const matchedPerm = authorizedClasses.find(
      (a) => a.classroomId === classroomId && a.courseId === courseId
    );
    if (!matchedPerm) return;

    const newId = `asg-${Date.now()}`;
    const created: TeacherAssignmentItem = {
      id: newId,
      classroomId: matchedPerm.classroomId,
      classroomName: matchedPerm.classroomName,
      courseId: matchedPerm.courseId,
      courseName: matchedPerm.courseName,
      courseCode: matchedPerm.courseCode,
      title: newTaskForm.title.trim(),
      description: newTaskForm.description.trim(),
      deliveryFormat: newTaskForm.deliveryFormat,
      dueDate: `${newTaskForm.dueDate}T23:59:00Z`,
      status: 'published',
      studentCount: 34,
      submittedCount: 0,
      gradedCount: 0,
      paperPendingCount: 0,
      criteria: newTaskForm.criteria.map((c, idx) => ({
        id: `crit-${newId}-${idx}`,
        name: c.name.trim() || `Ölçüt ${idx + 1}`,
        maxPoints: c.maxPoints,
      })),
    };

    if (onTaskCreated) {
      onTaskCreated(created, matchedPerm.classroomId);
    } else {
      setLocalAssignments((prev) => [created, ...prev]);
    }
    setSelectedAssignmentId(newId);
    setIsNewTaskModalOpen(false);
  };

  // 2. Kâğıt Teslimi Onayı
  const handleConfirmPaperDelivery = (studentSubId: string) => {
    if (onConfirmPaperDelivery) {
      onConfirmPaperDelivery(activeAssignment.id, studentSubId);
    } else {
      setLocalSubmissions((prev) =>
        prev.map((s) =>
          s.id === studentSubId
            ? {
                ...s,
                status: 'paper_confirmed',
                paperConfirmedAt: new Date().toISOString(),
              }
            : s
        )
      );
    }
  };

  // 3. Notlandırma Modalını Aç
  const handleOpenGradingModal = (sub: TeacherStudentSubmission) => {
    setSelectedSubForGrading(sub);
    setCurrentGradingScores({ ...sub.criteriaScores });
    setGradingComment(sub.evaluationComment || '');
  };

  // 4. Puan Değişimi & Not Kaydetme (0.1 Hassasiyet ve Audit Log Denetimi)
  const handleSaveGrading = (isFinal: boolean) => {
    if (!selectedSubForGrading) return;

    const currentTotal = calculateTotalScore(
      Object.entries(currentGradingScores).map(([criterionId, score]) => ({
        criterionId,
        score,
      }))
    );

    // Eğer öğrencinin notu önceden KESİNLEŞMİŞ ise ve not değiştiriliyorsa:
    // MEB Güvenlik kuralı gereği GEREKÇE MODALI ZORUNLUDUR!
    if (
      selectedSubForGrading.evaluationStatus === 'finalized' &&
      selectedSubForGrading.score !== undefined &&
      Math.abs(selectedSubForGrading.score - currentTotal) > 0.001
    ) {
      setPendingScoreUpdate({
        newScores: currentGradingScores,
        comment: gradingComment,
        isFinal,
      });
      setIsGradeChangeReasonModalOpen(true);
      return;
    }

    applyGradingUpdate(currentGradingScores, gradingComment, isFinal, undefined);
  };

  const applyGradingUpdate = (
    scores: Record<string, number>,
    comment: string,
    isFinal: boolean,
    reason?: string
  ) => {
    if (!selectedSubForGrading) return;

    const total = calculateTotalScore(
      Object.entries(scores).map(([criterionId, score]) => ({
        criterionId,
        score,
      }))
    );

    if (onSaveGrading) {
      onSaveGrading(
        activeAssignment.id,
        selectedSubForGrading.id,
        scores,
        comment,
        isFinal,
        reason
      );
    } else {
      setLocalSubmissions((prev) =>
        prev.map((s) =>
          s.id === selectedSubForGrading.id
            ? {
                ...s,
                status: 'graded',
                score: total,
                evaluationStatus: isFinal ? 'finalized' : 'draft',
                evaluationComment: comment,
                criteriaScores: { ...scores },
              }
            : s
        )
      );
    }

    setSelectedSubForGrading(null);
    setIsGradeChangeReasonModalOpen(false);
    setGradeChangeReason('');
    setPendingScoreUpdate(null);
  };

  // 5. Sınıfın PDF Teslimlerini ZIP Arşivi Olarak İndirme (JSZip)
  const handleDownloadClassZip = async () => {
    const zip = new JSZip();
    const folder = zip.folder(`${activeAssignment.classroomName}_${activeAssignment.courseCode}_Teslimler`);

    // Sadece teslim edilmiş olanları ekle
    const validSubs = submissions.filter((s) => s.status === 'submitted' || s.status === 'graded');
    if (validSubs.length === 0) {
      alert('İndirilecek geçerli dijital PDF teslimi bulunamadı.');
      return;
    }

    validSubs.forEach((sub) => {
      const fileName = sanitizeArchiveFileName(
        sub.schoolNumber,
        sub.studentName,
        activeAssignment.title,
        sub.submissionCount || 1
      );
      // Örnek PDF içeriği simülasyonu
      const dummyPdfContent = `%PDF-1.4\n1 0 obj\n<< /Title (${sub.studentName} - ${activeAssignment.title}) /Author (${sub.studentName}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
      folder?.file(fileName, dummyPdfContent);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeAssignment.classroomName}_${activeAssignment.courseCode}_Teslimler.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Üst Bilgi ve Eylem Kartı */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded">
                Öğretmen Paneli
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-medium text-slate-600">{teacherName}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Görev Dağıtımı & Rubrik Değerlendirme
            </h2>
            <p className="text-xs text-slate-600">
              Yalnızca okul idaresi tarafından yetkilendirildiğiniz sınıf ve derslere görev atayabilir, 0.1 hassasiyetinde puanlayabilirsiniz.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsNewTaskModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Görev Dağıt</span>
            </button>
          </div>
        </div>

        {/* Görev Seçici Hapları */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-slate-500 shrink-0">Aktif Görev:</span>
          {assignments.map((asg) => (
            <button
              key={asg.id}
              type="button"
              onClick={() => setSelectedAssignmentId(asg.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg shrink-0 transition-colors flex items-center gap-1.5 ${
                selectedAssignmentId === asg.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{asg.classroomName} · {asg.courseCode}</span>
              <span className="text-[10px] opacity-75 truncate max-w-[140px]">({asg.title})</span>
            </button>
          ))}
        </div>
      </div>

      {/* SEÇİLİ GÖREV DETAYI & İSTATİSTİKLER */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Toplam Sınıf Mevcudu</span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {activeStudentCount} Öğrenci
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Teslim Edilen PDF</span>
          <div className="text-xl font-bold text-emerald-600 mt-1">
            {activeSubmittedCount} Teslim
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Notlandırılmış</span>
          <div className="text-xl font-bold text-indigo-600 mt-1">
            {activeGradedCount} / {activeStudentCount}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Kâğıt Onayı Bekleyen</span>
          <div className="text-xl font-bold text-amber-600 mt-1">
            {activePaperPendingCount} Bildirim
          </div>
        </div>
      </div>

      {/* ÖĞRENCİ TESLİM VE NOTLANDIRMA TABLOSU */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {activeAssignment.classroomName} Sınıfı Öğrenci Teslim Listesi
            </h3>
            <p className="text-xs text-slate-500">
              Son Teslim: {formatTurkishDate(activeAssignment.dueDate)} 23:59 · Format: {activeAssignment.deliveryFormat === 'digital_pdf' ? 'Dijital PDF' : 'Kâğıt'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeAssignment.deliveryFormat === 'digital_pdf' && (
              <button
                type="button"
                onClick={handleDownloadClassZip}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                title="Tüm geçerli teslimleri standart isimlerle tek ZIP olarak indir"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Toplu ZIP İndir</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3">Okul No</th>
                <th className="p-3">Adı Soyadı</th>
                <th className="p-3">Teslim Durumu</th>
                <th className="p-3">Son Teslim Zamanı</th>
                <th className="p-3">Verilen Puan (100)</th>
                <th className="p-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-medium text-slate-800">{sub.schoolNumber}</td>
                  <td className="p-3 font-semibold text-slate-900">{sub.studentName}</td>
                  <td className="p-3">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                        sub.status === 'graded'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : sub.status === 'submitted'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : sub.status === 'paper_reported'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : sub.status === 'paper_confirmed'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {sub.status === 'graded'
                        ? 'Notlandırıldı'
                        : sub.status === 'submitted'
                        ? `Teslim Edildi (v${sub.submissionCount})`
                        : sub.status === 'paper_reported'
                        ? 'Kâğıt Bildirildi (Onay Bekliyor)'
                        : sub.status === 'paper_confirmed'
                        ? 'Kâğıt Onaylandı'
                        : 'Teslim Yok'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">
                    {sub.lastSubmittedAt ? formatTurkishDate(sub.lastSubmittedAt) : '-'}
                  </td>
                  <td className="p-3">
                    {sub.score !== undefined ? (
                      <span className="font-bold text-slate-900 font-mono text-sm">
                        {sub.score.toFixed(1)}
                        <span className="text-xs text-slate-400 font-normal"> / 100</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Girilmedi</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* PDF İncele Butonu (Öğretmen PDF teslimini açıp inceleyebilir ve doğrudan değerlendirmeye geçebilir) */}
                      {(sub.status === 'submitted' || sub.status === 'graded') && (
                        <button
                          type="button"
                          onClick={() => setSelectedSubForPdfPreview(sub)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold rounded text-xs flex items-center gap-1 transition-colors"
                          title="Öğrencinin teslim ettiği PDF belgesini aç ve incele"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          <span>PDF İncele</span>
                        </button>
                      )}

                      {sub.status === 'paper_reported' && (
                        <button
                          type="button"
                          onClick={() => handleConfirmPaperDelivery(sub.id)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded font-semibold text-xs flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Kâğıt Onayla</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenGradingModal(sub)}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded text-xs flex items-center gap-1 transition-colors"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>{sub.score !== undefined ? 'Notu Güncelle' : 'Not Ver'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. YENİ GÖREV DAĞITMA MODALI (RUBRİK 100 PUAN DENETİMLİ) */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Yeni Performans / Proje Görevi Dağıt
                </h3>
                <p className="text-xs text-slate-500">
                  Yetkili olduğunuz sınıflara görev atayabilir ve MEB standartlarında rubrik ölçütleri tanımlayabilirsiniz.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Yetkili Sınıf ve Ders Seçimi
                  </label>
                  <select
                    value={newTaskForm.classroomAndCourse}
                    onChange={(e) =>
                      setNewTaskForm((prev) => ({ ...prev, classroomAndCourse: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {authorizedClasses.map((ac) => (
                      <option
                        key={`${ac.classroomId}:${ac.courseId}`}
                        value={`${ac.classroomId}:${ac.courseId}`}
                      >
                        {ac.classroomName} · {ac.courseCode} - {ac.courseName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Teslim Formatı
                  </label>
                  <select
                    value={newTaskForm.deliveryFormat}
                    onChange={(e) =>
                      setNewTaskForm((prev) => ({
                        ...prev,
                        deliveryFormat: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="digital_pdf">Dijital PDF Teslimi (Maks 15 MB)</option>
                    <option value="paper">Fiziksel Kâğıt / Atölye Teslimi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Görev Başlığı
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: C# ile Nesne Yönelimli Programlama Projesi"
                  value={newTaskForm.title}
                  onChange={(e) =>
                    setNewTaskForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Görev Tanımı ve Yönerge Açıklaması
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Öğrenciden beklenen çıktı, kurallar ve yönergeler..."
                  value={newTaskForm.description}
                  onChange={(e) =>
                    setNewTaskForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Son Teslim Tarihi
                </label>
                <input
                  type="date"
                  required
                  value={newTaskForm.dueDate}
                  onChange={(e) =>
                    setNewTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* RUBRİK ÖLÇÜTLERİ BÖLÜMÜ */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Rubrik Değerlendirme Ölçütleri
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Ölçüt puanlarının toplamı tam 100 olmak zorundadır.
                    </p>
                  </div>
                  <div
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                      isSumValid
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    Toplam: {criteriaSum} / 100 Puan {isSumValid ? '✓' : '(Eksik/Fazla)'}
                  </div>
                </div>

                <div className="space-y-2">
                  {newTaskForm.criteria.map((crit) => (
                    <div key={crit.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Ölçüt Adı"
                        value={crit.name}
                        onChange={(e) => handleUpdateCriterion(crit.id, 'name', e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                      />
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={crit.maxPoints}
                        onChange={(e) => handleUpdateCriterion(crit.id, 'maxPoints', e.target.value)}
                        className="w-20 px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-center font-mono font-bold"
                      />
                      <span className="text-xs text-slate-500">Puan</span>
                      {newTaskForm.criteria.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCriterion(crit.id)}
                          className="text-red-500 hover:text-red-700 p-1 text-xs"
                          title="Ölçütü Sil"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddCriterion}
                  className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Ölçüt Satırı Ekle</span>
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={!isSumValid}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg text-white shadow-2xs ${
                    isSumValid
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  Görevi Yayımla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. 0.1 HASSASİYETİNDE NOTLANDIRMA MODALI */}
      {selectedSubForGrading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-indigo-600 uppercase">
                  {selectedSubForGrading.schoolNumber} · {selectedSubForGrading.studentName}
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Rubrik Ölçüt Bazlı Notlandırma
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubForGrading(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-900">
                  Toplam Hesaplanmış Not (0.1 Hassasiyet):
                </span>
                <span className="text-xl font-black text-indigo-700 font-mono">
                  {calculateTotalScore(
                    Object.entries(currentGradingScores).map(([criterionId, score]) => ({
                      criterionId,
                      score,
                    }))
                  ).toFixed(1)}{' '}
                  / 100
                </span>
              </div>

              {/* Her Ölçüt için Puan Girişi */}
              <div className="space-y-3">
                {activeAssignment.criteria.map((crit) => {
                  const currentScore = currentGradingScores[crit.id] ?? 0;
                  const validation = validateCriterionScore(currentScore, crit.maxPoints);

                  return (
                    <div
                      key={crit.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{crit.name}</div>
                        <div className="text-[11px] text-slate-500">Maksimum: {crit.maxPoints} Puan</div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={crit.maxPoints}
                          value={currentScore}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setCurrentGradingScores((prev) => ({ ...prev, [crit.id]: val }));
                          }}
                          className={`w-20 px-2.5 py-1.5 text-xs border rounded-lg text-center font-mono font-bold ${
                            validation.isValid ? 'border-slate-300' : 'border-red-400 bg-red-50 text-red-700'
                          }`}
                        />
                        <span className="text-xs text-slate-500">/ {crit.maxPoints}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Öğretmen Genel Değerlendirme Yorumu
                </label>
                <textarea
                  rows={2}
                  value={gradingComment}
                  onChange={(e) => setGradingComment(e.target.value)}
                  placeholder="Öğrenciye yönlendirici geribildirim..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {selectedSubForGrading.evaluationStatus === 'finalized'
                  ? '⚠️ Kesinleşmiş not değişiminde audit gerekçesi istenecektir.'
                  : 'Taslak kaydedilen notlar öğrenciye açılmaz.'}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveGrading(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg bg-slate-100 transition-colors"
                >
                  Taslak Olarak Sakla
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveGrading(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
                >
                  Kesinleştir & Onayla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. NOT DEĞİŞİKLİK GEREKÇESİ MODALI (AUDIT LOG ZORUNLULUĞU) */}
      {isGradeChangeReasonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-200 overflow-hidden">
            <div className="bg-red-50 p-4 border-b border-red-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Resmi Not Değişiklik Gerekçesi
                </h3>
                <p className="text-xs text-red-700">
                  MEB mevzuatı gereği kesinleşmiş not değişiklikleri audit günlüğüne kaydedilir.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Bu öğrencinin notu daha önce kesinleştirilmiştir. Yapılan puan değişikliği resmi audit loguna işlenecek olup yönetici denetimine açıktır. Lütfen geçerli bir gerekçe belirtiniz.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Değişiklik Gerekçesi (Zorunlu)
                </label>
                <textarea
                  rows={3}
                  required
                  value={gradeChangeReason}
                  onChange={(e) => setGradeChangeReason(e.target.value)}
                  placeholder="Örn: Öğrencinin itirazı zümre başkanlığınca incelendi, kod test senaryosu 2 için 5 puan eklendi."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGradeChangeReasonModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={!gradeChangeReason.trim()}
                  onClick={() => {
                    if (pendingScoreUpdate && gradeChangeReason.trim()) {
                      applyGradingUpdate(
                        pendingScoreUpdate.newScores,
                        pendingScoreUpdate.comment,
                        pendingScoreUpdate.isFinal,
                        gradeChangeReason.trim()
                      );
                    }
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg text-white shadow-2xs ${
                    gradeChangeReason.trim()
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-red-300 cursor-not-allowed'
                  }`}
                >
                  Gerekçeyi Onayla ve Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. PDF İNCELEME & DOĞRUDAN DEĞERLENDİRMEYE GEÇİŞ MODALI */}
      {selectedSubForPdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Başlık Çubuğu */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {selectedSubForPdfPreview.schoolNumber} · {selectedSubForPdfPreview.studentName}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500">
                    {activeAssignment.classroomName} · {activeAssignment.courseCode}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  {activeAssignment.title} — PDF Teslim İncelemesi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubForPdfPreview(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            {/* Belge Meta & Güvenlik Bilgisi */}
            <div className="p-3 bg-indigo-50/60 border-b border-indigo-100 px-6 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono font-semibold text-slate-800 flex items-center gap-1">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  {selectedSubForPdfPreview.pdfFileName ||
                    `${selectedSubForPdfPreview.schoolNumber}_${selectedSubForPdfPreview.studentName.replace(
                      /\s+/g,
                      '_'
                    )}_v1.pdf`}
                </span>
                <span className="text-slate-500">
                  Boyut: {((selectedSubForPdfPreview.fileSizeBytes || 2450000) / (1024 * 1024)).toFixed(2)} MB / 15 MB Sınırı
                </span>
                {selectedSubForPdfPreview.lastSubmittedAt && (
                  <span className="text-slate-500">
                    Teslim: {formatTurkishDate(selectedSubForPdfPreview.lastSubmittedAt)}
                  </span>
                )}
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded border border-emerald-200 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                <span>15 MB & Mime Doğrulandı</span>
              </span>
            </div>

            {/* Belge Önizleme Görüntüsü */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-100/70 space-y-4">
              {/* Simüle Edilmiş Resmi PDF Sayfası */}
              <div className="max-w-2xl mx-auto bg-white border border-slate-300 rounded-xl shadow-md p-8 text-slate-800 text-xs leading-relaxed space-y-4">
                <div className="border-b-2 border-slate-900 pb-3 text-center">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    T.C. Millî Eğitim Bakanlığı · Atatürk MTAL
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-1">
                    Bilişim Teknolojileri Alanı — Performans & Proje Teslim Raporu
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Ders: {activeAssignment.courseName} ({activeAssignment.courseCode}) · Akademik Yıl: 2026-2027
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px]">
                  <div>
                    <span className="font-semibold text-slate-600">Öğrenci Adı:</span>{' '}
                    {selectedSubForPdfPreview.studentName}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">Okul Numarası:</span>{' '}
                    {selectedSubForPdfPreview.schoolNumber}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">Sınıf Şubesi:</span>{' '}
                    {activeAssignment.classroomName}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">Sürüm:</span> v
                    {selectedSubForPdfPreview.submissionCount || 1}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1 mb-1.5">
                    1. Görev Özeti ve Algoritmik Yaklaşım
                  </h4>
                  <p className="text-slate-600 text-[11px]">
                    Bu projede &quot;{activeAssignment.title}&quot; yönergesi doğrultusunda modüler yapı, döngüler ve fonksiyon blokları kullanılarak istenen problem çözülmüştür. Uç durumlar try-catch blokları ile kontrol altına alınmış ve kullanıcı dostu arayüz tasarımı sağlanmıştır.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1 mb-1.5">
                    2. Kaynak Kod ve Çözüm Mimarisi
                  </h4>
                  <div className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto">
                    <span className="text-purple-400">
                      // Atatürk MTAL - {selectedSubForPdfPreview.studentName} ({selectedSubForPdfPreview.schoolNumber})
                    </span>
                    <br />
                    <span className="text-blue-400">using</span> System;
                    <br />
                    <span className="text-blue-400">namespace</span> OkulYonetimSistemi &#123;
                    <br />
                    &nbsp;&nbsp;<span className="text-blue-400">class</span>{' '}
                    <span className="text-yellow-400">Program</span> &#123;
                    <br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">static void</span>{' '}
                    <span className="text-green-400">Main</span>(string[] args) &#123;
                    <br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Console.WriteLine(
                    <span className="text-emerald-300">&quot;Uygulama başarıyla başlatıldı.&quot;</span>
                    );
                    <br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&#125;
                    <br />
                    &nbsp;&nbsp;&#125;
                    <br />
                    &#125;
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1 mb-1.5">
                    3. Test Sonuçları ve Doğrulama
                  </h4>
                  <p className="text-slate-600 text-[11px]">
                    Tüm fonksiyon test senaryoları çalıştırılmış, sınır değer analizleri tamamlanmış ve hatasız derlendiği teyit edilmiştir.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Sistem Doğrulaması: MEB-PERF-PDF-SECURE-2026</span>
                  <span>Sayfa 1 / 1 · Sayısal İmzalı</span>
                </div>
              </div>
            </div>

            {/* Alt Eylem Çubuğu: Doğrudan Notlandırmaya Geç */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Öğrencinin teslim ettiği PDF incelendi. Doğrudan rubrik kriterleriyle notlandırmaya geçebilirsiniz.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubForPdfPreview(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Kapat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const subToGrade = selectedSubForPdfPreview;
                    setSelectedSubForPdfPreview(null);
                    handleOpenGradingModal(subToGrade);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                >
                  <Award className="w-4 h-4" />
                  <span>Doğrudan Değerlendirmeye Geç</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
