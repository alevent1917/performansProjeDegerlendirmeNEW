/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Okul Yönetici Paneli (Admin Dashboard) - Aşama 3, 4 & 5
 * Okul ayarları, sınıf/ders yönetimi, öğretmen yetkilendirme matrisi,
 * aktivasyon kodu üretimi, öğretmen başvuruları onayı, not denetim günlüğü ve JSON yedekleme.
 */

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  ShieldCheck,
  KeyRound,
  UserCheck,
  FileSpreadsheet,
  Download,
  Database,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Archive,
  RefreshCw,
  Copy,
  AlertTriangle,
  Printer,
  FileDown,
  UploadCloud,
  Check,
  Shield,
  Upload,
  Image as ImageIcon,
  Building,
  MapPin,
  Hash,
  School,
  RotateCcw,
  Trash2,
  PlusCircle,
  BookOpen,
  Layers,
  Pencil,
  X,
} from 'lucide-react';
import { formatTurkishDate } from '../utils/validation';
import {
  LOGO_PRESETS,
  SchoolProfileConfig,
  SealingInfo,
  DEFAULT_SCHOOL_CONFIG,
  DEFAULT_SEALING_INFO,
  saveSchoolProfileConfig,
  ClassroomItem,
  CourseItem,
  loadClassrooms,
  saveClassrooms,
  updateClassroom,
  addClassroomIfMissing,
  loadCourses,
  saveCourses,
  updateCourse,
} from '../lib/schoolConfigService';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export interface ImportStudentRow {
  id: string;
  schoolNumber: string;
  fullName: string;
  classroomName: string;
  gender: 'K' | 'E';
  activationCode?: string;
  status: 'valid' | 'duplicate_in_file' | 'already_exists';
  statusMessage?: string;
}

interface AdminDashboardProps {
  currentSchoolConfig?: SchoolProfileConfig;
  sealingInfo?: SealingInfo;
  onUpdateSchoolConfig?: (config: Partial<SchoolProfileConfig>) => void;
  onResealSystem?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentSchoolConfig = DEFAULT_SCHOOL_CONFIG,
  sealingInfo = DEFAULT_SEALING_INFO,
  onUpdateSchoolConfig,
  onResealSystem,
}) => {
  type AdminTab =
    | 'settings'
    | 'classes_courses'
    | 'permissions'
    | 'activation_codes'
    | 'excel_import'
    | 'applications'
    | 'audit_log'
    | 'backup';
  const [activeTab, setActiveTab] = useState<AdminTab>('settings');

  // 1. Okul Ayarları State
  const [settings, setSettings] = useState<SchoolProfileConfig>({
    ...DEFAULT_SCHOOL_CONFIG,
    ...currentSchoolConfig,
  });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [selectedLogoPresetId, setSelectedLogoPresetId] = useState<string>('meb_official');

  useEffect(() => {
    if (currentSchoolConfig) {
      setSettings((prev) => ({ ...prev, ...currentSchoolConfig }));
    }
  }, [currentSchoolConfig]);

  // 2. Sınıflar ve Dersler (Kalıcı ve Tam Kapsamlı Şube Yönetimi)
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>(() => loadClassrooms());
  const [courses, setCourses] = useState<CourseItem[]>(() => loadCourses());

  // Şube Ekleme Form State (Sınıf mevcudu kaldırıldı, sadece düzey ve şube bilgisi)
  const [newGradeLevel, setNewGradeLevel] = useState<number>(10);
  const [newBranchLetter, setNewBranchLetter] = useState<string>('A');
  const [newCustomClassName, setNewCustomClassName] = useState<string>('');
  const [classNotice, setClassNotice] = useState<string | null>(null);

  // Şube Güncelleme / Düzenleme State
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editGradeLevel, setEditGradeLevel] = useState<number>(10);
  const [editBranchLetter, setEditBranchLetter] = useState<string>('A');
  const [editCustomName, setEditCustomName] = useState<string>('');

  // Ders Ekleme Form State (Dersin sınıfı / kademesi seçilebilir)
  const [newCourseCode, setNewCourseCode] = useState<string>('');
  const [newCourseName, setNewCourseName] = useState<string>('');
  const [newCourseHours, setNewCourseHours] = useState<number>(4);
  const [newCourseTargetClass, setNewCourseTargetClass] = useState<string>('10. Sınıf');
  const [courseNotice, setCourseNotice] = useState<string | null>(null);

  // Ders Güncelleme / Düzenleme State
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editCourseCode, setEditCourseCode] = useState<string>('');
  const [editCourseName, setEditCourseName] = useState<string>('');
  const [editCourseHours, setEditCourseHours] = useState<number>(4);
  const [editCourseTargetClass, setEditCourseTargetClass] = useState<string>('10. Sınıf');

  // Excel Şube Hızlı Ekleme ve Filtreleme
  const [isAddingQuickClass, setIsAddingQuickClass] = useState(false);
  const [quickGrade, setQuickGrade] = useState('10');
  const [quickBranchLetter, setQuickBranchLetter] = useState('A');
  const [quickCustomClass, setQuickCustomClass] = useState('');
  const [excelGradeFilter, setExcelGradeFilter] = useState<'ALL' | '9' | '10' | '11' | '12'>('ALL');

  // 3. Öğretmen Yetkilendirmeleri
  const [permissions, setPermissions] = useState([
    {
      id: 'perm-1',
      teacherName: 'Hasan Yılmaz (Öğretmen)',
      classroomName: '10/B',
      courseCode: 'PRG101',
      courseName: 'Programlama Temelleri',
      academicYear: '2026-2027',
    },
    {
      id: 'perm-2',
      teacherName: 'Hasan Yılmaz (Öğretmen)',
      classroomName: '11/B',
      courseCode: 'NET201',
      courseName: 'Ağ Sistemleri ve Anahtarlama',
      academicYear: '2026-2027',
    },
  ]);

  // 4. Aktivasyon Kodları
  const [activationCodes, setActivationCodes] = useState([
    { id: 'act-1', schoolNumber: '1042', code: 'AKT-9B41-8932', isUsed: true, usedBy: 'Ali Demir', createdAt: '2026-10-25' },
    { id: 'act-2', schoolNumber: '1043', code: 'AKT-7F22-5519', isUsed: true, usedBy: 'Ayşe Yılmaz', createdAt: '2026-10-25' },
    { id: 'act-3', schoolNumber: '1044', code: 'AKT-3K88-1204', isUsed: false, createdAt: '2026-10-28' },
    { id: 'act-4', schoolNumber: '1045', code: 'AKT-4M99-8871', isUsed: false, createdAt: '2026-10-28' },
  ]);

  const [newSchoolNum, setNewSchoolNum] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 5. Öğretmen Başvuruları
  const [applications, setApplications] = useState([
    {
      id: 'app-1',
      fullName: 'Selin Aksoy',
      email: 'selin.aksoy@okul.k12.tr',
      branchSubject: 'Bilişim Teknolojileri / Veritabanı',
      notes: 'Yeni atandım, veri tabanı ve SQL dersleri için yetkilendirme talep ediyorum.',
      appliedAt: '2026-10-27T10:00:00Z',
      status: 'pending' as 'pending' | 'approved' | 'rejected',
    },
  ]);

  // 6. Puan Değişiklik Günlüğü (Audit Log)
  const [auditLogs] = useState([
    {
      id: 'log-1',
      studentName: 'Ali Demir (1042)',
      taskTitle: 'Döngüler ve Fonksiyonlar Uygulaması',
      oldScore: 88.5,
      newScore: 93.5,
      changedBy: 'Hasan Yılmaz (Öğretmen)',
      reason: 'Öğrencinin itirazı haklı bulundu, hata yakalama test senaryosu için 5 puan eklendi.',
      timestamp: '2026-10-28T10:45:12Z',
    },
    {
      id: 'log-2',
      studentName: 'Can Öztürk (1044)',
      taskTitle: 'Ağ Sistemleri Topoloji Raporu',
      oldScore: 75.0,
      newScore: 80.0,
      changedBy: 'Hasan Yılmaz (Öğretmen)',
      reason: 'Subnetting hesaplama tablosundaki ek çizim zümre incelemesinde geçerli sayıldı.',
      timestamp: '2026-10-27T15:20:00Z',
    },
  ]);

  // Yeni Aktivasyon Kodu Üret
  const handleGenerateActivationCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolNum.trim()) return;

    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const code = `AKT-${randomPart}-${randomDigits}`;

    setActivationCodes((prev) => [
      {
        id: `act-${Date.now()}`,
        schoolNumber: newSchoolNum.trim(),
        code,
        isUsed: false,
        createdAt: new Date().toISOString().split('T')[0],
      },
      ...prev,
    ]);
    setNewSchoolNum('');
  };

  // 7. Toplu Öğrenci Aktarımı (Excel / e-Okul) - Aşama 4
  const [importedStudents, setImportedStudents] = useState<ImportStudentRow[]>([]);
  const [rawCsvText, setRawCsvText] = useState('');
  const [selectedImportClass, setSelectedImportClass] = useState(() => {
    const list = loadClassrooms();
    return list.find((c) => c.name === '10/A')?.name || list[0]?.name || '10/A';
  });
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  const generateSingleCode = () => {
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `AKT-${randomPart}-${randomDigits}`;
  };

  // Şube Ekleme / Güncelleme / Silme İşlemleri
  const handleAddClassroom = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = newCustomClassName.trim() || `${newGradeLevel}/${newBranchLetter.toUpperCase().trim()}`;
    if (!raw) return;
    const normalized = raw.toUpperCase();
    if (classrooms.some((c) => c.name.toUpperCase() === normalized)) {
      setClassNotice(`"${normalized}" şubesi zaten listede mevcut.`);
      return;
    }
    const parts = normalized.split('/');
    const grade = parseInt(parts[0], 10) || newGradeLevel;
    const branch = (parts[1] || newBranchLetter).toUpperCase();
    const newCls: ClassroomItem = {
      id: `cl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: normalized,
      gradeLevel: grade,
      branch,
      studentCount: 0,
    };
    const updated = [...classrooms, newCls].sort((a, b) => {
      if (a.gradeLevel !== b.gradeLevel) return a.gradeLevel - b.gradeLevel;
      return a.branch.localeCompare(b.branch);
    });
    setClassrooms(updated);
    saveClassrooms(updated);
    setNewCustomClassName('');
    setClassNotice(`✓ "${normalized}" şubesi başarıyla oluşturuldu ve kaydedildi.`);
    setTimeout(() => setClassNotice(null), 4000);
  };

  const startEditClassroom = (c: ClassroomItem) => {
    setEditingClassId(c.id);
    setEditGradeLevel(c.gradeLevel || 10);
    setEditBranchLetter(c.branch || 'A');
    setEditCustomName(c.name);
  };

  const handleSaveEditClassroom = (id: string) => {
    const raw = editCustomName.trim() || `${editGradeLevel}/${editBranchLetter.toUpperCase().trim()}`;
    if (!raw) return;
    const normalized = raw.toUpperCase();
    const existingSameName = classrooms.find((c) => c.name.toUpperCase() === normalized && c.id !== id);
    if (existingSameName) {
      setClassNotice(`"${normalized}" adında başka bir şube zaten mevcut.`);
      return;
    }
    const parts = normalized.split('/');
    const grade = parseInt(parts[0], 10) || editGradeLevel;
    const branch = (parts[1] || editBranchLetter).toUpperCase();

    const oldItem = classrooms.find((c) => c.id === id);
    const updated = updateClassroom(id, {
      name: normalized,
      gradeLevel: grade,
      branch,
    });
    setClassrooms(updated);
    if (oldItem && selectedImportClass === oldItem.name) {
      setSelectedImportClass(normalized);
    }
    setEditingClassId(null);
    setClassNotice(`✓ "${oldItem?.name || ''}" şubesi "${normalized}" olarak güncellendi.`);
    setTimeout(() => setClassNotice(null), 4000);
  };

  const handleCancelEditClassroom = () => {
    setEditingClassId(null);
  };

  const handleDeleteClassroom = (id: string, name: string) => {
    if (classrooms.length <= 1) {
      setClassNotice('En az bir şube sistemde tanımlı kalmalıdır.');
      return;
    }
    const updated = classrooms.filter((c) => c.id !== id);
    setClassrooms(updated);
    saveClassrooms(updated);
    if (selectedImportClass === name && updated[0]) {
      setSelectedImportClass(updated[0].name);
    }
    setClassNotice(`"${name}" şubesi listeden kaldırıldı.`);
    setTimeout(() => setClassNotice(null), 4000);
  };

  // Ders Ekleme / Güncelleme / Silme İşlemleri
  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode.trim() || !newCourseName.trim()) return;
    const code = newCourseCode.trim().toUpperCase();
    if (courses.some((c) => c.code.toUpperCase() === code)) {
      setCourseNotice(`"${code}" kodlu ders zaten sistemde mevcut.`);
      return;
    }
    const newCrs: CourseItem = {
      id: `crs-${Date.now()}`,
      code,
      name: newCourseName.trim(),
      hours: Number(newCourseHours) || 4,
      targetClassName: newCourseTargetClass || 'Tüm Kademeler',
    };
    const updated = [...courses, newCrs];
    setCourses(updated);
    saveCourses(updated);
    setNewCourseCode('');
    setNewCourseName('');
    setCourseNotice(`✓ "${code} - ${newCourseName.trim()}" (${newCrs.targetClassName}) dersi başarıyla eklendi.`);
    setTimeout(() => setCourseNotice(null), 4000);
  };

  const startEditCourse = (crs: CourseItem) => {
    setEditingCourseId(crs.id);
    setEditCourseCode(crs.code);
    setEditCourseName(crs.name);
    setEditCourseHours(crs.hours);
    setEditCourseTargetClass(crs.targetClassName || '10. Sınıf');
  };

  const handleSaveEditCourse = (id: string) => {
    if (!editCourseCode.trim() || !editCourseName.trim()) return;
    const code = editCourseCode.trim().toUpperCase();
    const existingSameCode = courses.find((c) => c.code.toUpperCase() === code && c.id !== id);
    if (existingSameCode) {
      setCourseNotice(`"${code}" kodunda başka bir ders mevcut.`);
      return;
    }
    const updated = updateCourse(id, {
      code,
      name: editCourseName.trim(),
      hours: Number(editCourseHours) || 4,
      targetClassName: editCourseTargetClass || 'Tüm Kademeler',
    });
    setCourses(updated);
    setEditingCourseId(null);
    setCourseNotice(`✓ "${code} - ${editCourseName.trim()}" (${editCourseTargetClass}) dersi güncellendi.`);
    setTimeout(() => setCourseNotice(null), 4000);
  };

  const handleCancelEditCourse = () => {
    setEditingCourseId(null);
  };

  const handleDeleteCourse = (id: string, code: string) => {
    if (courses.length <= 1) {
      setCourseNotice('En az bir ders sistemde tanımlı kalmalıdır.');
      return;
    }
    const updated = courses.filter((c) => c.id !== id);
    setCourses(updated);
    saveCourses(updated);
    setCourseNotice(`"${code}" dersi silindi.`);
    setTimeout(() => setCourseNotice(null), 4000);
  };

  // Excel İçe Aktarımda Hızlı Şube Ekleme
  const handleQuickAddBranch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = quickCustomClass.trim() || `${quickGrade}/${quickBranchLetter.toUpperCase().trim()}`;
    if (!raw) return;
    const { classrooms: updated, item } = addClassroomIfMissing(raw);
    setClassrooms(updated);
    setSelectedImportClass(item.name);
    setIsAddingQuickClass(false);
    setQuickCustomClass('');
    setImportNotice(`✓ "${item.name}" şubesi sisteme eklendi ve hedef şube olarak seçildi.`);
  };

  // Dinamik Örnek e-Okul Öğrenci Listesi (Seçilen Şubeye Göre)
  const handleLoadSampleEokulList = (targetClass?: string) => {
    const cls = targetClass || selectedImportClass || '10/A';
    const samplePool = [
      { name: 'Emre Çelik', gender: 'E' as const },
      { name: 'Selin Doğan', gender: 'K' as const },
      { name: 'Burak Şahin', gender: 'E' as const },
      { name: 'Elif Arslan', gender: 'K' as const },
      { name: 'Mert Yıldız', gender: 'E' as const },
      { name: 'Büşra Aydın', gender: 'K' as const },
      { name: 'Kerem Koç', gender: 'E' as const },
      { name: 'İrem Yavuz', gender: 'K' as const },
    ];

    const gradeNum = parseInt(cls.split('/')[0], 10) || 10;
    const branchChar = (cls.split('/')[1] || 'A').charCodeAt(0);
    const baseOffset = gradeNum * 100 + (branchChar % 10) * 10;

    const sampleRows = samplePool.map((item, idx) => ({
      no: String(baseOffset + 10 + idx),
      name: item.name,
      cls,
      gender: item.gender,
    }));

    const mapped: ImportStudentRow[] = sampleRows.map((r, idx) => {
      const alreadyExists = activationCodes.some((ac) => ac.schoolNumber === r.no);
      return {
        id: `sample-${idx}-${r.no}`,
        schoolNumber: r.no,
        fullName: r.name,
        classroomName: r.cls,
        gender: r.gender,
        activationCode: alreadyExists ? undefined : generateSingleCode(),
        status: alreadyExists ? 'already_exists' : 'valid',
        statusMessage: alreadyExists ? 'Bu okul numarası sistemde zaten kayıtlı!' : 'Aktarıma hazır',
      };
    });

    setImportedStudents(mapped);
    setRawCsvText(
      sampleRows.map((r) => `${r.no}\t${r.name}\t${r.cls}\t${r.gender}`).join('\n')
    );
    setImportNotice(`"${cls}" şubesi için 8 örnek e-Okul öğrenci kaydı başarıyla oluşturuldu ve yüklendi.`);
  };

  const handleParseCsvInput = (text: string) => {
    setRawCsvText(text);
    if (!text.trim()) {
      setImportedStudents([]);
      return;
    }

    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const seenNos = new Set<string>();
    const parsed: ImportStudentRow[] = [];

    lines.forEach((line, idx) => {
      const parts = line.includes('\t')
        ? line.split('\t')
        : line.includes(';')
        ? line.split(';')
        : line.split(',');

      if (parts.length >= 2) {
        const no = parts[0].trim().replace(/[^0-9]/g, '');
        const name = parts[1].trim();
        const cls = parts[2]?.trim() || selectedImportClass;
        const gender: 'K' | 'E' = parts[3]?.trim().toUpperCase().startsWith('K') ? 'K' : 'E';

        if (no && name) {
          const isDuplicateInFile = seenNos.has(no);
          seenNos.add(no);
          const alreadyInDb = activationCodes.some((ac) => ac.schoolNumber === no);

          let status: ImportStudentRow['status'] = 'valid';
          let statusMessage = 'Geçerli kayıt';

          if (isDuplicateInFile) {
            status = 'duplicate_in_file';
            statusMessage = 'Listede mükerrer okul numarası!';
          } else if (alreadyInDb) {
            status = 'already_exists';
            statusMessage = 'Sistemde zaten aktivasyon kaydı mevcut!';
          }

          parsed.push({
            id: `row-${idx}-${no}`,
            schoolNumber: no,
            fullName: name,
            classroomName: cls,
            gender,
            activationCode: status === 'valid' ? generateSingleCode() : undefined,
            status,
            statusMessage,
          });
        }
      }
    });

    setImportedStudents(parsed);
  };

  const handleGenerateAllCodes = () => {
    setImportedStudents((prev) =>
      prev.map((s) => ({
        ...s,
        activationCode: s.activationCode || (s.status === 'valid' ? generateSingleCode() : undefined),
      }))
    );
  };

  const handleCommitStudentsToSystem = async () => {
    const validRows = importedStudents.filter((s) => s.status === 'valid');
    if (validRows.length === 0) {
      setImportNotice('Aktarılacak geçerli öğrenci kaydı bulunamadı.');
      return;
    }

    const newCodes = validRows.map((s) => ({
      id: `act-${Date.now()}-${s.schoolNumber}`,
      schoolNumber: s.schoolNumber,
      code: s.activationCode || generateSingleCode(),
      isUsed: false,
      createdAt: new Date().toISOString().split('T')[0],
    }));

    // Canlı Supabase bağlantısı mevcutsa doğrudan PostgreSQL tablosuna yaz
    if (isSupabaseConfigured && supabase) {
      try {
        const recordsToInsert = validRows.map((s) => ({
          school_number: s.schoolNumber,
          code_hash: s.activationCode || generateSingleCode(),
          is_used: false,
          expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        }));
        const { error } = await supabase.from('activation_codes').insert(recordsToInsert);
        if (error) {
          console.warn('Canlı Supabase activation_codes ekleme uyarısı:', error.message);
        }
      } catch (err) {
        console.warn('Canlı veritabanına aktarım sırasında yerel koruma devrede:', err);
      }
    }

    setActivationCodes((prev) => [...newCodes, ...prev]);

    setClassrooms((prev) => {
      const updated = [...prev];
      validRows.forEach((r) => {
        const targetCls = r.classroomName.trim().toUpperCase();
        const existingIdx = updated.findIndex((c) => c.name.toUpperCase() === targetCls);
        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            studentCount: updated[existingIdx].studentCount + 1,
          };
        } else {
          const parts = targetCls.split('/');
          const grade = parseInt(parts[0], 10) || 9;
          const branch = parts[1] || 'A';
          updated.push({
            id: `cl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: targetCls,
            gradeLevel: grade,
            branch,
            studentCount: 1,
          });
        }
      });
      const sorted = updated.sort((a, b) => {
        if (a.gradeLevel !== b.gradeLevel) return a.gradeLevel - b.gradeLevel;
        return a.branch.localeCompare(b.branch);
      });
      saveClassrooms(sorted);
      return sorted;
    });

    setImportNotice(
      `✓ ${validRows.length} öğrencinin tek kullanımlık aktivasyon kodları başarıyla oluşturuldu ve veritabanına işlendi!`
    );
    setImportedStudents((prev) =>
      prev.map((s) =>
        s.status === 'valid'
          ? { ...s, status: 'already_exists', statusMessage: 'Sisteme aktarıldı' }
          : s
      )
    );
  };

  const handleDownloadDistributionCsv = () => {
    const header = 'Okul No,Adı Soyadı,Sınıf,Cinsiyet,Aktivasyon Kodu,Durum\n';
    const rows = importedStudents
      .map(
        (s) =>
          `"${s.schoolNumber}","${s.fullName}","${s.classroomName}","${s.gender}","${
            s.activationCode || ''
          }","${s.statusMessage || ''}"`
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sinif_Aktivasyon_Kuponlari_${selectedImportClass.replace('/', '-')}_${
      new Date().toISOString().split('T')[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Öğretmen Başvuru Onay/Red
  const handleApproveTeacher = (id: string) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'approved' } : a))
    );
  };

  const handleRejectTeacher = (id: string) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'rejected' } : a))
    );
  };

  // Veritabanı JSON Yedeği İndirme
  const handleDownloadBackupJson = () => {
    const backupData = {
      system: 'Performans & Proje Görev Takip Sistemi',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      schoolSettings: settings,
      classrooms,
      courses,
      permissions,
      activationCodes,
      auditLogs,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Okul_Veritabani_Yedek_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Yönetici Üst Bilgi Kartı */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded">
                Okul Yönetici Paneli
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-medium text-slate-600">Müdür / İdare Yetkisi</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Okul Yapılandırması & Yetki Yönetimi
            </h2>
            <p className="text-xs text-slate-600">
              Okul genel ayarlarını düzenleyebilir, öğretmenlere sınıf/ders yetkisi atayabilir, aktivasyon kodları üretebilir ve not audit logunu denetleyebilirsiniz.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadBackupJson}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Sistem Yedeğini İndir (JSON)</span>
          </button>
        </div>

        {/* Sekme Butonları */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors flex items-center gap-1.5 ${
              activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Okul Ayarları</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('classes_courses')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors flex items-center gap-1.5 ${
              activeTab === 'classes_courses' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Sınıflar & Dersler</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors flex items-center gap-1.5 ${
              activeTab === 'permissions' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Öğretmen Yetki Matrisi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('excel_import')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors flex items-center gap-1.5 ${
              activeTab === 'excel_import' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Toplu Öğrenci Aktarımı (Excel)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activation_codes')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors flex items-center gap-1.5 ${
              activeTab === 'activation_codes' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Aktivasyon Kodları ({activationCodes.filter((c) => !c.isUsed).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('applications')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors flex items-center gap-1.5 ${
              activeTab === 'applications' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Öğretmen Başvuruları ({applications.filter((a) => a.status === 'pending').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit_log')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit_log' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Not Değişiklik Günlüğü</span>
          </button>
        </div>
      </div>

      {/* 1. OKUL AYARLARI FORMU & MÜHÜRLEME YÖNETİMİ */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Mühürleme Durumu Kartı */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                      Sistem Güvenlik Mührü
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                      Mühürlü & Korumalı
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    Mühür Sahibi Yönetici:{' '}
                    <span className="text-indigo-700 font-mono">
                      {sealingInfo.sealedAdminEmail || 'alevent1917@gmail.com'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Yetkili:{' '}
                    <strong>{sealingInfo.sealedAdminName || 'Levent A. (Okul Müdürü)'}</strong> ·
                    Mühür Tarihi:{' '}
                    {formatTurkishDate(sealingInfo.sealedAt || new Date().toISOString())}
                  </p>
                </div>
              </div>

              {onResealSystem && (
                <button
                  type="button"
                  onClick={onResealSystem}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-300 shadow-2xs flex items-center gap-2 transition-colors shrink-0"
                >
                  <RotateCcw className="w-4 h-4 text-indigo-600" />
                  <span>Başka Kullanıcı ile Yeniden Mühürle</span>
                </button>
              )}
            </div>
          </div>

          {/* Okul Kimliği ve Logo Ayarları Formu */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <span>Kurumsal Okul Kimliği ve Parametreleri</span>
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveSchoolProfileConfig(settings);
                if (onUpdateSchoolConfig) {
                  onUpdateSchoolConfig(settings);
                }
                setSettingsSaved(true);
                setTimeout(() => setSettingsSaved(false), 2500);
              }}
              className="space-y-5 max-w-3xl"
            >
              {/* Okul Adı */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resmî Okul Adı *
                </label>
                <input
                  type="text"
                  required
                  value={settings.schoolName}
                  onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900"
                />
              </div>

              {/* Kurum Kodu, İl/İlçe ve Okul Türü */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-500" />
                    <span>MEB Kurum Kodu</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.institutionCode || '974125'}
                    onChange={(e) => setSettings({ ...settings, institutionCode: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>İl / İlçe</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.provinceDistrict || 'İstanbul / Kadıköy'}
                    onChange={(e) => setSettings({ ...settings, provinceDistrict: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Okul Türü
                  </label>
                  <input
                    type="text"
                    value={settings.schoolType || 'Mesleki ve Teknik Anadolu Lisesi'}
                    onChange={(e) => setSettings({ ...settings, schoolType: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* LOGO YÖNETİMİ */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-900 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    <span>Okul Logosu ve Resmî Amblem</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Üst menüde ve resmi PDF değerlendirme formlarında görünür.
                  </span>
                </label>

                {/* Hazır Logo Kartları */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                  {LOGO_PRESETS.map((p) => {
                    const isSelected = settings.logoUrl === p.dataUrl;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSettings({ ...settings, logoUrl: p.dataUrl });
                          setSelectedLogoPresetId(p.id);
                        }}
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-11 h-11 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                          <img src={p.dataUrl} alt={p.title} className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {p.title.split('(')[0]}
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-1" />}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{p.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Dosya Yükleme / URL Girişi */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Cihazdan Yeni Logo Resmi Yükleyin
                      </span>
                      <span className="text-[11px] text-slate-500">
                        PNG, JPG, SVG veya WebP formatı desteklenir.
                      </span>
                    </div>

                    <label className="cursor-pointer px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs flex items-center gap-2 shrink-0 transition-colors">
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Dosya Seç</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              setSettings((prev) => ({ ...prev, logoUrl: reader.result as string }));
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Veya Özel Logo Web Bağlantısı (URL)
                    </label>
                    <input
                      type="url"
                      value={settings.logoUrl?.startsWith('data:image') ? '' : settings.logoUrl}
                      onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                      placeholder="https://.../okul-logosu.png"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  {/* Canlı Önizleme */}
                  <div className="pt-2 border-t border-slate-200/80 flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-600">Mevcut Logo:</span>
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                      {settings.logoUrl ? (
                        <img
                          src={settings.logoUrl}
                          alt={settings.schoolName}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <School className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {settings.schoolName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Akademik Yıl & Limitler */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 mb-3">
                  Sistem & Güvenlik Limitleri
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Aktif Akademik Yıl
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.activeAcademicYear}
                      onChange={(e) =>
                        setSettings({ ...settings, activeAcademicYear: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Oturum Zaman Aşımı (dk)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      required
                      value={settings.inactivityTimeoutMinutes}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          inactivityTimeoutMinutes: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Öğrenci Azami PDF (MB)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      required
                      value={settings.studentMaxFileSizeMb}
                      onChange={(e) =>
                        setSettings({ ...settings, studentMaxFileSizeMb: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {settingsSaved && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Okul kimlik bilgileri ve logosu başarıyla kaydedildi ve sisteme yansıtıldı.</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Okul Ayarlarını & Logoyu Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. SINIFLAR VE DERSLER */}
      {activeTab === 'classes_courses' && (
        <div className="space-y-6">
          {(classNotice || courseNotice) && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{classNotice || courseNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setClassNotice(null);
                  setCourseNotice(null);
                }}
                className="text-emerald-700 hover:text-emerald-900 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Şubeler Kartı */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Aktif Şubeler & Sınıflar ({classrooms.length})</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Toplam {classrooms.length} tanımlı şube
                  </p>
                </div>
                <span className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  2026-2027
                </span>
              </div>

              {/* Yeni Şube Ekleme Formu (Sınıf mevcudu alanı kaldırıldı) */}
              <form onSubmit={handleAddClassroom} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Yeni Şube Tanımla</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Sınıf Düzeyi</label>
                    <select
                      value={newGradeLevel}
                      onChange={(e) => setNewGradeLevel(Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    >
                      <option value={9}>9. Sınıf</option>
                      <option value={10}>10. Sınıf</option>
                      <option value={11}>11. Sınıf</option>
                      <option value={12}>12. Sınıf</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Şube Harfi</label>
                    <select
                      value={newBranchLetter}
                      onChange={(e) => setNewBranchLetter(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white font-bold"
                    >
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((letter) => (
                        <option key={letter} value={letter}>
                          {letter} Şubesi
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Veya Özel İsim (Örn: 10/BİL veya 11/A-ELEK)"
                    value={newCustomClassName}
                    onChange={(e) => setNewCustomClassName(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white font-mono uppercase"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded flex items-center gap-1 shadow-2xs transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Şube Ekle</span>
                  </button>
                </div>
              </form>

              {/* Şube Listesi & Güncelleme Paneli */}
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                {classrooms.map((c) => (
                  <div key={c.id} className="py-2.5 px-2 hover:bg-slate-50 rounded transition-colors">
                    {editingClassId === c.id ? (
                      /* Şube Güncelleme / Düzenleme Satırı */
                      <div className="p-2.5 bg-indigo-50/60 border border-indigo-200 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                          <span>Şube Bilgilerini Güncelle ({c.name})</span>
                          <button
                            type="button"
                            onClick={handleCancelEditClassroom}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-600 mb-0.5">Kademesi</label>
                            <select
                              value={editGradeLevel}
                              onChange={(e) => setEditGradeLevel(Number(e.target.value))}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                            >
                              <option value={9}>9. Sınıf</option>
                              <option value={10}>10. Sınıf</option>
                              <option value={11}>11. Sınıf</option>
                              <option value={12}>12. Sınıf</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-600 mb-0.5">Şube Harfi</label>
                            <select
                              value={editBranchLetter}
                              onChange={(e) => setEditBranchLetter(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-bold"
                            >
                              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((letter) => (
                                <option key={letter} value={letter}>
                                  {letter}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-600 mb-0.5">Şube Adı / Görünüm</label>
                          <input
                            type="text"
                            value={editCustomName}
                            onChange={(e) => setEditCustomName(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-mono uppercase"
                          />
                        </div>
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={handleCancelEditClassroom}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded border border-slate-200"
                          >
                            Vazgeç
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditClassroom(c.id)}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-2xs flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Kaydet</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal Şube Satırı (Sınıf mevcudu kaldırıldı) */
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-slate-900 font-mono text-base">{c.name}</span>
                          <span className="text-[11px] px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded font-semibold">
                            {c.gradeLevel}. Sınıf
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditClassroom(c)}
                            title="Şube Bilgilerini Düzenle"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClassroom(c.id, c.name)}
                            title="Şubeyi Sil"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Dersler Kartı (Dersin Sınıfı / Kademesi Seçilebilir & Güncellenebilir) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span>Tanımlı Dersler ({courses.length})</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Performans görevleri için kullanılabilir aktif müfredat
                  </p>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  MEB Müfredatı
                </span>
              </div>

              {/* Yeni Ders Ekleme Formu */}
              <form onSubmit={handleAddCourse} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Yeni Ders Tanımla</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Ders Kodu</label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: MOB301"
                      value={newCourseCode}
                      onChange={(e) => setNewCourseCode(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Dersin Sınıfı / Şubesi</label>
                    <select
                      value={newCourseTargetClass}
                      onChange={(e) => setNewCourseTargetClass(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white font-semibold text-slate-800"
                    >
                      <option value="Tüm Kademeler">Tüm Kademeler (Ortak)</option>
                      <optgroup label="Sınıf Düzeyleri">
                        <option value="9. Sınıf">9. Sınıflar (Tümü)</option>
                        <option value="10. Sınıf">10. Sınıflar (Tümü)</option>
                        <option value="11. Sınıf">11. Sınıflar (Tümü)</option>
                        <option value="12. Sınıf">12. Sınıflar (Tümü)</option>
                      </optgroup>
                      <optgroup label="Özel Şubeler">
                        {classrooms.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name} Şubesi
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Haftalık Saat</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={newCourseHours}
                      onChange={(e) => setNewCourseHours(Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Ders Adı (Örn: Mobil Uygulama Geliştirme)"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center justify-center gap-1 shadow-2xs transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ders Ekle</span>
                  </button>
                </div>
              </form>

              {/* Ders Listesi & Güncelleme Paneli */}
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                {courses.map((crs) => (
                  <div key={crs.id} className="py-2.5 px-2 hover:bg-slate-50 rounded transition-colors">
                    {editingCourseId === crs.id ? (
                      /* Ders Güncelleme / Düzenleme Satırı */
                      <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                          <span>Dersi Güncelle ({crs.code})</span>
                          <button
                            type="button"
                            onClick={handleCancelEditCourse}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-600 mb-0.5">Ders Kodu</label>
                            <input
                              type="text"
                              value={editCourseCode}
                              onChange={(e) => setEditCourseCode(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-mono uppercase"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-600 mb-0.5">Dersin Sınıfı</label>
                            <select
                              value={editCourseTargetClass}
                              onChange={(e) => setEditCourseTargetClass(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-semibold text-slate-800"
                            >
                              <option value="Tüm Kademeler">Tüm Kademeler (Ortak)</option>
                              <optgroup label="Sınıf Düzeyleri">
                                <option value="9. Sınıf">9. Sınıflar (Tümü)</option>
                                <option value="10. Sınıf">10. Sınıflar (Tümü)</option>
                                <option value="11. Sınıf">11. Sınıflar (Tümü)</option>
                                <option value="12. Sınıf">12. Sınıflar (Tümü)</option>
                              </optgroup>
                              <optgroup label="Özel Şubeler">
                                {classrooms.map((c) => (
                                  <option key={c.id} value={c.name}>
                                    {c.name} Şubesi
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-600 mb-0.5">Haftalık Saat</label>
                            <input
                              type="number"
                              min="1"
                              max="12"
                              value={editCourseHours}
                              onChange={(e) => setEditCourseHours(Number(e.target.value))}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-mono"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-600 mb-0.5">Ders Adı</label>
                          <input
                            type="text"
                            value={editCourseName}
                            onChange={(e) => setEditCourseName(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={handleCancelEditCourse}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded border border-slate-200"
                          >
                            Vazgeç
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditCourse(crs.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-2xs flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Kaydet</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal Ders Satırı */
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              {crs.code}
                            </span>
                            <span className="font-semibold text-slate-900">{crs.name}</span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                              {crs.targetClassName || 'Tüm Kademeler'}
                            </span>
                          </div>
                          <span className="text-slate-500 text-[11px] block mt-0.5">{crs.hours} Saat / Hafta</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditCourse(crs)}
                            title="Ders Bilgilerini Düzenle"
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCourse(crs.id, crs.code)}
                            title="Dersi Sil"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ÖĞRETMEN YETKİLENDİRME MATRİSİ */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Öğretmen Sınıf & Ders Yetkilendirmeleri
              </h3>
              <p className="text-xs text-slate-500">
                Öğretmenler yalnızca burada tanımlı eşleşmeler için görev dağıtabilir (RLS & Trigger Korumalı).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Öğretmen</th>
                  <th className="p-3">Yetkili Sınıf</th>
                  <th className="p-3">Ders Kodu & Adı</th>
                  <th className="p-3">Akademik Yıl</th>
                  <th className="p-3 text-right">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permissions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{p.teacherName}</td>
                    <td className="p-3 font-bold text-indigo-700">{p.classroomName}</td>
                    <td className="p-3 text-slate-800">{p.courseCode} · {p.courseName}</td>
                    <td className="p-3 text-slate-600 font-mono">{p.academicYear}</td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold text-[11px]">
                        Yetkili
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. AKTİVASYON KODLARI */}
      {activeTab === 'activation_codes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Öğrenci İçin Tek Kullanımlık Güvenli Aktivasyon Kodu Üret
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Öğrenci ilk kaydında okul numarasını ve bu tek kullanımlık aktivasyon kodunu doğrulamak zorundadır.
            </p>

            <form onSubmit={handleGenerateActivationCode} className="flex gap-3 max-w-md">
              <input
                type="text"
                required
                placeholder="Öğrenci Okul No (Örn: 1046)"
                value={newSchoolNum}
                onChange={(e) => setNewSchoolNum(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Kod Üret</span>
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3">Okul No</th>
                    <th className="p-3">Aktivasyon Kodu</th>
                    <th className="p-3">Oluşturulma</th>
                    <th className="p-3">Kullanım Durumu</th>
                    <th className="p-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activationCodes.map((code) => (
                    <tr key={code.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{code.schoolNumber}</td>
                      <td className="p-3 font-mono font-bold text-indigo-700 tracking-wider">
                        {code.code}
                      </td>
                      <td className="p-3 text-slate-600">{code.createdAt}</td>
                      <td className="p-3">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                            code.isUsed
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {code.isUsed ? `Kullanıldı (${code.usedBy || 'Öğrenci'})` : 'Kullanıma Hazır'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {!code.isUsed && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(code.code)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-xs inline-flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedCode === code.code ? 'Kopyalandı!' : 'Kopyala'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4.5. TOPLU ÖĞRENCİ AKTARIMI (EXCEL / e-OKUL) - AŞAMA 4 */}
      {activeTab === 'excel_import' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                    Aşama 4: e-Okul / Excel Toplu Aktarım
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500">Kupon & Aktivasyon Üretici</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span>Toplu Öğrenci İçe Aktarımı ve Aktivasyon Kuponu Dağıtımı</span>
                </h3>
                <p className="text-xs text-slate-500">
                  e-Okul sisteminden kopyalanan veya Excel&apos;den alınan öğrenci listesini yapıştırıp tek tıkla aktivasyon kodları üretebilir ve rehber öğretmene teslim edilecek kuponları yazdırabilirsiniz.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleLoadSampleEokulList()}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors flex items-center gap-2 shadow-2xs cursor-pointer"
                  title={`${selectedImportClass} şubesi için 8 örnek e-Okul öğrencisi yükler`}
                >
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Örnek {selectedImportClass} Listesi Yükle (8 Öğrenci)</span>
                </button>
              </div>
            </div>

            {/* Bildirim Alanı */}
            {importNotice && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">{importNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setImportNotice(null)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Veri Giriş Alanı */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div className="lg:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Öğrenci Verisi (Excel Hücrelerini Buraya Yapıştırın veya CSV Metni Girin)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Format: Okul No [Tab/Virgül] Adı Soyadı [Tab] Şube [Tab] Cinsiyet
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={rawCsvText}
                  onChange={(e) => handleParseCsvInput(e.target.value)}
                  placeholder={`1046\tEmre Çelik\t${selectedImportClass}\tE\n1047\tSelin Doğan\t${selectedImportClass}\tK\n1048\tBurak Şahin\t${selectedImportClass}\tE`}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Hedef Sınıf / Şube
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingQuickClass(!isAddingQuickClass)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isAddingQuickClass ? 'Kapat' : '+ Yeni Şube Ekle'}</span>
                    </button>
                  </div>

                  {/* Kademeli Düzey Filtreleme Butonları */}
                  <div className="flex items-center gap-1 mb-2">
                    {(['ALL', '9', '10', '11', '12'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setExcelGradeFilter(lvl)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                          excelGradeFilter === lvl
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {lvl === 'ALL' ? 'Tümü' : `${lvl}. Sınıf`}
                      </button>
                    ))}
                  </div>

                  {/* Şube Seçim Açılır Menüsü */}
                  <select
                    value={selectedImportClass}
                    onChange={(e) => {
                      setSelectedImportClass(e.target.value);
                      if (rawCsvText) handleParseCsvInput(rawCsvText);
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {classrooms
                      .filter((c) => excelGradeFilter === 'ALL' || String(c.gradeLevel) === excelGradeFilter)
                      .map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name} Şubesi ({c.gradeLevel}. Sınıf · Mevcut: {c.studentCount} Öğrenci)
                        </option>
                      ))}
                  </select>

                  {/* Hızlı Şube Ekleme Çekmecesi */}
                  {isAddingQuickClass && (
                    <div className="mt-2.5 p-2.5 bg-white border border-indigo-200 rounded-lg shadow-2xs space-y-2 animate-in fade-in duration-150">
                      <div className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                        <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Hızlı Şube Ekle</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Sınıf</label>
                          <select
                            value={quickGrade}
                            onChange={(e) => setQuickGrade(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                          >
                            <option value="9">9. Sınıf</option>
                            <option value="10">10. Sınıf</option>
                            <option value="11">11. Sınıf</option>
                            <option value="12">12. Sınıf</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Şube</label>
                          <select
                            value={quickBranchLetter}
                            onChange={(e) => setQuickBranchLetter(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-bold"
                          >
                            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((l) => (
                              <option key={l} value={l}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Veya Özel İsim (Örn: 10/D veya 11/BİL)"
                        value={quickCustomClass}
                        onChange={(e) => setQuickCustomClass(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded uppercase font-mono"
                      />
                      <div className="flex gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleQuickAddBranch()}
                          className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded shadow-2xs"
                        >
                          Ekle ve Seç
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingQuickClass(false)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] rounded"
                        >
                          Vazgeç
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hızlı Seçim Butonları (Pills) */}
                  <div className="mt-2.5">
                    <span className="text-[10px] text-slate-400 block mb-1">Hızlı Şube Değiştir:</span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-0.5">
                      {classrooms
                        .filter((c) => excelGradeFilter === 'ALL' || String(c.gradeLevel) === excelGradeFilter)
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedImportClass(c.name);
                              if (rawCsvText) handleParseCsvInput(rawCsvText);
                            }}
                            className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded transition-colors ${
                              selectedImportClass === c.name
                                ? 'bg-indigo-700 text-white shadow-2xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-600 space-y-1 bg-white p-2 rounded border border-slate-200">
                    <p className="font-bold text-slate-700">Aktif Seçim: <span className="text-indigo-600 font-mono">{selectedImportClass}</span></p>
                    <p className="flex items-center gap-1 text-slate-500">
                      <span className="text-emerald-600 font-bold">✓</span> Otomatik AKT-XXXX-YYYY kod üretimi
                    </p>
                    <p className="flex items-center gap-1 text-slate-500">
                      <span className="text-emerald-600 font-bold">✓</span> Mükerrer okul no koruması
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleGenerateAllCodes}
                    disabled={importedStudents.length === 0}
                    className="flex-1 px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 text-xs font-semibold rounded-md transition-colors"
                  >
                    Kodları Yenile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRawCsvText('');
                      setImportedStudents([]);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-md transition-colors"
                  >
                    Temizle
                  </button>
                </div>
              </div>
            </div>

            {/* Önizleme Tablosu */}
            {importedStudents.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Önizleme Listesi ({importedStudents.length} Kayıt)
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">
                      {importedStudents.filter((s) => s.status === 'valid').length} Geçerli
                    </span>
                    {importedStudents.some((s) => s.status !== 'valid') && (
                      <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-semibold">
                        {importedStudents.filter((s) => s.status !== 'valid').length} Uyarı / Mükerrer
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleDownloadDistributionCsv}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Excel / CSV İndir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsVoucherModalOpen(true)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Rehber Öğretmen Dağıtım Kuponları</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCommitStudentsToSystem}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Sisteme Aktar ({importedStudents.filter((s) => s.status === 'valid').length} Öğrenci)</span>
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px] sticky top-0">
                        <tr>
                          <th className="p-2.5 text-center w-10">#</th>
                          <th className="p-2.5">Okul No</th>
                          <th className="p-2.5">Adı Soyadı</th>
                          <th className="p-2.5">Sınıf</th>
                          <th className="p-2.5 text-center">Cinsiyet</th>
                          <th className="p-2.5">Üretilen Aktivasyon Kodu</th>
                          <th className="p-2.5 text-right">Doğrulama Durumu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importedStudents.map((st, idx) => (
                          <tr
                            key={st.id}
                            className={`hover:bg-slate-50 ${
                              st.status !== 'valid' ? 'bg-amber-50/40' : ''
                            }`}
                          >
                            <td className="p-2.5 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-slate-900">
                              {st.schoolNumber}
                            </td>
                            <td className="p-2.5 font-semibold text-slate-800">{st.fullName}</td>
                            <td className="p-2.5 font-medium text-slate-700">{st.classroomName}</td>
                            <td className="p-2.5 text-center font-bold text-slate-600">
                              {st.gender}
                            </td>
                            <td className="p-2.5">
                              {st.activationCode ? (
                                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                  {st.activationCode}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Üretilmedi</span>
                              )}
                            </td>
                            <td className="p-2.5 text-right">
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                                  st.status === 'valid'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : st.status === 'duplicate_in_file'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {st.statusMessage}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. ÖĞRETMEN BAŞVURULARI */}
      {activeTab === 'applications' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Okula Yeni Atanan / Başvuran Öğretmen Adayları
            </h3>
            <p className="text-xs text-slate-500">
              Başvurusu onaylanan öğretmenlere sistem daveti e-postası iletilecektir.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {applications.map((app) => (
              <div key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{app.fullName}</span>
                    <span className="text-xs text-slate-500">({app.email})</span>
                  </div>
                  <div className="text-xs font-semibold text-indigo-700 mt-0.5">
                    Branş: {app.branchSubject}
                  </div>
                  {app.notes && (
                    <p className="text-xs text-slate-600 mt-1 italic">&quot;{app.notes}&quot;</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {app.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRejectTeacher(app.id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-200 transition-colors"
                      >
                        Reddet
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveTeacher(app.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
                      >
                        Başvuruyu Onayla
                      </button>
                    </>
                  ) : (
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                        app.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {app.status === 'approved' ? '✓ Onaylandı' : '✕ Reddedildi'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. PUAN DEĞİŞİKLİK GÜNLÜĞÜ (AUDIT LOG) */}
      {activeTab === 'audit_log' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Resmi Not Değişiklik Denetim Günlüğü (grade_change_logs)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Kesinleşmiş notlarda yapılan tüm müdahaleler, eski puan, yeni puan ve öğretmen gerekçesiyle kayıt altına alınır (Değiştirilemez/Silinemez).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Tarih / Saat</th>
                  <th className="p-3">Öğrenci</th>
                  <th className="p-3">Görev</th>
                  <th className="p-3 text-center">Eski Puan</th>
                  <th className="p-3 text-center">Yeni Puan</th>
                  <th className="p-3">Değiştiren</th>
                  <th className="p-3">Resmi Gerekçe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-600 font-mono text-[11px]">
                      {log.timestamp.replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="p-3 font-semibold text-slate-900">{log.studentName}</td>
                    <td className="p-3 text-slate-700">{log.taskTitle}</td>
                    <td className="p-3 text-center font-mono text-slate-500 font-bold">
                      {log.oldScore.toFixed(1)}
                    </td>
                    <td className="p-3 text-center font-mono text-indigo-700 font-bold">
                      {log.newScore.toFixed(1)}
                    </td>
                    <td className="p-3 text-slate-700">{log.changedBy}</td>
                    <td className="p-3 text-slate-800 italic max-w-xs">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. ÖĞRENCİ AKTİVASYON KUPONLARI YAZDIRMA MODALI */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Üst Barı */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-indigo-600" />
                  <span>Sınıf Rehber Öğretmenine Teslim Edilecek Öğrenci Aktivasyon Fişleri</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {settings.schoolName} · {selectedImportClass} Şubesi ({importedStudents.filter((s) => s.activationCode).length} Öğrenci Fişi)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Yazdır / PDF Kaydet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Kapat
                </button>
              </div>
            </div>

            {/* Fiş Izgarası */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {importedStudents
                  .filter((s) => s.activationCode)
                  .map((st) => (
                    <div
                      key={st.id}
                      className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-4 shadow-2xs flex flex-col justify-between relative hover:border-indigo-400 transition-colors"
                    >
                      <div className="border-b border-slate-100 pb-2 mb-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <span>T.C. MİLLÎ EĞİTİM BAKANLIĞI</span>
                          <span className="text-indigo-600">{st.classroomName} ŞUBESİ</span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                          {settings.schoolName}
                        </div>
                      </div>

                      <div className="space-y-1.5 py-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Öğrenci No:</span>
                          <span className="font-mono font-bold text-slate-900">{st.schoolNumber}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Adı Soyadı:</span>
                          <span className="font-semibold text-slate-800">{st.fullName}</span>
                        </div>

                        <div className="mt-3 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
                          <span className="text-[10px] uppercase font-semibold text-indigo-700 block tracking-wider">
                            Tek Kullanımlık Aktivasyon Kodu
                          </span>
                          <span className="font-mono text-base font-extrabold text-indigo-900 tracking-wider">
                            {st.activationCode}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-500 leading-tight">
                        <p className="font-medium text-slate-600">İlk Giriş Talimatı:</p>
                        <p>1. Sisteme bağlanıp &quot;Giriş & Aktivasyon&quot; sekmesine tıklayın.</p>
                        <p>2. Okul Numaranızı ve bu kodu girerek kendi şifrenizi oluşturun.</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
