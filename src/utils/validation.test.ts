import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCriteriaTotal,
  validateCriteriaSum,
  validateCriterionScore,
  calculateTotalScore,
  validateActivationCodeFormat,
  validateStudentPdfFile,
  validateTeacherFile,
  formatTurkishDate,
  sanitizeArchiveFileName,
} from './validation';

test('calculateCriteriaTotal sums up criteria correctly', () => {
  const criteria = [
    { maxPoints: 20 },
    { maxPoints: 30 },
    { maxPoints: 25.5 },
    { maxPoints: 24.5 },
  ];
  assert.equal(calculateCriteriaTotal(criteria), 100);
});

test('validateCriteriaSum validates 100 maxPoints requirement strictly', () => {
  const validCriteria = [
    { maxPoints: 40 },
    { maxPoints: 30 },
    { maxPoints: 30 },
  ];
  const validResult = validateCriteriaSum(validCriteria);
  assert.equal(validResult.isValid, true);
  assert.equal(validResult.total, 100);

  const invalidCriteria = [
    { maxPoints: 40 },
    { maxPoints: 30 },
    { maxPoints: 25 },
  ];
  const invalidResult = validateCriteriaSum(invalidCriteria);
  assert.equal(invalidResult.isValid, false);
  assert.equal(invalidResult.total, 95);
  assert.match(invalidResult.message || '', /100 olmalıdır/);
});

test('validateCriterionScore enforces 0.1 precision and maxPoints bounds', () => {
  // Valid scores
  const res1 = validateCriterionScore(18.5, 20);
  assert.equal(res1.isValid, true);
  assert.equal(res1.normalizedScore, 18.5);

  const res2 = validateCriterionScore(18.54, 20); // rounds to 18.5
  assert.equal(res2.isValid, true);
  assert.equal(res2.normalizedScore, 18.5);

  // Exceeds max points
  const resExceed = validateCriterionScore(25, 20);
  assert.equal(resExceed.isValid, false);

  // Negative score
  const resNegative = validateCriterionScore(-1, 20);
  assert.equal(resNegative.isValid, false);
});

test('calculateTotalScore sums scores with 0.1 precision without float errors', () => {
  const scores = [
    { score: 18.4 },
    { score: 22.3 },
    { score: 29.3 },
    { score: 15.0 },
  ];
  // 18.4 + 22.3 + 29.3 + 15.0 = 85.0
  assert.equal(calculateTotalScore(scores), 85.0);
});

test('validateActivationCodeFormat validates student single-use code formats', () => {
  assert.equal(validateActivationCodeFormat('AKT-9B41-8932'), true);
  assert.equal(validateActivationCodeFormat('ABCD1234EF'), true);
  assert.equal(validateActivationCodeFormat(''), false);
  assert.equal(validateActivationCodeFormat('123'), false); // too short
});

test('validateStudentPdfFile enforces PDF extension, mime, and 15 MB limit', () => {
  // Valid PDF under 15MB
  const validPdf = {
    name: 'odev_raporu.pdf',
    size: 2 * 1024 * 1024,
    type: 'application/pdf',
  };
  assert.equal(validateStudentPdfFile(validPdf).isValid, true);

  // Non-PDF extension
  const invalidExt = {
    name: 'odev.docx',
    size: 2 * 1024 * 1024,
    type: 'application/pdf',
  };
  assert.equal(validateStudentPdfFile(invalidExt).isValid, false);

  // Over 15 MB limit (16 MB)
  const tooLarge = {
    name: 'buyuk_odev.pdf',
    size: 16 * 1024 * 1024,
    type: 'application/pdf',
  };
  const largeRes = validateStudentPdfFile(tooLarge);
  assert.equal(largeRes.isValid, false);
  assert.match(largeRes.error || '', /15 MB/);
});

test('validateTeacherFile enforces 20 MB limit', () => {
  const valid = { name: 'yonerge.pdf', size: 18 * 1024 * 1024 };
  assert.equal(validateTeacherFile(valid).isValid, true);

  const tooLarge = { name: 'proje_kaynak.zip', size: 21 * 1024 * 1024 };
  assert.equal(validateTeacherFile(tooLarge).isValid, false);
});

test('formatTurkishDate formats date as GG.AA.YYYY', () => {
  const testIso = '2026-10-28T09:30:00Z';
  const formatted = formatTurkishDate(testIso);
  assert.equal(formatted.length, 10);
  assert.match(formatted, /^\d{2}\.\d{2}\.\d{4}$/);
});

test('sanitizeArchiveFileName produces clean safe filename for ZIP downloads', () => {
  const fileName = sanitizeArchiveFileName('1042', 'Ali Veli', 'Ağ Topolojisi Raporu', 1);
  assert.equal(fileName.endsWith('.pdf'), true);
  assert.match(fileName, /^1042_Ali_Veli_/);
});
