/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Saf Mantık ve Doğrulama Yardımcıları (Pure Logic & Validation)
 */

import { SYSTEM_DEFAULTS } from '../lib/constants';

/**
 * Ölçüt puanlarının toplamını hesaplar ve 100 olup olmadığını doğrular.
 */
export function calculateCriteriaTotal(criteria: { maxPoints: number }[]): number {
  const sum = criteria.reduce((acc, curr) => acc + (Number(curr.maxPoints) || 0), 0);
  return Math.round(sum * 10) / 10;
}

export function validateCriteriaSum(criteria: { maxPoints: number }[]): {
  isValid: boolean;
  total: number;
  message?: string;
} {
  const total = calculateCriteriaTotal(criteria);
  if (total !== 100) {
    return {
      isValid: false,
      total,
      message: `Ölçütlerin maksimum puanları toplamı tam olarak 100 olmalıdır. Mevcut toplam: ${total}`,
    };
  }
  return { isValid: true, total };
}

/**
 * 0.1 hassasiyetinde puan doğrulama.
 * Sayının 0 ile maxPoints arasında olduğunu ve en fazla 1 ondalık basamağa sahip olduğunu doğrular.
 */
export function validateCriterionScore(
  score: number,
  maxPoints: number
): { isValid: boolean; normalizedScore: number; error?: string } {
  if (isNaN(score) || score < 0) {
    return { isValid: false, normalizedScore: 0, error: 'Puan 0 veya daha büyük bir değer olmalıdır.' };
  }
  if (score > maxPoints) {
    return {
      isValid: false,
      normalizedScore: score,
      error: `Puan bu ölçüt için belirlenen maksimum değeri (${maxPoints}) aşamaz.`,
    };
  }

  // 0.1 hassasiyetini zorunlu kıl (1 ondalık basamağa yuvarla)
  const normalizedScore = Math.round(score * 10) / 10;
  return { isValid: true, normalizedScore };
}

/**
 * Toplam değerlendirme puanını 0.1 hassasiyetinde hesaplar.
 */
export function calculateTotalScore(scores: { score: number }[]): number {
  const total = scores.reduce((acc, item) => acc + (Number(item.score) || 0), 0);
  return Math.round(total * 10) / 10;
}

/**
 * Öğrenci tek kullanımlık aktivasyon kodunu doğrular.
 * Örn: "AKT-9B41-8932" veya 8-16 karakterlik alfanümerik kod.
 */
export function validateActivationCodeFormat(code: string): boolean {
  if (!code) return false;
  const clean = code.trim().toUpperCase();
  // Format: En az 6, en fazla 20 karakter alfanümerik ve isteğe bağlı tire
  const regex = /^[A-Z0-9-]{6,20}$/;
  return regex.test(clean);
}

/**
 * Öğrenci PDF dosya yükleme doğrulaması.
 * Kural: Sadece application/pdf, dosya adı .pdf ile bitmeli, boyut <= 15 MB.
 */
export function validateStudentPdfFile(file: {
  name: string;
  size: number;
  type: string;
}): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'Lütfen bir dosya seçiniz.' };
  }

  const isPdfExtension = file.name.toLowerCase().endsWith('.pdf');
  const isPdfMime = file.type === 'application/pdf' || file.type === '';

  if (!isPdfExtension || !isPdfMime) {
    return { isValid: false, error: 'Yalnızca PDF (.pdf) biçimindeki dosyalar kabul edilmektedir.' };
  }

  if (file.size <= 0) {
    return { isValid: false, error: 'Dosya boş olamaz.' };
  }

  if (file.size > SYSTEM_DEFAULTS.STUDENT_MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `Dosya boyutu en fazla ${SYSTEM_DEFAULTS.STUDENT_MAX_FILE_SIZE_MB} MB olabilir. Seçilen dosya: ${sizeMb} MB.`,
    };
  }

  return { isValid: true };
}

/**
 * Öğretmen kaynak dosyası doğrulaması (20 MB limit).
 */
export function validateTeacherFile(file: {
  name: string;
  size: number;
}): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'Lütfen bir dosya seçiniz.' };
  }

  if (file.size > SYSTEM_DEFAULTS.TEACHER_MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `Öğretmen kaynak dosya boyutu en fazla ${SYSTEM_DEFAULTS.TEACHER_MAX_FILE_SIZE_MB} MB olabilir. Seçilen dosya: ${sizeMb} MB.`,
    };
  }

  return { isValid: true };
}

/**
 * Europe/Istanbul saat diliminde GG.AA.YYYY tarih formatı
 */
export function formatTurkishDate(isoString: string): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
  } catch {
    return '-';
  }
}

/**
 * Europe/Istanbul saat diliminde GG.AA.YYYY SS:dd (24 saat) tarih/saat formatı
 */
export function formatTurkishDateTime(isoString: string): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return '-';
  }
}

/**
 * ZIP indirmeleri için dosya adını güvenli ve standart hale getirir:
 * "[OkulNo]_[OgrenciAdi]_[GorevAdi]_v[SurumNo].pdf"
 */
export function sanitizeArchiveFileName(
  schoolNumber: string,
  studentName: string,
  taskTitle: string,
  versionNumber = 1
): string {
  const sanitize = (str: string) =>
    str
      .trim()
      .replace(/[\s\t\n]+/g, '_')
      .replace(/[^\w\u00C0-\u017F.-]/g, '');

  const safeNum = sanitize(schoolNumber);
  const safeName = sanitize(studentName);
  const safeTitle = sanitize(taskTitle).substring(0, 30);

  return `${safeNum}_${safeName}_${safeTitle}_v${versionNumber}.pdf`;
}
