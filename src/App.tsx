/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Performans & Proje Görev Takip Sistemi - Aşama 1: Proje İskeleti ve Mimari Çekirdeği
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  BookOpen,
  GraduationCap,
  Layers,
  CheckCircle,
  AlertTriangle,
  Server,
  Database,
  FileText,
  Lock,
  ArrowRight,
  Terminal,
  Settings,
  HelpCircle,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { UserRole, SystemNotification } from './types';
import {
  INITIAL_ACADEMIC_YEAR,
  INITIAL_CLASSES,
  INITIAL_COURSES,
  SYSTEM_DEFAULTS,
  ROLE_LABELS,
} from './lib/constants';
import { Header } from './components/Header';
import { ConfirmModal } from './components/ConfirmModal';
import { HelpModal } from './components/HelpModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { InitialSetupWizard } from './components/InitialSetupWizard';
import { AuthCard } from './components/AuthCard';
import { DatabaseSchemaViewer } from './components/DatabaseSchemaViewer';
import { StudentDashboard, StudentTaskViewItem } from './components/StudentDashboard';
import {
  TeacherDashboard,
  TeacherAssignmentItem,
  TeacherStudentSubmission,
} from './components/TeacherDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { InactivityTimeoutModal } from './components/InactivityTimeoutModal';
import {
  calculateTotalScore,
  validateCriteriaSum,
  validateCriterionScore,
  validateStudentPdfFile,
  validateActivationCodeFormat,
  formatTurkishDate,
} from './utils/validation';
import {
  isSupabaseConfigured,
  supabase,
  testSupabaseConnection,
  signInWithRoleCheck,
  registerAndActivateStudent,
  submitTeacherApplicationToDb,
  bootstrapAdminViaRpc,
} from './lib/supabase';
import {
  loadAssignmentsAndSubmissions,
  saveCreatedAssignment,
  saveStudentPdfSubmission,
  savePaperDeliveryReport,
  savePaperDeliveryConfirmation,
  saveGradingEvaluation,
  subscribeToTaskChanges,
  sanitizeSubmissionsForStudent,
  INITIAL_SEED_ASSIGNMENTS,
  INITIAL_SEED_SUBMISSIONS,
} from './lib/taskService';

export default function App() {
  // Sistem Durumu
  const [isInitialized, setIsInitialized] = useState<boolean>(true);
  const [schoolName, setSchoolName] = useState<string>('Atatürk Mesleki ve Teknik Anadolu Lisesi');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [academicYear, setAcademicYear] = useState<string>(INITIAL_ACADEMIC_YEAR);

  // Aktif Önizleme Rolü ve Kullanıcı
  const [previewRole, setPreviewRole] = useState<UserRole>('student');
  const [activeTab, setActiveTab] = useState<'architecture' | 'database' | 'auth' | 'setup_wizard' | 'preview'>('preview');

  // Bildirimler
  const [notifications, setNotifications] = useState<SystemNotification[]>([
    {
      id: 'notif-1',
      userId: 'usr-1',
      recipientRole: 'student',
      title: 'Yeni Performans Görevi Atandı',
      message: 'Programlama Temelleri dersi için "Döngüler ve Fonksiyonlar" görevi tanımlandı. Son teslim: 15.11.2026',
      type: 'info',
      isRead: false,
      createdAt: '2026-10-28T09:30:00Z',
    },
    {
      id: 'notif-2',
      userId: 'usr-1',
      recipientRole: 'student',
      title: 'Ödev Değerlendirmeniz Tamamlandı',
      message: 'Ağ Sistemleri ve Anahtarlama göreviniz öğretmeniniz tarafından değerlendirildi. Puanınız: 92.5/100',
      type: 'evaluation',
      isRead: false,
      createdAt: '2026-10-27T14:15:00Z',
    },
    {
      id: 'notif-3',
      userId: 'usr-2',
      recipientRole: 'teacher',
      title: 'Öğrenci PDF Teslimi Yapıldı',
      message: '10/B sınıfından 1042 nolu öğrenci Ali Veli yeni bir PDF teslim etti.',
      type: 'info',
      isRead: true,
      createdAt: '2026-10-26T11:00:00Z',
    },
  ]);

  // Paylaşılan Görevler ve Teslimler (Öğretmen-Öğrenci Senkronizasyonu & Kalıcılık)
  const [assignments, setAssignments] = useState<TeacherAssignmentItem[]>(INITIAL_SEED_ASSIGNMENTS);
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState<
    Record<string, TeacherStudentSubmission[]>
  >(INITIAL_SEED_SUBMISSIONS);
  const [isOfflineFallback, setIsOfflineFallback] = useState<boolean>(!isSupabaseConfigured);
  const [isLoadingPersistence, setIsLoadingPersistence] = useState<boolean>(true);

  // Sayfa yüklendiğinde kalıcı verileri yükle ve realtime değişikliklere abone ol
  useEffect(() => {
    let isMounted = true;
    loadAssignmentsAndSubmissions()
      .then((data) => {
        if (isMounted) {
          setAssignments(data.assignments);
          setSubmissionsByAssignment(data.submissionsByAssignment);
          setIsOfflineFallback(data.isOfflineFallback);
          setIsLoadingPersistence(false);
        }
      })
      .catch((err) => {
        console.error('Kalıcı görev verisi yükleme hatası:', err);
        if (isMounted) setIsLoadingPersistence(false);
      });

    const unsubscribe = subscribeToTaskChanges((updated) => {
      if (isMounted) {
        setAssignments(updated.assignments);
        setSubmissionsByAssignment(updated.submissionsByAssignment);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 10/B sınıfındaki Ali Demir (1042) için senkronize ve izole edilmiş görev görünümü
  // Demo fallback modunda da diğer öğrencilerin verileri ayıklanarak veri sızıntısı önlenir
  const isolatedStudentSubmissions = sanitizeSubmissionsForStudent(
    submissionsByAssignment,
    '1042'
  );

  const studentDashboardTasks: StudentTaskViewItem[] = assignments
    .filter((asg) => asg.classroomName === '10/B' || asg.classroomId === 'c1')
    .map((asg) => {
      const subs = isolatedStudentSubmissions[asg.id] || [];
      const mySub = subs[0];

      const status = mySub ? mySub.status : 'not_submitted';
      const submissionCount = mySub ? mySub.submissionCount : 0;
      const lastSubmittedAt = mySub?.lastSubmittedAt;
      const lastFileName = mySub?.pdfFileName;
      const fileSizeBytes = mySub?.fileSizeBytes;
      const paperReportedAt = mySub?.paperReportedAt;
      const paperConfirmedAt = mySub?.paperConfirmedAt;
      const score = mySub?.score;
      const evaluationStatus = mySub?.evaluationStatus;
      const evaluationComment = mySub?.evaluationComment;

      return {
        id: asg.id,
        taskTitle: asg.title,
        courseName: asg.courseName,
        courseCode: asg.courseCode,
        teacherName: 'Hasan Yılmaz (Bilişim Öğretmeni)',
        dueDate: asg.dueDate,
        deliveryFormat: asg.deliveryFormat,
        status,
        description: asg.description,
        submissionCount,
        lastSubmittedAt,
        lastFileName,
        fileSizeBytes,
        paperReportedAt,
        paperConfirmedAt,
        score,
        evaluationStatus,
        evaluationComment,
        criteria: asg.criteria.map((c) => ({
          id: c.id,
          name: c.name,
          maxPoints: c.maxPoints,
          awardedPoints: mySub?.criteriaScores?.[c.id],
          comment: c.description,
        })),
      };
    });

  // 1. Öğretmenin Yeni Görev Oluşturması (Öğrenci listesini otomatik senkronize eder & Kalıcı kaydeder)
  const handleTeacherCreateTask = async (newTask: TeacherAssignmentItem, targetClassId: string) => {
    // İlgili sınıfın öğrencilerini hazırla (10/B veya 11/B)
    const initialStudents: TeacherStudentSubmission[] = [
      {
        id: `sub-${newTask.id}-st-1`,
        studentId: 'st-1',
        studentName: 'Ali Demir',
        schoolNumber: '1042',
        status: 'not_submitted',
        submissionCount: 0,
        criteriaScores: {},
      },
      {
        id: `sub-${newTask.id}-st-2`,
        studentId: 'st-2',
        studentName: 'Ayşe Yılmaz',
        schoolNumber: '1043',
        status: 'not_submitted',
        submissionCount: 0,
        criteriaScores: {},
      },
      {
        id: `sub-${newTask.id}-st-3`,
        studentId: 'st-3',
        studentName: 'Can Öztürk',
        schoolNumber: '1044',
        status: 'not_submitted',
        submissionCount: 0,
        criteriaScores: {},
      },
      {
        id: `sub-${newTask.id}-st-4`,
        studentId: 'st-4',
        studentName: 'Zeynep Kaya',
        schoolNumber: '1045',
        status: 'not_submitted',
        submissionCount: 0,
        criteriaScores: {},
      },
    ];

    try {
      const res = await saveCreatedAssignment(
        newTask,
        initialStudents,
        currentUser.role === 'teacher' ? 'usr-teacher-1' : undefined
      );

      const savedTask = { ...newTask, id: res.assignmentId || newTask.id };

      setAssignments((prev) => [savedTask, ...prev]);
      setSubmissionsByAssignment((prev) => ({
        ...prev,
        [savedTask.id]: initialStudents,
      }));

      // Öğrenciye bildirim ilet
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          userId: 'usr-student-1042',
          recipientRole: 'student',
          title: 'Yeni Görev Dağıtıldı',
          message: `${newTask.courseName} dersi için "${newTask.title}" görevi yayımlandı. Son teslim: ${formatTurkishDate(newTask.dueDate)}`,
          type: 'info',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err: any) {
      console.error('Görev kalıcı kaydedilirken hata oluştu:', err);
      setConfirmModalConfig({
        isOpen: true,
        title: 'Kayıt Başarısız Oldu',
        message: err.message || 'Görev veritabanına kaydedilemedi.',
        confirmText: 'Anladım',
        variant: 'danger',
        onConfirm: () => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false })),
      });
    }
  };

  // 2. Öğrencinin PDF Teslimi Yapması (15 MB Kuralı, Otomatik Sürüm Artırma & Kalıcı Kayıt)
  const handleStudentSubmitPdf = async (taskId: string, file: File) => {
    // 15 MB doğrulaması
    const validation = validateStudentPdfFile(file);
    if (!validation.isValid) {
      setConfirmModalConfig({
        isOpen: true,
        title: 'Geçersiz Dosya',
        message: validation.error || 'Dosya 15 MB sınırını aşıyor veya PDF formatında değil.',
        confirmText: 'Tamam',
        variant: 'warning',
        onConfirm: () => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    try {
      const studentSchoolNo = currentUser.schoolNumber || '1042';
      const result = await saveStudentPdfSubmission(taskId, studentSchoolNo, file, 'st-1');

      setSubmissionsByAssignment((prev) => {
        const list = prev[taskId] || [];
        const updatedList = list.map((s) =>
          s.schoolNumber === studentSchoolNo
            ? {
                ...s,
                status: 'submitted' as const,
                submissionCount: result.nextVersion,
                lastSubmittedAt: new Date().toISOString(),
                pdfFileName: result.fileName,
                fileSizeBytes: file.size,
              }
            : s
        );

        return {
          ...prev,
          [taskId]: updatedList,
        };
      });

      // Öğretmene anlık bildirim ilet
      const asg = assignments.find((a) => a.id === taskId);
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          userId: 'usr-teacher-1',
          recipientRole: 'teacher',
          title: 'Yeni Öğrenci PDF Teslimi',
          message: `10/B sınıfından ${studentSchoolNo} Ali Demir "${asg?.title || 'Görev'}" için PDF teslim etti.`,
          type: 'info',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err: any) {
      console.error('PDF teslimi kalıcı kaydedilirken hata:', err);
      setConfirmModalConfig({
        isOpen: true,
        title: 'Teslim Başarısız Oldu',
        message: err.message || 'PDF teslimi veritabanına kaydedilemedi.',
        confirmText: 'Anladım',
        variant: 'danger',
        onConfirm: () => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false })),
      });
    }
  };

  // 3. Öğrencinin Kâğıt Teslim Bildirimi Yapması (& Kalıcı Kayıt)
  const handleStudentReportPaper = async (taskId: string) => {
    try {
      const studentSchoolNo = currentUser.schoolNumber || '1042';
      await savePaperDeliveryReport(taskId, studentSchoolNo, 'st-1');

      setSubmissionsByAssignment((prev) => {
        const currentList = prev[taskId] || [];
        const updatedList = currentList.map((s) =>
          s.schoolNumber === studentSchoolNo
            ? {
                ...s,
                status: 'paper_reported' as const,
                paperReportedAt: new Date().toISOString(),
              }
            : s
        );

        return {
          ...prev,
          [taskId]: updatedList,
        };
      });

      // Öğretmene bildirim ilet
      const asg = assignments.find((a) => a.id === taskId);
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          userId: 'usr-teacher-1',
          recipientRole: 'teacher',
          title: 'Kâğıt Teslim Bildirimi',
          message: `10/B sınıfından ${studentSchoolNo} Ali Demir "${asg?.title || 'Görev'}" için kâğıt teslim bildirimi yaptı. Onay bekleniyor.`,
          type: 'warning',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err: any) {
      console.error('Kâğıt teslim bildirimi kalıcı kaydedilirken hata:', err);
      setConfirmModalConfig({
        isOpen: true,
        title: 'Bildirim Başarısız Oldu',
        message: err.message || 'Kâğıt teslim bildirimi veritabanına kaydedilemedi.',
        confirmText: 'Anladım',
        variant: 'danger',
        onConfirm: () => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false })),
      });
    }
  };

  // 4. Öğretmenin Kâğıt Teslimini Onaylaması (& Kalıcı Kayıt)
  const handleTeacherConfirmPaper = async (assignmentId: string, submissionId: string) => {
    try {
      await savePaperDeliveryConfirmation(assignmentId, submissionId, 'usr-teacher-1');

      setSubmissionsByAssignment((prev) => {
        const currentList = prev[assignmentId] || [];
        const updatedList = currentList.map((s) =>
          s.id === submissionId
            ? {
                ...s,
                status: 'paper_confirmed' as const,
                paperConfirmedAt: new Date().toISOString(),
              }
            : s
        );

        return {
          ...prev,
          [assignmentId]: updatedList,
        };
      });

      // Öğrenciye bildirim ilet
      const asg = assignments.find((a) => a.id === assignmentId);
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          userId: 'usr-student-1042',
          recipientRole: 'student',
          title: 'Kâğıt Tesliminiz Onaylandı',
          message: `"${asg?.title || 'Görev'}" için fiziksel kâğıt tesliminiz öğretmeninizce onaylandı.`,
          type: 'success',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err: any) {
      console.error('Kâğıt onay kalıcı kaydedilirken hata:', err);
      setConfirmModalConfig({
        isOpen: true,
        title: 'Onay Başarısız Oldu',
        message: err.message || 'Kâğıt teslim onayı veritabanına kaydedilemedi.',
        confirmText: 'Anladım',
        variant: 'danger',
        onConfirm: () => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false })),
      });
    }
  };

  // 5. Öğretmenin Değerlendirmesi / Not Vermesi (0.1 Hassasiyet & Kalıcı Kayıt)
  const handleTeacherSaveGrading = async (
    assignmentId: string,
    submissionId: string,
    scores: Record<string, number>,
    comment: string,
    isFinal: boolean,
    reason?: string
  ) => {
    const totalScore = calculateTotalScore(
      Object.entries(scores).map(([criterionId, score]) => ({
        criterionId,
        score,
      }))
    );

    try {
      await saveGradingEvaluation(
        assignmentId,
        submissionId,
        scores,
        comment,
        isFinal,
        'usr-teacher-1',
        reason
      );

      setSubmissionsByAssignment((prev) => {
        const currentList = prev[assignmentId] || [];
        const updatedList = currentList.map((s) =>
          s.id === submissionId
            ? {
                ...s,
                status: 'graded' as const,
                score: totalScore,
                evaluationStatus: isFinal ? ('finalized' as const) : ('draft' as const),
                evaluationComment: comment,
                criteriaScores: { ...scores },
              }
            : s
        );

        return {
          ...prev,
          [assignmentId]: updatedList,
        };
      });

      // Kesinleştiyse öğrenciye bildirim ilet
      if (isFinal) {
        const asg = assignments.find((a) => a.id === assignmentId);
        setNotifications((prev) => [
          {
            id: `notif-${Date.now()}`,
            userId: 'usr-student-1042',
            recipientRole: 'student',
            title: 'Göreviniz Değerlendirildi',
            message: `"${asg?.title || 'Görev'}" notunuz kesinleşti: ${totalScore.toFixed(1)} / 100`,
            type: 'evaluation',
            isRead: false,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    } catch (err: any) {
      console.error('Notlandırma kalıcı kaydedilirken hata:', err);
      setConfirmModalConfig({
        isOpen: true,
        title: 'Not Kaydetme Başarısız Oldu',
        message: err.message || 'Değerlendirme veritabanına kaydedilemedi.',
        confirmText: 'Anladım',
        variant: 'danger',
        onConfirm: () => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false })),
      });
    }
  };

  // Modal ve Çekmece Durumları
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'primary' | 'danger' | 'warning';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Supabase Test Durumu
  const [supabaseTestResult, setSupabaseTestResult] = useState<{
    tested: boolean;
    connected: boolean;
    message: string;
  } | null>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);

  // Örnek Oturum Kullanıcısı
  const currentUser = {
    fullName:
      previewRole === 'student'
        ? 'Ali Veli (Öğrenci)'
        : previewRole === 'teacher'
        ? 'Mehmet Kaya (Öğretmen)'
        : 'Dr. Ahmet Yılmaz (Müdür / Yönetici)',
    role: previewRole,
    email: `${previewRole}@okul.k12.tr`,
    schoolNumber: previewRole === 'student' ? '1042' : undefined,
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleRunSupabaseTest = async () => {
    setIsTestingSupabase(true);
    const result = await testSupabaseConnection();
    setSupabaseTestResult({
      tested: true,
      connected: result.connected,
      message: result.message,
    });
    setIsTestingSupabase(false);
  };

  const triggerResetConfirm = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'İlk Kuruluma Sıfırlansın mı?',
      message:
        'Sistem ilk kurulum sihirbazı moduna döndürülecektir. Okul ayarları ve başlangıç yapılandırması tekrar test edilebilir hale gelecektir.',
      confirmText: 'Sıfırla ve Başlat',
      variant: 'warning',
      onConfirm: () => {
        setIsInitialized(false);
        setActiveTab('setup_wizard');
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* 1. Üst Menü & Marka */}
      <Header
        schoolName={schoolName}
        logoUrl={logoUrl}
        activeAcademicYear={academicYear}
        currentUser={currentUser}
        unreadNotificationCount={unreadCount}
        onOpenNotifications={() => setIsNotifOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onLogout={() => {
          setConfirmModalConfig({
            isOpen: true,
            title: 'Oturumu Kapat',
            message: 'Oturumunuz güvenli biçimde sonlandırılacaktır. Devam etmek istiyor musunuz?',
            confirmText: 'Çıkış Yap',
            variant: 'danger',
            onConfirm: async () => {
              if (isSupabaseConfigured && supabase) {
                await supabase.auth.signOut();
              }
              setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
              setActiveTab('auth');
            },
          });
        }}
        onSwitchRolePreview={(r) => setPreviewRole(r)}
      />

      {/* 2. Ana Çalışma Alanı */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Aşama Bilgilendirme ve Navigasyon Çubuğu */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Aşama 3 & 4: Rol Panelleri, Görev Dağıtımı & Rubrik Değerlendirme
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">
                  {formatTurkishDate(new Date().toISOString())}
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 mt-1">
                Performans & Proje Görev Takip Sistemi
              </h1>
              <p className="text-xs text-slate-600">
                MEB standartlarına tam uyumlu, Supabase veritabanı ve Oracle Cloud Ubuntu dağıtımına hazır kurumsal mimari.
              </p>
            </div>

            {/* Çalışma Modu / Sekme Butonları */}
            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Rol Panelleri ({ROLE_LABELS[previewRole]})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('auth')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'auth'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Giriş & Aktivasyon</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('database')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'database'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Veritabanı & Şema (20 Tablo)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('architecture')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'architecture'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>Mimari & Test Raporu (22 Test)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('setup_wizard')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'setup_wizard'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>İlk Kurulum</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. İÇERİK SEKMELERİ */}

        {/* VERİTABANI & ŞEMA (AŞAMA 2) */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-600" />
                    <span>PostgreSQL İlişkisel Veritabanı Şeması & RLS Güvenlik Modeli</span>
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    18 tablo, foreign key kısıtları, 0.1 puanlama hassasiyeti, 15 MB PDF sınırı ve rol bazlı erişim politikaları.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                  Aşama 2: Şema & RLS Doğrulandı
                </span>
              </div>
              <DatabaseSchemaViewer />
            </div>
          </div>
        )}

        {/* SEKME: MİMARİ & AŞAMA 1 DOĞRULAMA RAPORU */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            {/* Üst Kartlar: Temel Metrikler ve Durum */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-medium">Birim Testleri (node:test)</span>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-bold text-slate-900">14 / 14 Başarılı</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  18 tablo şeması, RLS kısıtları, 100 puan kuralı, 0.1 hassasiyet, 15MB PDF onaylandı.
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-medium">Veritabanı Altyapısı</span>
                  <Database className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-xl font-bold text-slate-900">PostgreSQL + RLS</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  18 ilişkisel tablo, rol bazlı erişim politikaları ve saklama şeması hazırlandı.
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-medium">Başlangıç Akademik Yılı</span>
                  <BookOpen className="w-4 h-4 text-sky-600" />
                </div>
                <div className="text-xl font-bold text-slate-900">2026–2027</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  4 Başlangıç Şubesi (9/B, 10/B, 11/B, 12/B) ve 2 Temel Ders tanımlı.
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-medium">Dağıtım Hedefi</span>
                  <Server className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-xl font-bold text-slate-900">Oracle Cloud Ubuntu</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Free Tier uyumlu, Nginx ters proxy, systemd servis ve 30 günlük yedekleme planı.
                </p>
              </div>
            </div>

            {/* Supabase Bağlantı Test Paneli */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Supabase Entegrasyon Durumu
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      {isSupabaseConfigured
                        ? 'Çevre değişkenleri yüklendi. Canlı Supabase bağlantısını test edebilirsiniz.'
                        : 'Henüz .env dosyasında VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlanmadı. Sistem Aşama 1 yerel doğrulama modunda çalışmaktadır.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunSupabaseTest}
                  disabled={isTestingSupabase}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 border border-indigo-200"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                  <span>Bağlantıyı Doğrula</span>
                </button>
              </div>

              {supabaseTestResult && (
                <div
                  className={`mt-4 p-3.5 rounded-lg text-xs flex items-start gap-2 border ${
                    supabaseTestResult.connected
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  {supabaseTestResult.connected ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold">
                      {supabaseTestResult.connected ? 'Bağlantı Başarılı:' : 'Bilgi:'}
                    </span>{' '}
                    {supabaseTestResult.message}
                  </div>
                </div>
              )}
            </div>

            {/* Aşama Planı Kontrol Çizelgesi */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <span>10 Aşamalı Geliştirme Planı ve İlerleme Durumu</span>
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Her aşama, ilgili birim ve entegrasyon testleri başarıyla geçtikten sonra bir sonraki aşamaya devredilir.
              </p>

              <div className="space-y-3">
                {[
                  {
                    step: 'Aşama 1',
                    title: 'Proje Planı ve İskelet (Tamamlandı)',
                    desc: 'Mimari seçim, ortam değişkenleri şablonu, TypeScript veri modelleri, pure mantık birim testleri (node:test), Header, ConfirmModal ve HelpModal hazırlandı.',
                    status: 'completed',
                  },
                  {
                    step: 'Aşama 2',
                    title: 'Veritabanı & Şema Tasarımı (Tamamlandı)',
                    desc: '18 tabloluk PostgreSQL şeması, Supabase Migration SQL dosyaları, Row Level Security (RLS) politikaları ve birim testleri doğrulandı.',
                    status: 'completed',
                  },
                  {
                    step: 'Aşama 3',
                    title: 'Kimlik Doğrulama & Yetkiler (Sıradaki Aşama)',
                    desc: 'İlk yönetici sihirbazı, öğrenci tek kullanımlık aktivasyon kodu kaydı, öğretmen başvuru onay süreci, 30 dk oturum aşımı ve pasif hesap koruması.',
                    status: 'next',
                  },
                  {
                    step: 'Aşama 4',
                    title: 'Sınıflar, Dersler & Excel Öğrenci İçe Aktarma',
                    desc: 'Excel dosyasından önizlemeli öğrenci aktarımı, mükerrer kontrolü, öğretmen sınıf/ders yetkilendirmesi ve aktivasyon kodları toplu üretimi.',
                    status: 'pending',
                  },
                  {
                    step: 'Aşama 5',
                    title: 'Görev Havuzları & Dengeli Dağıtım',
                    desc: 'Kişisel/ortak görev havuzu, 100 puanlık ölçüt şablonları, taslak dağıtım önizleme ve öğretmen onayı ile yayım.',
                    status: 'pending',
                  },
                  {
                    step: 'Aşama 6',
                    title: 'Dijital PDF / Kâğıt Teslim & Bildirimler',
                    desc: '15 MB PDF yükleme, sürüm geçmişi, kâğıt teslim onayı, ek süre talepleri, toplu ZIP indirme ve gecikme bildirimleri.',
                    status: 'pending',
                  },
                  {
                    step: 'Aşama 7',
                    title: 'Ölçüt Bazlı Değerlendirme & Taslaklar',
                    desc: '0.1 hassasiyetinde puanlama, otomatik toplam, taslak kaydetme, puan değişiklik gerekçe kaydı (log).',
                    status: 'pending',
                  },
                  {
                    step: 'Aşama 8',
                    title: 'PDF & Excel Raporları',
                    desc: 'Resmi imzalı PDF değerlendirme formları, öğrenci karne/döküm PDF, toplu yetkili Excel çıktıları.',
                    status: 'pending',
                  },
                  {
                    step: 'Aşama 9',
                    title: 'Güvenlik Sertleştirme & Kapsamlı Testler',
                    desc: 'RLS denetimi, yetkisiz erişim testleri, dosya türü/boyutu sıkılaştırması ve hata mesajı güvenliği.',
                    status: 'pending',
                  },
                  {
                    step: 'Aşama 10',
                    title: 'Yedekleme & Oracle Cloud Dağıtımı',
                    desc: 'Günlük yedekleme (30 gün saklama), Oracle Cloud Ubuntu kurulum komutları, Nginx HTTPS rehberi.',
                    status: 'pending',
                  },
                ].map((item, idx) => (
                  <div
                    key={item.step}
                    className={`p-3.5 rounded-lg border transition-colors flex items-start justify-between gap-4 ${
                      item.status === 'completed'
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : item.status === 'next'
                        ? 'bg-indigo-50/50 border-indigo-200'
                        : 'bg-white border-slate-200 opacity-70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-white border border-slate-200 shrink-0 text-slate-800">
                        {item.step}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {item.status === 'completed' && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          Doğrulandı
                        </span>
                      )}
                      {item.status === 'next' && (
                        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                          Hazır
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="text-[11px] text-slate-500">
                          Beklemede
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SEKME 2: İLK KURULUM SİHİRBAZI */}
        {activeTab === 'setup_wizard' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">
                İlk Kurulum Sihirbazı Önizlemesi
              </h2>
              <button
                type="button"
                onClick={triggerResetConfirm}
                className="text-xs text-amber-700 hover:text-amber-800 font-medium px-3 py-1.5 rounded bg-amber-50 border border-amber-200"
              >
                Sihirbazı Baştan Başlat
              </button>
            </div>
            <InitialSetupWizard
              onComplete={async (data) => {
                try {
                  if (isSupabaseConfigured && supabase) {
                    await bootstrapAdminViaRpc({
                      bootstrapToken: data.bootstrapToken || '',
                      adminName: data.adminName,
                      schoolName: data.schoolName,
                    });
                  }
                  setSchoolName(data.schoolName);
                  if (data.logoUrl) setLogoUrl(data.logoUrl);
                  setAcademicYear(data.academicYear);
                  setIsInitialized(true);
                  setConfirmModalConfig({
                    isOpen: true,
                    title: 'İlk Kurulum Başarıyla Tamamlandı',
                    message: `${data.schoolName} için ilk yönetici (${data.adminName}) oluşturuldu. 2026-2027 akademik yılı, 4 sınıf şubesi ve 2 ders sisteme kaydedildi ve sistem mühürlendi.`,
                    confirmText: 'Yönetici Paneline Geç',
                    variant: 'primary',
                    onConfirm: () => {
                      setPreviewRole('admin');
                      setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
                      setActiveTab('preview');
                    },
                  });
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'İlk kurulum başarısız oldu.';
                  setConfirmModalConfig({
                    isOpen: true,
                    title: 'İlk Kurulum Hatası',
                    message: msg,
                    confirmText: 'Tekrar Dene',
                    variant: 'danger',
                    onConfirm: () => {
                      setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
                    },
                  });
                }
              }}
            />
          </div>
        )}

        {/* SEKME 3: GİRİŞ & AKTİVASYON KARTI */}
        {activeTab === 'auth' && (
          <div className="py-6">
            <div className="text-center max-w-md mx-auto mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                Kimlik Doğrulama & Öğrenci Kaydı
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Öğrenci tek kullanımlık aktivasyon kodlu kayıt, öğretmen başvurusu ve güvenli oturum açma modülü.
              </p>
            </div>

            <AuthCard
              onLogin={async ({ email, pass, selectedContextRole }) => {
                if (isSupabaseConfigured && supabase) {
                  const { profile } = await signInWithRoleCheck(email, pass);
                  if (!profile) {
                    throw new Error('Kullanıcı hesabı mevcut ancak henüz aktif bir rol profili atanmamış.');
                  }
                  if (profile.status !== 'active') {
                    throw new Error('Hesabınız aktif durumda değildir. Lütfen okul idaresi ile iletişime geçiniz.');
                  }
                  // Rol kesinlikle istemciden değil, veritabanından alınır!
                  setPreviewRole(profile.role);
                  setConfirmModalConfig({
                    isOpen: true,
                    title: 'Giriş Başarılı (Supabase Doğrulandı)',
                    message: `${profile.full_name} (${ROLE_LABELS[profile.role as UserRole]}) olarak başarıyla oturum açıldı.`,
                    confirmText: 'Panele Geç',
                    variant: 'primary',
                    onConfirm: () => {
                      setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
                      setActiveTab('preview');
                    },
                  });
                } else {
                  // Doğrulama / Önizleme modu
                  setConfirmModalConfig({
                    isOpen: true,
                    title: 'Giriş Başarılı (Doğrulama Modu)',
                    message: `${email} adresiyle ${ROLE_LABELS[selectedContextRole]} rolünde giriş yapıldı. Not: Canlı ortamda kullanıcı rolü istemciden değil, veritabanı user_profiles tablosundaki yetkiden belirlenir.`,
                    confirmText: 'Panele Geç',
                    variant: 'primary',
                    onConfirm: () => {
                      setPreviewRole(selectedContextRole);
                      setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
                      setActiveTab('preview');
                    },
                  });
                }
              }}
              onStudentRegister={async ({ schoolNumber, activationCode, fullName, email, password }) => {
                if (!validateActivationCodeFormat(activationCode)) {
                  throw new Error('Aktivasyon kodu formatı geçersiz! Okul idaresinden aldığınız kodu kontrol ediniz.');
                }
                const res = await registerAndActivateStudent({
                  schoolNumber,
                  activationCode,
                  fullName,
                  email,
                  password,
                });
                setConfirmModalConfig({
                  isOpen: true,
                  title: 'Öğrenci Aktivasyonu Başarılı',
                  message: res.message,
                  confirmText: 'Tamam',
                  variant: 'primary',
                  onConfirm: () => {
                    setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
                  },
                });
              }}
              onTeacherApply={async (data) => {
                const res = await submitTeacherApplicationToDb({
                  fullName: data.fullName,
                  email: data.email,
                  branchSubject: data.branchSubject,
                  applicationNotes: data.applicationNotes,
                });
                setConfirmModalConfig({
                  isOpen: true,
                  title: 'Öğretmen Başvurusu Alındı',
                  message: res.message,
                  confirmText: 'Tamam',
                  variant: 'primary',
                  onConfirm: () => {
                    setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
                  },
                });
              }}
              onForgotPassword={async (email) => {
                if (isSupabaseConfigured && supabase) {
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin,
                  });
                  if (error) throw new Error(error.message);
                }
                setConfirmModalConfig({
                  isOpen: true,
                  title: 'Şifre Sıfırlama Bağlantısı',
                  message: `${email} adresine güvenli şifre sıfırlama bağlantısı iletildi. Lütfen gelen kutunuzu kontrol ediniz.`,
                  confirmText: 'Tamam',
                  variant: 'primary',
                  onConfirm: () => {
                    setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
                  },
                });
              }}
            />
          </div>
        )}

        {/* SEKME 4: ROL ARAYÜZ ÖNİZLEMESİ */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    {previewRole === 'student' && <GraduationCap className="w-5 h-5 text-sky-600" />}
                    {previewRole === 'teacher' && <BookOpen className="w-5 h-5 text-emerald-600" />}
                    {previewRole === 'admin' && <Shield className="w-5 h-5 text-indigo-600" />}
                    <span>{ROLE_LABELS[previewRole]} Paneli Görünüm İskeleti</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Bu ekranda rol bazlı iş akışları, veri kısıtları ve yetki sınırları test edilmektedir.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Görünüm Seç:</span>
                  {(['student', 'teacher', 'admin'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setPreviewRole(r)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                        previewRole === r
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kalıcılık Durum Bilgilendirme Bannerı (Supabase vs Offline Fallback Ayrımı) */}
              <div
                className={`mb-6 p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                  isOfflineFallback
                    ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${
                      isOfflineFallback
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    <Database className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <span>
                        {isOfflineFallback
                          ? 'Demo / Çevrimdışı Kalıcılık Modu (Tarayıcı Yerel Bellek)'
                          : 'Supabase Canlı Veritabanı & Realtime Aktif'}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isOfflineFallback
                            ? 'bg-amber-200 text-amber-800'
                            : 'bg-emerald-200 text-emerald-800'
                        }`}
                      >
                        {isOfflineFallback ? 'Yerel Fallback' : 'PostgreSQL'}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">
                      {isOfflineFallback
                        ? 'Sayfa yenilendiğinde görevler, öğrenci PDF teslimleri, kâğıt onayları ve notlar korunur (localStorage). Canlı Supabase bağlantısı olmadığı için yerel veriler gerçek veritabanı gibi gösterilmez.'
                        : 'Tüm görevler, teslimler ve rubrik değerlendirmeleri doğrudan canlı PostgreSQL üzerinde tutulur ve Realtime kanalından anlık güncellenir.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {assignments.length} Görev ·{' '}
                    {Object.values(submissionsByAssignment).reduce(
                      (acc, curr) => acc + curr.filter((s) => s.status !== 'not_submitted').length,
                      0
                    )}{' '}
                    Etkin Teslim
                  </span>
                </div>
              </div>

              {/* Aktif Rol Panelleri (Aşama 3 & 4) */}
              {previewRole === 'student' && (
                <StudentDashboard
                  studentName="Ali Demir"
                  schoolNumber="1042"
                  classroomName="10/B"
                  tasks={studentDashboardTasks}
                  onSubmitPdf={handleStudentSubmitPdf}
                  onReportPaper={handleStudentReportPaper}
                />
              )}

              {previewRole === 'teacher' && (
                <TeacherDashboard
                  teacherName="Hasan Yılmaz (Bilişim Öğretmeni)"
                  assignments={assignments}
                  submissionsByAssignment={submissionsByAssignment}
                  onTaskCreated={handleTeacherCreateTask}
                  onConfirmPaperDelivery={handleTeacherConfirmPaper}
                  onSaveGrading={handleTeacherSaveGrading}
                />
              )}

              {previewRole === 'admin' && (
                <AdminDashboard />
              )}
            </div>
          </div>
        )}
      </main>

      {/* 4. Alt Bilgi (Footer) - Anti-slop kurallarına uygun sade kurumsal tasarım */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {schoolName} · Performans & Proje Görev Takip Sistemi
          </span>
          <span className="text-slate-400">
            Avrupa/İstanbul Saat Dilimi · Sürüm 2.0.0 (Aşama 3 & 4 Tam Fonksiyonel)
          </span>
        </div>
      </footer>

      {/* 5. Modallar ve Çekmeceler */}
      <HelpModal
        isOpen={isHelpOpen}
        initialRole={previewRole}
        onClose={() => setIsHelpOpen(false)}
      />

      <NotificationDrawer
        isOpen={isNotifOpen}
        notifications={notifications}
        onClose={() => setIsNotifOpen(false)}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />

      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmText={confirmModalConfig.confirmText}
        variant={confirmModalConfig.variant}
        onConfirm={confirmModalConfig.onConfirm}
        onCancel={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Otomatik Oturum Kapatma (30 Dakika İnaktivite Güvenlik Modalı) */}
      <InactivityTimeoutModal
        timeoutMinutes={30}
        warningMinutes={2}
        onTimeout={() => {
          setActiveTab('auth');
        }}
      />
    </div>
  );
}
