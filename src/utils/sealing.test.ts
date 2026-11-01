/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Mühürleme (Bootstrap Sealing) ve Okul Kimliği / Logo Servisi Birim Testleri
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sealSystemWithAdmin,
  resetSealingForBootstrap,
  loadSchoolProfileConfig,
  saveSchoolProfileConfig,
  loadSealingInfo,
  LOGO_PRESETS,
  DEFAULT_SCHOOL_CONFIG,
} from '../lib/schoolConfigService';

test('1. Sistem alevent1917@gmail.com ile mühürlendiğinde yönetici yetkisi ve durum kilitlenir', () => {
  const result = sealSystemWithAdmin({
    adminEmail: 'alevent1917@gmail.com',
    adminName: 'Levent A. (Okul Müdürü)',
    bootstrapToken: 'BOOTSTRAP_TOKEN_2026',
    schoolName: 'Kadıköy Mesleki ve Teknik Anadolu Lisesi',
    institutionCode: '974125',
    provinceDistrict: 'İstanbul / Kadıköy',
    schoolType: 'Mesleki ve Teknik Anadolu Lisesi',
    logoUrl: LOGO_PRESETS[0].dataUrl,
    academicYear: '2026-2027',
  });

  assert.strictEqual(result.sealingInfo.isSealed, true);
  assert.strictEqual(result.sealingInfo.sealedAdminEmail, 'alevent1917@gmail.com');
  assert.strictEqual(result.sealingInfo.sealedAdminName, 'Levent A. (Okul Müdürü)');
  assert.strictEqual(result.schoolConfig.schoolName, 'Kadıköy Mesleki ve Teknik Anadolu Lisesi');
  assert.strictEqual(result.schoolConfig.institutionCode, '974125');
  assert.strictEqual(result.schoolConfig.provinceDistrict, 'İstanbul / Kadıköy');
  assert.ok(result.schoolConfig.logoUrl.startsWith('data:image/svg+xml'));
});

test('2. MEB ve okul logo şablonları geçerli SVG veri URL formatındadır', () => {
  assert.ok(LOGO_PRESETS.length >= 4);
  const mebLogo = LOGO_PRESETS.find((p) => p.id === 'meb_official');
  assert.ok(mebLogo, 'MEB resmî logosu şablonlarda bulunmalıdır');
  assert.ok(mebLogo.dataUrl.startsWith('data:image/svg+xml'));
  assert.ok(mebLogo.dataUrl.includes('%3Csvg') || mebLogo.dataUrl.includes('<svg'));

  const techLogo = LOGO_PRESETS.find((p) => p.id === 'vocational_tech');
  assert.ok(techLogo, 'Teknik lise arması bulunmalıdır');
  assert.ok(techLogo.dataUrl.startsWith('data:image/svg+xml'));
});

test('3. Okul kimliği ve özel logo güncellemesi başarıyla kaydedilir', () => {
  const customLogoUrl = 'https://meb.gov.tr/assets/img/custom-logo.png';
  const updated = saveSchoolProfileConfig({
    schoolName: 'Ankara Fen ve Bilişim Lisesi',
    institutionCode: '985412',
    provinceDistrict: 'Ankara / Çankaya',
    logoUrl: customLogoUrl,
  });

  assert.strictEqual(updated.schoolName, 'Ankara Fen ve Bilişim Lisesi');
  assert.strictEqual(updated.institutionCode, '985412');
  assert.strictEqual(updated.provinceDistrict, 'Ankara / Çankaya');
  assert.strictEqual(updated.logoUrl, customLogoUrl);
});

test('4. Mühür sıfırlama (reseal) işlemi mühürü kaldırıp ilk kuruluma dönüşü sağlar', () => {
  resetSealingForBootstrap();
  const sealing = loadSealingInfo();
  assert.strictEqual(sealing.isSealed, false);

  // Yeniden alevent1917@gmail.com ile mühürleme
  const resealed = sealSystemWithAdmin({
    adminEmail: 'alevent1917@gmail.com',
    adminName: 'Levent A. (Okul Müdürü)',
    schoolName: 'Yeniden Yapılandırılan Lise',
  });

  assert.strictEqual(resealed.sealingInfo.isSealed, true);
  assert.strictEqual(resealed.sealingInfo.sealedAdminEmail, 'alevent1917@gmail.com');
});
