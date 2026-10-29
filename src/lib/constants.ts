/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Sistem Sabitleri ve Başlangıç Konfigürasyonu
 */

export const INITIAL_ACADEMIC_YEAR = '2026-2027';

export const INITIAL_CLASSES = [
  { name: '9/B', gradeLevel: 9, branch: 'B' },
  { name: '10/B', gradeLevel: 10, branch: 'B' },
  { name: '11/B', gradeLevel: 11, branch: 'B' },
  { name: '12/B', gradeLevel: 12, branch: 'B' },
];

export const INITIAL_COURSES = [
  {
    code: 'PRG101',
    name: 'Programlama Temelleri',
    description: 'Algoritmik düşünme, akış diyagramları, değişkenler, koşul yapıları ve temel programlama pratikleri.',
  },
  {
    code: 'NET201',
    name: 'Ağ Sistemleri ve Anahtarlama',
    description: 'OSI ve TCP/IP modelleri, IP adresleme, yerel ağ topolojileri ve anahtarlama (switching) yapılandırmaları.',
  },
];

export const SYSTEM_DEFAULTS = {
  APP_NAME: 'Performans & Proje Görev Takip Sistemi',
  TIMEZONE: 'Europe/Istanbul',
  STUDENT_MAX_FILE_SIZE_MB: 15,
  STUDENT_MAX_FILE_SIZE_BYTES: 15 * 1024 * 1024,
  TEACHER_MAX_FILE_SIZE_MB: 20,
  TEACHER_MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024,
  ALLOWED_STUDENT_MIME_TYPES: ['application/pdf'],
  ALLOWED_STUDENT_EXTENSIONS: ['.pdf'],
  SESSION_INACTIVITY_TIMEOUT_MINUTES: 30,
  BACKUP_RETENTION_DAYS: 30,
  DEFAULT_REMINDER_DAYS_BEFORE: [3, 1],
};

export const ROLE_LABELS: Record<string, string> = {
  student: 'Öğrenci',
  teacher: 'Öğretmen',
  admin: 'Yönetici',
};

export const TASK_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_submitted: { label: 'Teslim Edilmedi', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  submitted: { label: 'Zamanında Teslim Edildi', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  late_submitted: { label: 'Geç Teslim Edildi', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  paper_reported: { label: 'Kâğıt Teslim Bildirildi (Onay Bekliyor)', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  paper_confirmed: { label: 'Kâğıt Teslim Alındı', color: 'text-teal-700 bg-teal-50 border-teal-200' },
  graded: { label: 'Değerlendirildi', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
};
