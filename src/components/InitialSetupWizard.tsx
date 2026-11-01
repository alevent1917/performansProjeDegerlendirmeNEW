/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Bölüm 6: Güvenli İlk Kurulum Sihirbazı (Initial Setup Wizard)
 * alevent1917@gmail.com veya özel yönetici ile sistem mühürleme ve okul kimliği özelleştirmesi.
 */

import React, { useState } from 'react';
import {
  School,
  Shield,
  Layers,
  BookOpen,
  CheckCircle2,
  Lock,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  Check,
  Building,
  MapPin,
  Hash,
  Sparkles,
} from 'lucide-react';
import { INITIAL_ACADEMIC_YEAR, INITIAL_CLASSES, INITIAL_COURSES } from '../lib/constants';
import { LOGO_PRESETS, DEFAULT_SCHOOL_CONFIG } from '../lib/schoolConfigService';

interface InitialSetupWizardProps {
  initialEmail?: string;
  initialName?: string;
  onComplete: (setupData: {
    adminEmail: string;
    adminName: string;
    adminPassword?: string;
    bootstrapToken?: string;
    schoolName: string;
    institutionCode: string;
    provinceDistrict: string;
    schoolType: string;
    logoUrl?: string;
    academicYear: string;
    classes: typeof INITIAL_CLASSES;
    courses: typeof INITIAL_COURSES;
  }) => void;
}

export const InitialSetupWizard: React.FC<InitialSetupWizardProps> = ({
  initialEmail = 'alevent1917@gmail.com',
  initialName = 'Levent A. (Okul Müdürü)',
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // 1. Yönetici Hesabı State
  const [adminName, setAdminName] = useState(initialName);
  const [adminEmail, setAdminEmail] = useState(initialEmail);
  const [adminPassword, setAdminPassword] = useState('Yonetici2026!');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('Yonetici2026!');
  const [bootstrapToken, setBootstrapToken] = useState('BOOTSTRAP_TOKEN_2026');

  // 2. Okul Kimliği ve Logo State
  const [schoolName, setSchoolName] = useState(DEFAULT_SCHOOL_CONFIG.schoolName);
  const [institutionCode, setInstitutionCode] = useState(DEFAULT_SCHOOL_CONFIG.institutionCode);
  const [provinceDistrict, setProvinceDistrict] = useState(DEFAULT_SCHOOL_CONFIG.provinceDistrict);
  const [schoolType, setSchoolType] = useState(DEFAULT_SCHOOL_CONFIG.schoolType);
  const [logoUrl, setLogoUrl] = useState<string>(LOGO_PRESETS[0].dataUrl);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('meb_official');
  const [academicYear, setAcademicYear] = useState(INITIAL_ACADEMIC_YEAR);

  // 3. Sınıf ve Dersler
  const [classes] = useState(INITIAL_CLASSES);
  const [courses] = useState(INITIAL_COURSES);
  const [error, setError] = useState<string | null>(null);

  // Cihazdan Logo Dosyası Yükleme İşleyicisi
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Lütfen geçerli bir resim dosyası seçiniz (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError('Logo dosyası boyutu 3 MB değerinden küçük olmalıdır.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result);
        setSelectedPresetId('custom_upload');
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!adminName.trim() || !adminEmail.trim()) {
      setError('Lütfen yönetici adı ve e-posta adresini eksiksiz giriniz.');
      return;
    }
    if (adminPassword.length < 8) {
      setError('Yönetici şifresi güvenlik gereği en az 8 karakter olmalıdır.');
      return;
    }
    if (adminPassword !== adminPasswordConfirm) {
      setError('Şifre ve şifre onayı birbiriyle eşleşmiyor.');
      return;
    }
    if (!bootstrapToken.trim()) {
      setError('Kurulum Güvenlik Belirtecini (Bootstrap Token) giriniz.');
      return;
    }

    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!schoolName.trim()) {
      setError('Lütfen resmî okul adını giriniz.');
      return;
    }
    if (!institutionCode.trim()) {
      setError('Lütfen MEB Kurum Kodunu giriniz.');
      return;
    }

    setStep(3);
  };

  const handleFinalSubmit = () => {
    onComplete({
      adminEmail: adminEmail.trim(),
      adminName: adminName.trim(),
      adminPassword,
      bootstrapToken,
      schoolName: schoolName.trim(),
      institutionCode: institutionCode.trim(),
      provinceDistrict: provinceDistrict.trim(),
      schoolType,
      logoUrl: logoUrl || undefined,
      academicYear,
      classes,
      courses,
    });
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
      {/* İlerleme Çubuğu */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between text-xs font-semibold">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              1
            </span>
            <span>Mühür Yetkilisi ({adminEmail || 'Yönetici'})</span>
          </div>
          <div className="w-10 sm:w-16 h-0.5 bg-slate-200" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </span>
            <span>Okul Bilgileri & Logo</span>
          </div>
          <div className="w-10 sm:w-16 h-0.5 bg-slate-200" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </span>
            <span>Onay ve Mühürleme</span>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs leading-relaxed">
            {error}
          </div>
        )}

        {/* =========================================================================
            ADIM 1: İLK YÖNETİCİ HESABI VE MÜHÜRLEME SAHİBİ
        ========================================================================= */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  1. Mühür Sahibi Yönetici Hesabını Tanımlayın
                </h3>
                <p className="text-xs text-slate-500">
                  Sistemi mühürleyecek yetkili hesabı belirleyin. Mühürleme sonrasında genel kayıtlar kapanır.
                </p>
              </div>
            </div>

            {/* Hızlı Seçim Butonları */}
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3.5 text-xs">
              <div className="font-semibold text-indigo-950 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Tek Tıkla Hazır Profil Yükleyin:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdminName('Levent A. (Okul Müdürü)');
                    setAdminEmail('alevent1917@gmail.com');
                    setAdminPassword('Yonetici2026!');
                    setAdminPasswordConfirm('Yonetici2026!');
                    setBootstrapToken('BOOTSTRAP_TOKEN_2026');
                    setError(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                    adminEmail === 'alevent1917@gmail.com'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                      : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>alevent1917@gmail.com (Önerilen)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminName('Dr. Ahmet Yılmaz (Müdür)');
                    setAdminEmail('yonetici@okul.k12.tr');
                    setAdminPassword('Yonetici2026!');
                    setAdminPasswordConfirm('Yonetici2026!');
                    setBootstrapToken('BOOTSTRAP_TOKEN_2026');
                    setError(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    adminEmail === 'yonetici@okul.k12.tr'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>yonetici@okul.k12.tr (Demo MEB)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Yönetici Adı ve Soyadı *
                </label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Örn: Levent A. (Okul Müdürü)"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Yönetici E-posta Adresi *
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="alevent1917@gmail.com"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Yönetici Şifresi (En az 8 karakter) *
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Şifre Tekrarı *
                </label>
                <input
                  type="password"
                  required
                  value={adminPasswordConfirm}
                  onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Kurulum Güvenlik Belirteci (Bootstrap Token) *
                </label>
                <button
                  type="button"
                  onClick={() => setBootstrapToken('BOOTSTRAP_TOKEN_2026')}
                  className="text-[11px] text-amber-700 hover:text-amber-900 underline font-medium"
                >
                  Test Belirtecini Doldur
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={bootstrapToken}
                  onChange={(e) => setBootstrapToken(e.target.value)}
                  placeholder="BOOTSTRAP_TOKEN_2026"
                  className="w-full pl-9 pr-3.5 py-2 text-xs font-mono border border-amber-300 bg-amber-50/30 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Yetkisiz mühürlemeyi önleyen sunucu belirteci. Geliştirme ortamı varsayılanı:{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">
                  BOOTSTRAP_TOKEN_2026
                </code>
              </p>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-2 transition-colors"
              >
                <span>Sonraki: Okul Bilgileri & Logo Seçimi</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            ADIM 2: OKUL BİLGİLERİ VE LOGO ÖZELLEŞTİRMESİ
        ========================================================================= */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  2. Okul Kimliğini ve Logosunu Özelleştirin
                </h3>
                <p className="text-xs text-slate-500">
                  Okul adı, kurum kodu ve logo; resmi PDF formlarında, değerlendirme raporlarında ve üst menüde yer alır.
                </p>
              </div>
            </div>

            {/* Okul Adı & Türü */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Resmî Okul Adı *</span>
                </label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Örn: Atatürk Mesleki ve Teknik Anadolu Lisesi"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-500" />
                    <span>MEB Kurum Kodu *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={institutionCode}
                    onChange={(e) => setInstitutionCode(e.target.value)}
                    placeholder="974125"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>İl / İlçe *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={provinceDistrict}
                    onChange={(e) => setProvinceDistrict(e.target.value)}
                    placeholder="İstanbul / Kadıköy"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Okul Türü
                  </label>
                  <input
                    type="text"
                    value={schoolType}
                    onChange={(e) => setSchoolType(e.target.value)}
                    placeholder="Mesleki ve Teknik Anadolu Lisesi"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* OKUL LOGOSU SEÇİCİSİ */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>Okul Logosu / Kurum Arması</span>
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Önceden hazırlanmış şablon seçebilir veya kendi armanızı yükleyebilirsiniz.
                </span>
              </label>

              {/* Logo Şablonları */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                {LOGO_PRESETS.map((p) => {
                  const isSelected = selectedPresetId === p.id && logoUrl === p.dataUrl;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setLogoUrl(p.dataUrl);
                        setSelectedPresetId(p.id);
                        setError(null);
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
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

              {/* Kendi Logonu Yükle / URL Gir */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Bilgisayarınızdan Logo Yükleyin
                    </span>
                    <span className="text-[11px] text-slate-500">
                      PNG, JPG, SVG veya WebP formatında dosya seçebilirsiniz.
                    </span>
                  </div>

                  <label className="cursor-pointer px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs flex items-center gap-2 shrink-0 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Dosya Seç</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Veya Harici Web Logo URL'si Girin
                  </label>
                  <input
                    type="url"
                    value={logoUrl.startsWith('data:image') ? '' : logoUrl}
                    onChange={(e) => {
                      setLogoUrl(e.target.value);
                      setSelectedPresetId('custom_url');
                    }}
                    placeholder="https://.../okul-logosu.png"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                {/* Canlı Önizleme */}
                <div className="pt-2 border-t border-slate-200/80 flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-600">Logo Önizlemesi:</span>
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo Önizleme" className="w-full h-full object-contain" />
                    ) : (
                      <School className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {schoolName || 'Okul Adı'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Geri
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-2 transition-colors"
              >
                <span>Sonraki: Onay ve Mühürleme</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            ADIM 3: SINIF VE DERS ONAYI & SİSTEMİ MÜHÜRLEME
        ========================================================================= */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  3. Kurulumu İnceleyin ve Sistemi Mühürleyin
                </h3>
                <p className="text-xs text-slate-500">
                  Aşağıdaki mühürleme parametreleri onaylandığında sistem yönetici hesabınızla kilitlenecektir.
                </p>
              </div>
            </div>

            {/* Mühürlenecek Yönetici ve Okul Özeti */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 divide-y divide-slate-200">
              <div className="pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Mühür Sahibi Yönetici
                  </span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <span>{adminName}</span>
                  </div>
                  <span className="text-xs font-mono text-indigo-700 font-medium">{adminEmail}</span>
                </div>
                <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 font-semibold rounded-md border border-emerald-200">
                  Tam Yetkili Yönetici
                </span>
              </div>

              <div className="pt-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                  {logoUrl ? (
                    <img src={logoUrl} alt={schoolName} className="w-full h-full object-contain" />
                  ) : (
                    <School className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 block">{schoolName}</span>
                  <span className="text-xs text-slate-500 block">
                    MEB Kod: {institutionCode} · {provinceDistrict} · {academicYear}
                  </span>
                </div>
              </div>
            </div>

            {/* Şubeler ve Dersler */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Başlangıç Sınıfları (4 Şube)
                </span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {classes.map((cls) => (
                    <div
                      key={cls.name}
                      className="p-2 bg-slate-50 border border-slate-200 rounded text-center text-xs font-bold text-slate-800"
                    >
                      {cls.name} ({cls.gradeLevel}. Sınıf)
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Başlangıç Dersleri (2 Ders)
                </span>
                <div className="space-y-1.5 mt-2">
                  {courses.map((crs) => (
                    <div
                      key={crs.code}
                      className="p-2 bg-slate-50 border border-slate-200 rounded text-xs flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-800">{crs.name}</span>
                      <span className="font-mono text-indigo-600 font-bold">{crs.code}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Güvenlik Mührü Bilgilendirmesi */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Mühürleme Sözleşmesi:</span> Bu butona basıldığında sistem{' '}
                <strong className="underline">{adminEmail}</strong> adresi adına mühürlenir. Kurulum sihirbazı
                otomatik olarak kilitlenir ve sistem doğrudan Yönetici Paneline aktarılır.
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Geri
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-2 transition-all cursor-pointer hover:shadow-lg active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Kurulumu Tamamla ve Sistemi Kilitle</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
