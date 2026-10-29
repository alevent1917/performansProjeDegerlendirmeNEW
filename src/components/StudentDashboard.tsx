/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Öğrenci Paneli (Student Dashboard) - Aşama 3 & 4
 * Görev takibi, PDF yükleme (15 MB sınır), kâğıt teslim bildirimi, rubrik karnesi ve ek süre talebi.
 */

import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Clock,
  CheckCircle,
  AlertCircle,
  FileCheck,
  Calendar,
  Send,
  Eye,
  ChevronRight,
  Info,
  Award,
} from 'lucide-react';
import { formatTurkishDate, validateStudentPdfFile } from '../utils/validation';

export interface StudentTaskViewItem {
  id: string;
  taskTitle: string;
  courseName: string;
  courseCode: string;
  teacherName: string;
  dueDate: string;
  deliveryFormat: 'digital_pdf' | 'paper';
  status: 'not_submitted' | 'submitted' | 'late_submitted' | 'paper_reported' | 'paper_confirmed' | 'graded';
  description: string;
  submissionCount: number;
  lastSubmittedAt?: string;
  lastFileName?: string;
  paperReportedAt?: string;
  paperConfirmedAt?: string;
  score?: number;
  evaluationComment?: string;
  evaluationStatus?: 'draft' | 'finalized';
  criteria?: {
    id: string;
    name: string;
    maxPoints: number;
    awardedPoints?: number;
    comment?: string;
  }[];
}

export interface StudentDashboardProps {
  studentName: string;
  schoolNumber: string;
  classroomName: string;
  tasks?: StudentTaskViewItem[];
  onSubmitPdf?: (taskId: string, file: File) => Promise<void> | void;
  onReportPaper?: (taskId: string) => Promise<void> | void;
  onRequestExtension?: (taskId: string, reason: string, dueDate: string) => Promise<void> | void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  studentName,
  schoolNumber,
  classroomName,
  tasks: propTasks,
  onSubmitPdf,
  onReportPaper,
  onRequestExtension,
}) => {
  // Örnek öğrenci görevleri (Props varsa props kullanılır, yoksa yerel state)
  const [localTasks, setLocalTasks] = useState<StudentTaskViewItem[]>([
    {
      id: 'task-1',
      taskTitle: 'Döngüler, Diziler ve Fonksiyonlar Uygulaması',
      courseName: 'Programlama Temelleri',
      courseCode: 'PRG101',
      teacherName: 'Hasan Hoca (Yetkili Öğretmen)',
      dueDate: '2026-11-15T23:59:00Z',
      deliveryFormat: 'digital_pdf',
      status: 'submitted',
      description: 'C# veya Python dilinde döngüler, çok boyutlu diziler ve modüler fonksiyon yapıları kullanılarak bir öğrenci bilgi yönetim konsol uygulaması geliştirilecek ve teknik rapor PDF olarak teslim edilecektir.',
      submissionCount: 1,
      lastSubmittedAt: '2026-10-27T16:40:00Z',
      lastFileName: '1042_Ali_Demir_Donguler_v1.pdf',
      criteria: [
        { id: 'c1', name: 'Algoritmik Doğruluk ve Mantıksal Akış', maxPoints: 30 },
        { id: 'c2', name: 'Kodlama Standartları ve Yorum Satırları', maxPoints: 20 },
        { id: 'c3', name: 'Hata Yakalama ve Uç Durum Kontrolleri', maxPoints: 25 },
        { id: 'c4', name: 'Teknik Rapor Formatı ve Şablon Uyumu', maxPoints: 25 },
      ],
    },
    {
      id: 'task-2',
      taskTitle: 'VLAN ve Alt Ağ Segmentasyonu Tasarım Raporu',
      courseName: 'Ağ Sistemleri ve Anahtarlama',
      courseCode: 'NET201',
      teacherName: 'Hasan Hoca (Yetkili Öğretmen)',
      dueDate: '2026-10-20T23:59:00Z',
      deliveryFormat: 'digital_pdf',
      status: 'graded',
      description: 'Cisco Packet Tracer üzerinde 3 katlı bir okul binası için VLAN 10, 20 ve 30 yapılandırması simüle edilerek tasarım şeması ve test çıktıları raporda sunulacaktır.',
      submissionCount: 1,
      lastSubmittedAt: '2026-10-19T21:10:00Z',
      lastFileName: '1042_Ali_Demir_VLAN_v1.pdf',
      score: 93.5,
      evaluationStatus: 'finalized',
      evaluationComment: 'Tasarım şeması ve yönlendirme tabloları çok başarılı hazırlanmış. Tebrikler Ali.',
      criteria: [
        { id: 'c21', name: 'Topoloji ve Adresleme Planı', maxPoints: 25, awardedPoints: 25.0, comment: 'Eksiksiz subnetting.' },
        { id: 'c22', name: 'VLAN ve Trunk Yapılandırması', maxPoints: 35, awardedPoints: 33.5, comment: 'Trunk izinleri başarılı.' },
        { id: 'c23', name: 'DHCP ve Yönlendirme Testleri', maxPoints: 20, awardedPoints: 18.0, comment: 'Ping testleri eklenmiş.' },
        { id: 'c24', name: 'Rapor Düzeni ve Görseller', maxPoints: 20, awardedPoints: 17.0, comment: 'Ekran görüntüleri net.' },
      ],
    },
    {
      id: 'task-3',
      taskTitle: 'Ağ Kablolama ve Patch Panel Montaj Pratiği',
      courseName: 'Ağ Sistemleri ve Anahtarlama',
      courseCode: 'NET201',
      teacherName: 'Hasan Hoca (Yetkili Öğretmen)',
      dueDate: '2026-11-25T17:00:00Z',
      deliveryFormat: 'paper',
      status: 'not_submitted',
      description: 'Atölyede gerçekleştirilen T568B standartlarında UTP Cat6 kablo sonlandırma ve test formu çıktısı alınıp elden öğretmene teslim edilecektir.',
      submissionCount: 0,
      criteria: [
        { id: 'c31', name: 'Standart T568B Renk Sıralaması', maxPoints: 40 },
        { id: 'c32', name: 'Kablo Soyma ve Soketleme Kalitesi', maxPoints: 30 },
        { id: 'c33', name: 'Kablo Test Cihazı Doğrulaması', maxPoints: 30 },
      ],
    },
  ]);

  const tasks = propTasks && propTasks.length > 0 ? propTasks : localTasks;

  // Modal Durumları
  const [selectedTaskForUpload, setSelectedTaskForUpload] = useState<StudentTaskViewItem | null>(null);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<StudentTaskViewItem | null>(null);
  const [selectedTaskForExtension, setSelectedTaskForExtension] = useState<StudentTaskViewItem | null>(null);

  // Yükleme form durumu
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Ek süre talep formu
  const [extensionReason, setExtensionReason] = useState('');
  const [extensionDueDate, setExtensionDueDate] = useState('');
  const [extensionSuccess, setExtensionSuccess] = useState(false);

  // Sekmeler
  const [activeTab, setActiveTab] = useState<'assignments' | 'graded'>('assignments');

  // PDF Dosya Seçimi
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(false);
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const validation = validateStudentPdfFile(file);
    if (!validation.isValid) {
      setUploadError(validation.error || 'Geçersiz dosya.');
      setUploadFile(null);
      return;
    }

    setUploadFile(file);
  };

  // PDF Yükleme Onayı (15 MB Doğrulaması ve Versiyonlama)
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForUpload || !uploadFile) return;

    // 15 MB Sınırı ve PDF tür kontrolü
    const validation = validateStudentPdfFile(uploadFile);
    if (!validation.isValid) {
      setUploadError(validation.error || 'Geçersiz dosya boyutu veya biçimi.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    setTimeout(() => {
      setIsUploading(false);
      setUploadSuccess(true);

      const nextVersion = selectedTaskForUpload.submissionCount + 1;
      const generatedName = `${schoolNumber}_${studentName.replace(/\s+/g, '_')}_v${nextVersion}.pdf`;

      if (onSubmitPdf) {
        onSubmitPdf(selectedTaskForUpload.id, uploadFile);
      }

      setLocalTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTaskForUpload.id
            ? {
                ...t,
                status: 'submitted',
                submissionCount: nextVersion,
                lastSubmittedAt: new Date().toISOString(),
                lastFileName: generatedName,
              }
            : t
        )
      );

      setTimeout(() => {
        setSelectedTaskForUpload(null);
        setUploadFile(null);
        setUploadSuccess(false);
      }, 1500);
    }, 1000);
  };

  // Kâğıt Teslim Bildirimi
  const handleReportPaperDelivery = (taskId: string) => {
    if (onReportPaper) {
      onReportPaper(taskId);
    }

    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'paper_reported',
              paperReportedAt: new Date().toISOString(),
            }
          : t
      )
    );
  };

  // Ek Süre Talebi Gönderimi
  const handleExtensionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForExtension || !extensionReason.trim() || !extensionDueDate) return;

    if (onRequestExtension) {
      onRequestExtension(selectedTaskForExtension.id, extensionReason.trim(), extensionDueDate);
    }

    setExtensionSuccess(true);
    setTimeout(() => {
      setSelectedTaskForExtension(null);
      setExtensionReason('');
      setExtensionDueDate('');
      setExtensionSuccess(false);
    }, 1500);
  };

  const pendingAssignments = tasks.filter((t) => t.status !== 'graded');
  const gradedAssignments = tasks.filter((t) => t.status === 'graded');

  return (
    <div className="space-y-6">
      {/* Öğrenci Başlık Bilgi Kartı */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                Öğrenci Paneli
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-medium text-slate-600">Sınıf: {classroomName}</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-medium text-slate-600">Okul No: {schoolNumber}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Hoş Geldin, {studentName}
            </h2>
            <p className="text-xs text-slate-600">
              Bu ekrandan sana atanan performans görevlerini takip edebilir, 15 MB sınırında PDF yükleyebilir veya kâğıt teslimini bildirebilirsin.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('assignments')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'assignments'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Aktif Görevler ({pendingAssignments.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('graded')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'graded'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Notlarım & Karneler ({gradedAssignments.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* AKTİF GÖREVLER LİSTESİ */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingAssignments.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {task.courseCode} · {task.courseName}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-2">
                        {task.taskTitle}
                      </h3>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2 py-1 rounded shrink-0 ${
                        task.status === 'submitted'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : task.status === 'paper_reported'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : task.status === 'paper_confirmed'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : task.status === 'graded'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {task.status === 'submitted'
                        ? 'Teslim Edildi'
                        : task.status === 'paper_reported'
                        ? 'Kâğıt Teslim Bildirildi'
                        : task.status === 'paper_confirmed'
                        ? 'Kâğıt Teslim Alındı'
                        : task.status === 'graded'
                        ? 'Notlandırıldı'
                        : 'Teslim Bekleniyor'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                    {task.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Son Teslim:</span>
                      <span className="font-medium text-slate-800">
                        {formatTurkishDate(task.dueDate)} 23:59
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Format:</span>
                      <span className="font-medium text-slate-800">
                        {task.deliveryFormat === 'digital_pdf' ? 'Dijital PDF (Maks 15 MB)' : 'Fiziksel Kâğıt'}
                      </span>
                    </div>
                  </div>

                  {task.lastFileName && (
                    <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-slate-700 truncate">{task.lastFileName}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 shrink-0">v{task.submissionCount}</span>
                    </div>
                  )}

                  {task.status === 'paper_confirmed' && (
                    <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-semibold text-blue-900">
                          Fiziksel teslim öğretmeninizce onaylandı.
                        </span>
                      </div>
                      {task.paperConfirmedAt && (
                        <span className="text-[11px] text-blue-700 font-mono">
                          {formatTurkishDate(task.paperConfirmedAt)}
                        </span>
                      )}
                    </div>
                  )}

                  {task.status === 'paper_reported' && (
                    <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-semibold text-amber-900">
                          Kâğıt teslimi bildirildi. Öğretmen onayı bekleniyor.
                        </span>
                      </div>
                      {task.paperReportedAt && (
                        <span className="text-[11px] text-amber-700 font-mono">
                          {formatTurkishDate(task.paperReportedAt)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTaskForDetails(task)}
                    className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Ölçütleri Gör ({task.criteria?.length || 0})</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {task.deliveryFormat === 'digital_pdf' ? (
                      <button
                        type="button"
                        onClick={() => setSelectedTaskForUpload(task)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{task.submissionCount > 0 ? 'Yeni Sürüm Yükle' : 'PDF Yükle'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={
                          task.status === 'paper_reported' ||
                          task.status === 'paper_confirmed' ||
                          task.status === 'graded'
                        }
                        onClick={() => handleReportPaperDelivery(task.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                          task.status === 'paper_confirmed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 cursor-default'
                            : task.status === 'paper_reported'
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {task.status === 'paper_confirmed'
                            ? 'Kâğıt Onaylandı'
                            : task.status === 'paper_reported'
                            ? 'Bildirildi'
                            : 'Kâğıt Teslim Bildir'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedTaskForExtension(task)}
                      className="px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg font-medium"
                      title="Ek süre talep et"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOTLAR VE RESMİ KARNELER */}
      {activeTab === 'graded' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Değerlendirilmiş Performans & Proje Görevleri
                </h3>
                <p className="text-xs text-slate-500">
                  Öğretmeniniz tarafından 0.1 hassasiyetinde notlandırılmış ve kesinleştirilmiş karneler.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3">Ders & Görev</th>
                    <th className="p-3">Öğretmen</th>
                    <th className="p-3">Teslim Tarihi</th>
                    <th className="p-3">Puan (100 Üzerinden)</th>
                    <th className="p-3 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradedAssignments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{item.taskTitle}</div>
                        <div className="text-slate-500 text-[11px]">
                          {item.courseCode} · {item.courseName}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">{item.teacherName}</td>
                      <td className="p-3 text-slate-600">
                        {item.lastSubmittedAt ? formatTurkishDate(item.lastSubmittedAt) : '-'}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200 text-xs">
                          <Award className="w-3.5 h-3.5" />
                          <span>{item.score?.toFixed(1)} / 100</span>
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedTaskForDetails(item)}
                          className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs"
                        >
                          Ölçüt Karnesini İncele
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 1. PDF YÜKLEME MODALI (15 MB KONTROLÜ) */}
      {selectedTaskForUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  PDF Teslim Yükleme
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-sm">
                  {selectedTaskForUpload.taskTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskForUpload(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl p-6 text-center space-y-3 transition-colors bg-slate-50">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <label
                    htmlFor="pdf-upload"
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    Bilgisayarından PDF Dosyası Seç
                    <input
                      id="pdf-upload"
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Yalnızca PDF formatı kabul edilir. Maksimum boyut: 15 MB.
                  </p>
                </div>

                {uploadFile && (
                  <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs flex items-center justify-between text-left">
                    <div className="truncate mr-2">
                      <span className="font-semibold text-slate-900 truncate block">
                        {uploadFile.name}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    <span className="text-emerald-600 font-semibold shrink-0">✓ Uygun</span>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>PDF tesliminiz başarıyla sisteme kaydedildi! Sürüm güncellendi.</span>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-lg text-slate-600 text-[11px] space-y-1">
                <div className="font-semibold text-slate-800">Akademik Güvenlik Notu:</div>
                <p>
                  Yüklediğiniz her dosya versiyonlanarak saklanır. Daha önce yüklenmiş sürümler denetim amacıyla silinmez.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForUpload(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading || uploadSuccess}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg text-white shadow-2xs flex items-center gap-1.5 ${
                    !uploadFile || isUploading || uploadSuccess
                      ? 'bg-indigo-300 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isUploading ? 'Yükleniyor...' : 'Sisteme Teslim Et'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. RUBRİK VE ÖLÇÜT KARNESİ MODALI */}
      {selectedTaskForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-indigo-600 uppercase">
                  {selectedTaskForDetails.courseName}
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedTaskForDetails.taskTitle} · Değerlendirme Karnesi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskForDetails(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Not Durumu */}
              {selectedTaskForDetails.score !== undefined ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-emerald-800">
                      Kesinleşmiş Değerlendirme Puanı
                    </span>
                    <div className="text-2xl font-black text-emerald-900 mt-0.5">
                      {selectedTaskForDetails.score.toFixed(1)} / 100
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-white text-emerald-800 border border-emerald-300 rounded-lg shadow-2xs">
                    Kesinleşti
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  Bu görev henüz öğretmeniniz tarafından kesinleştirilmemiştir. Ölçüt puanları değerlendirme süreci tamamlandığında burada açılacaktır.
                </div>
              )}

              {/* Öğretmen Yorumu */}
              {selectedTaskForDetails.evaluationComment && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="font-bold text-slate-900 block mb-1">
                    Öğretmen Değerlendirme Yorumu:
                  </span>
                  <p className="text-slate-700 italic">
                    &quot;{selectedTaskForDetails.evaluationComment}&quot;
                  </p>
                </div>
              )}

              {/* Ölçütler Tablosu */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800">
                  Rubrik Değerlendirme Ölçütleri Dağılımı
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-medium">
                    <tr>
                      <th className="p-2.5">Ölçüt Adı</th>
                      <th className="p-2.5 text-center">Maks Puan</th>
                      {selectedTaskForDetails.score !== undefined && (
                        <>
                          <th className="p-2.5 text-center">Verilen Puan</th>
                          <th className="p-2.5">Açıklama</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedTaskForDetails.criteria?.map((crit) => (
                      <tr key={crit.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium text-slate-900">{crit.name}</td>
                        <td className="p-2.5 text-center font-mono text-slate-700">
                          {crit.maxPoints}
                        </td>
                        {selectedTaskForDetails.score !== undefined && (
                          <>
                            <td className="p-2.5 text-center font-bold font-mono text-indigo-700">
                              {crit.awardedPoints !== undefined ? crit.awardedPoints.toFixed(1) : '-'}
                            </td>
                            <td className="p-2.5 text-slate-600 text-[11px]">
                              {crit.comment || '-'}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTaskForDetails(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. EK SÜRE TALEP MODALI */}
      {selectedTaskForExtension && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Ek Süre Talep Et
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">
                  {selectedTaskForExtension.taskTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskForExtension(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExtensionSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Talep Edilen Yeni Son Teslim Tarihi
                </label>
                <input
                  type="date"
                  required
                  value={extensionDueDate}
                  onChange={(e) => setExtensionDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mazeret ve Talep Gerekçesi
                </label>
                <textarea
                  rows={3}
                  required
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="Sağlık raporu, donanım arızası vb. gerekçenizi açıklayınız..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {extensionSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Ek süre talebiniz ders öğretmenine iletildi.</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForExtension(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={extensionSuccess}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
                >
                  Talebi Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
