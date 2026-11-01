/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Okul Kimliği, Logo Yönetimi ve Mühürleme (Bootstrap Sealing) Servisi
 */

export interface SchoolProfileConfig {
  schoolName: string;
  institutionCode: string; // MEB Kurum Kodu (örn: 974125)
  provinceDistrict: string; // İl / İlçe (örn: İstanbul / Kadıköy)
  schoolType: string; // Okul Türü (örn: Mesleki ve Teknik Anadolu Lisesi)
  logoUrl: string; // Veri URL (base64) veya HTTP bağlantısı
  activeAcademicYear: string; // 2026-2027
  studentMaxFileSizeMb: number; // 15
  teacherMaxFileSizeMb: number; // 20
  inactivityTimeoutMinutes: number; // 30
  reportHeaderTitle: string; // T.C. MİLLÎ EĞİTİM BAKANLIĞI
}

export interface SealingInfo {
  isSealed: boolean;
  sealedAdminEmail: string;
  sealedAdminName: string;
  sealedAt: string;
  bootstrapTokenUsed?: string;
}

const STORAGE_KEYS = {
  SCHOOL_CONFIG: 'perf_task_school_config_v2',
  SEALING_INFO: 'perf_task_sealing_info_v2',
  CLASSROOMS: 'perf_task_classrooms_v4',
  COURSES: 'perf_task_courses_v4',
};

// ==========================================
// 1. MEB VE OKUL VEKTÖREL LOGO HAZIR ŞABLONLARI (SVG Data URLs)
// ==========================================

export const LOGO_PRESETS = [
  {
    id: 'meb_official',
    title: 'MEB Resmî Logosu (Kırmızı / Beyaz Hilal & Meşale)',
    description: 'T.C. Millî Eğitim Bakanlığı resmî kurumsal amblemi',
    dataUrl:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <circle cx="60" cy="60" r="56" fill="#dc2626" stroke="#b91c1c" stroke-width="3"/>
        <circle cx="60" cy="60" r="48" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="3 3"/>
        <!-- Ay-Yıldız -->
        <path d="M52 32 A 16 16 0 1 0 66 58 A 12 12 0 1 1 52 32 Z" fill="#ffffff" />
        <polygon points="69,42 71,46 76,46 72,49 73,53 69,50 65,53 66,49 62,46 67,46" fill="#ffffff" />
        <!-- Açık Kitap & Meşale -->
        <path d="M38 72 Q60 66 60 76 Q60 66 82 72 L80 84 Q60 78 60 88 Q60 78 40 84 Z" fill="#ffffff" />
        <line x1="60" y1="64" x2="60" y2="86" stroke="#dc2626" stroke-width="2"/>
        <path d="M57 60 Q60 52 63 60 Q60 56 57 60 Z" fill="#facc15"/>
      </svg>
    `),
  },
  {
    id: 'vocational_tech',
    title: 'Mesleki ve Teknik Eğitim Arması (Lacivert / Altın Çark & Meşale)',
    description: 'Teknik ve bilişim okullarına özel modern arma',
    dataUrl:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <rect width="120" height="120" rx="24" fill="#1e3a8a"/>
        <circle cx="60" cy="60" r="46" fill="none" stroke="#f59e0b" stroke-width="3"/>
        <!-- Sanayi ve Teknoloji Çarkı -->
        <g stroke="#ffffff" stroke-width="3" fill="none">
          <circle cx="60" cy="60" r="24" fill="#1e3a8a"/>
          <line x1="60" y1="30" x2="60" y2="36" />
          <line x1="60" y1="84" x2="60" y2="90" />
          <line x1="30" y1="60" x2="36" y2="60" />
          <line x1="84" y1="60" x2="90" y2="60" />
          <line x1="39" y1="39" x2="43" y2="43" />
          <line x1="77" y1="77" x2="81" y2="81" />
          <line x1="39" y1="81" x2="43" y2="77" />
          <line x1="77" y1="39" x2="81" y2="43" />
        </g>
        <!-- Merkez Meşale -->
        <circle cx="60" cy="60" r="10" fill="#f59e0b"/>
        <polygon points="60,42 63,52 57,52" fill="#ef4444"/>
      </svg>
    `),
  },
  {
    id: 'academic_laurel',
    title: 'Akademik Başarı Arması (Zümrüt Yeşil & Defne Yaprağı)',
    description: 'Anadolu ve Fen liseleri için klasik defne arması',
    dataUrl:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <rect width="120" height="120" rx="60" fill="#065f46"/>
        <circle cx="60" cy="60" r="48" fill="none" stroke="#fbbf24" stroke-width="2.5"/>
        <!-- Defne çelengi simülasyonu -->
        <path d="M34 68 C 30 45, 45 32, 60 32 C 75 32, 90 45, 86 68 C 82 82, 60 88, 60 88 C 60 88, 38 82, 34 68 Z" fill="none" stroke="#ffffff" stroke-width="2"/>
        <polygon points="60,42 63,50 71,50 65,55 67,63 60,58 53,63 55,55 49,50 57,50" fill="#fbbf24"/>
        <path d="M48 72 L60 64 L72 72 L60 80 Z" fill="#ffffff"/>
      </svg>
    `),
  },
  {
    id: 'cyber_innovation',
    title: 'Bilişim & İnovasyon Kalkanı (Siber Mavi & Ağ Düğümleri)',
    description: 'Yazılım, ağ ve siber güvenlik odaklı amblem',
    dataUrl:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
          </linearGradient>
        </defs>
        <path d="M60 16 L94 28 L94 62 C94 84 60 102 60 102 C60 102 26 84 26 62 L26 28 Z" fill="url(#grad1)"/>
        <path d="M60 22 L88 32 L88 60 C88 78 60 94 60 94 C60 94 32 78 32 60 L32 32 Z" fill="#0f172a" opacity="0.4"/>
        <!-- Ağ bağlantı noktaları -->
        <circle cx="60" cy="46" r="5" fill="#38bdf8"/>
        <circle cx="46" cy="68" r="4" fill="#ffffff"/>
        <circle cx="74" cy="68" r="4" fill="#ffffff"/>
        <line x1="60" y1="46" x2="46" y2="68" stroke="#38bdf8" stroke-width="2"/>
        <line x1="60" y1="46" x2="74" y2="68" stroke="#38bdf8" stroke-width="2"/>
        <line x1="46" y1="68" x2="74" y2="68" stroke="#38bdf8" stroke-width="2"/>
      </svg>
    `),
  },
];

// ==========================================
// 2. VARSAYILAN OKUL VE MÜHÜRLEME VERİLERİ
// ==========================================

export const DEFAULT_SCHOOL_CONFIG: SchoolProfileConfig = {
  schoolName: 'Atatürk Mesleki ve Teknik Anadolu Lisesi',
  institutionCode: '974125',
  provinceDistrict: 'İstanbul / Kadıköy',
  schoolType: 'Mesleki ve Teknik Anadolu Lisesi',
  logoUrl: LOGO_PRESETS[0].dataUrl, // MEB Resmî Logosu varsayılan
  activeAcademicYear: '2026-2027',
  studentMaxFileSizeMb: 15,
  teacherMaxFileSizeMb: 20,
  inactivityTimeoutMinutes: 30,
  reportHeaderTitle: 'T.C. MİLLÎ EĞİTİM BAKANLIĞI',
};

export const DEFAULT_SEALING_INFO: SealingInfo = {
  isSealed: true,
  sealedAdminEmail: 'alevent1917@gmail.com',
  sealedAdminName: 'Levent A. (Okul Müdürü / Yönetici)',
  sealedAt: new Date().toISOString(),
  bootstrapTokenUsed: 'BOOTSTRAP_TOKEN_2026',
};

// ==========================================
// 3. KALICILIK SERVİS FONKSİYONLARI (Bellek + localStorage)
// ==========================================

let memorySchoolConfig: SchoolProfileConfig = { ...DEFAULT_SCHOOL_CONFIG };
let memorySealingInfo: SealingInfo = { ...DEFAULT_SEALING_INFO };

export function loadSchoolProfileConfig(): SchoolProfileConfig {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SCHOOL_CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
        memorySchoolConfig = { ...DEFAULT_SCHOOL_CONFIG, ...parsed };
      }
    } catch (err) {
      console.warn('Okul ayarları localStorage üzerinden okunurken hata:', err);
    }
  }
  return memorySchoolConfig;
}

export function saveSchoolProfileConfig(config: Partial<SchoolProfileConfig>): SchoolProfileConfig {
  const current = loadSchoolProfileConfig();
  const updated = { ...current, ...config };
  memorySchoolConfig = updated;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEYS.SCHOOL_CONFIG, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('school_config_updated', { detail: updated }));
    } catch (err) {
      console.warn('Okul ayarları kaydedilirken hata:', err);
    }
  }
  return updated;
}

export function loadSealingInfo(): SealingInfo {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SEALING_INFO);
      if (raw) {
        const parsed = JSON.parse(raw);
        memorySealingInfo = { ...DEFAULT_SEALING_INFO, ...parsed };
      }
    } catch (err) {
      console.warn('Mühürleme bilgisi localStorage üzerinden okunurken hata:', err);
    }
  }
  return memorySealingInfo;
}

export function saveSealingInfo(info: Partial<SealingInfo>): SealingInfo {
  const current = loadSealingInfo();
  const updated = { ...current, ...info };
  memorySealingInfo = updated;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEYS.SEALING_INFO, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('sealing_info_updated', { detail: updated }));
    } catch (err) {
      console.warn('Mühürleme bilgisi kaydedilirken hata:', err);
    }
  }
  return updated;
}

/**
 * Sistemi yeni bir kullanıcı ve yeni okul bilgileriyle mühürler
 */
export function sealSystemWithAdmin(params: {
  adminEmail: string;
  adminName: string;
  bootstrapToken?: string;
  schoolName: string;
  institutionCode?: string;
  provinceDistrict?: string;
  schoolType?: string;
  logoUrl?: string;
  academicYear?: string;
}): { schoolConfig: SchoolProfileConfig; sealingInfo: SealingInfo } {
  const schoolConfig = saveSchoolProfileConfig({
    schoolName: params.schoolName,
    institutionCode: params.institutionCode || '974125',
    provinceDistrict: params.provinceDistrict || 'İstanbul / Kadıköy',
    schoolType: params.schoolType || 'Mesleki ve Teknik Anadolu Lisesi',
    logoUrl: params.logoUrl || LOGO_PRESETS[0].dataUrl,
    activeAcademicYear: params.academicYear || '2026-2027',
  });

  const sealingInfo = saveSealingInfo({
    isSealed: true,
    sealedAdminEmail: params.adminEmail,
    sealedAdminName: params.adminName,
    sealedAt: new Date().toISOString(),
    bootstrapTokenUsed: params.bootstrapToken || 'BOOTSTRAP_TOKEN_2026',
  });

  return { schoolConfig, sealingInfo };
}

/**
 * Mühürü kaldırır ve sistemi yeniden ilk kurulum moduna açar
 */
export function resetSealingForBootstrap(): void {
  saveSealingInfo({
    isSealed: false,
  });
}

// ==========================================
// 4. ŞUBE (SINIF) VE DERS VERİ YÖNETİMİ
// ==========================================

export interface ClassroomItem {
  id: string;
  name: string;
  gradeLevel: number;
  branch: string;
  studentCount: number;
}

export interface CourseItem {
  id: string;
  code: string;
  name: string;
  hours: number;
  targetClassName?: string; // Sınıf / Düzey seçimi (örn: 10. Sınıf, 10/B, Tüm Kademeler)
}

export const DEFAULT_CLASSROOMS: ClassroomItem[] = [
  { id: 'cl-9a', name: '9/A', gradeLevel: 9, branch: 'A', studentCount: 32 },
  { id: 'cl-9b', name: '9/B', gradeLevel: 9, branch: 'B', studentCount: 34 },
  { id: 'cl-9c', name: '9/C', gradeLevel: 9, branch: 'C', studentCount: 30 },
  { id: 'cl-10a', name: '10/A', gradeLevel: 10, branch: 'A', studentCount: 31 },
  { id: 'cl-10b', name: '10/B', gradeLevel: 10, branch: 'B', studentCount: 34 },
  { id: 'cl-10c', name: '10/C', gradeLevel: 10, branch: 'C', studentCount: 29 },
  { id: 'cl-11a', name: '11/A', gradeLevel: 11, branch: 'A', studentCount: 33 },
  { id: 'cl-11b', name: '11/B', gradeLevel: 11, branch: 'B', studentCount: 32 },
  { id: 'cl-11c', name: '11/C', gradeLevel: 11, branch: 'C', studentCount: 28 },
  { id: 'cl-12a', name: '12/A', gradeLevel: 12, branch: 'A', studentCount: 30 },
  { id: 'cl-12b', name: '12/B', gradeLevel: 12, branch: 'B', studentCount: 36 },
  { id: 'cl-12c', name: '12/C', gradeLevel: 12, branch: 'C', studentCount: 27 },
];

export const DEFAULT_COURSES: CourseItem[] = [
  { id: 'crs-1', code: 'PRG101', name: 'Programlama Temelleri', hours: 4, targetClassName: '10. Sınıf' },
  { id: 'crs-2', code: 'NET201', name: 'Ağ Sistemleri ve Anahtarlama', hours: 6, targetClassName: '11. Sınıf' },
  { id: 'crs-3', code: 'WEB301', name: 'Web Tabanlı Uygulama Geliştirme', hours: 5, targetClassName: '11. Sınıf' },
  { id: 'crs-4', code: 'VER401', name: 'Veritabanı Yönetimi ve SQL', hours: 4, targetClassName: '10. Sınıf' },
  { id: 'crs-5', code: 'SBR501', name: 'Siber Güvenlik Temelleri', hours: 3, targetClassName: '12. Sınıf' },
  { id: 'crs-6', code: 'ROB601', name: 'Robotik Kodlama ve Nesnelerin İnterneti', hours: 4, targetClassName: '9. Sınıf' },
];

let memoryClassrooms: ClassroomItem[] = [...DEFAULT_CLASSROOMS];
let memoryCourses: CourseItem[] = [...DEFAULT_COURSES];

export function loadClassrooms(): ClassroomItem[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CLASSROOMS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryClassrooms = parsed;
          return memoryClassrooms;
        }
      }
    } catch (err) {
      console.warn('Sınıf listesi okunurken hata:', err);
    }
  }
  return memoryClassrooms;
}

export function saveClassrooms(items: ClassroomItem[]): ClassroomItem[] {
  memoryClassrooms = items;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(items));
    } catch (err) {
      console.warn('Sınıf listesi kaydedilirken hata:', err);
    }
  }
  return items;
}

export function addClassroomIfMissing(rawName: string): { classrooms: ClassroomItem[]; added: boolean; item: ClassroomItem } {
  const current = loadClassrooms();
  const normalized = rawName.trim().toUpperCase();
  const existing = current.find((c) => c.name.toUpperCase() === normalized);
  if (existing) {
    return { classrooms: current, added: false, item: existing };
  }
  const parts = normalized.split('/');
  const grade = parseInt(parts[0], 10) || 9;
  const branch = (parts[1] || 'A').toUpperCase();
  const newItem: ClassroomItem = {
    id: `cl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: normalized,
    gradeLevel: grade,
    branch,
    studentCount: 0,
  };
  const updated = [...current, newItem].sort((a, b) => {
    if (a.gradeLevel !== b.gradeLevel) return a.gradeLevel - b.gradeLevel;
    return a.branch.localeCompare(b.branch);
  });
  saveClassrooms(updated);
  return { classrooms: updated, added: true, item: newItem };
}

export function loadCourses(): CourseItem[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.COURSES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCourses = parsed;
          return memoryCourses;
        }
      }
    } catch (err) {
      console.warn('Ders listesi okunurken hata:', err);
    }
  }
  return memoryCourses;
}

export function saveCourses(items: CourseItem[]): CourseItem[] {
  memoryCourses = items;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(items));
    } catch (err) {
      console.warn('Ders listesi kaydedilirken hata:', err);
    }
  }
  return items;
}

export function updateClassroom(id: string, updates: Partial<ClassroomItem>): ClassroomItem[] {
  const current = loadClassrooms();
  const updated = current
    .map((c) => (c.id === id ? { ...c, ...updates } : c))
    .sort((a, b) => {
      if (a.gradeLevel !== b.gradeLevel) return a.gradeLevel - b.gradeLevel;
      return a.branch.localeCompare(b.branch);
    });
  saveClassrooms(updated);
  return updated;
}

export function updateCourse(id: string, updates: Partial<CourseItem>): CourseItem[] {
  const current = loadCourses();
  const updated = current.map((crs) => (crs.id === id ? { ...crs, ...updates } : crs));
  saveCourses(updated);
  return updated;
}


