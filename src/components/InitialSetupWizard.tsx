/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Bölüm 6: Güvenli İlk Kurulum Sihirbazı (Initial Setup Wizard)
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
} from 'lucide-react';
import { INITIAL_ACADEMIC_YEAR, INITIAL_CLASSES, INITIAL_COURSES } from '../lib/constants';

interface InitialSetupWizardProps {
  onComplete: (setupData: {
    adminEmail: string;
    adminName: string;
    adminPassword?: string;
    bootstrapToken?: string;
    schoolName: string;
    logoUrl?: string;
    academicYear: string;
    classes: typeof INITIAL_CLASSES;
    courses: typeof INITIAL_COURSES;
  }) => void;
}

export const InitialSetupWizard: React.FC<InitialSetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [bootstrapToken, setBootstrapToken] = useState('');

  const [schoolName, setSchoolName] = useState('Anadolu Mesleki ve Teknik Lisesi');
  const [logoUrl, setLogoUrl] = useState('');
  const [academicYear, setAcademicYear] = useState(INITIAL_ACADEMIC_YEAR);

  const [classes] = useState(INITIAL_CLASSES);
  const [courses] = useState(INITIAL_COURSES);
  const [error, setError] = useState<string | null>(null);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!adminName.trim() || !adminEmail.trim()) {
      setError('Lütfen yönetici adı ve e-posta adresini giriniz.');
      return;
    }
    if (adminPassword.length < 8) {
      setError('Yönetici şifresi en az 8 karakter olmalıdır.');
      return;
    }
    if (adminPassword !== adminPasswordConfirm) {
      setError('Şifre ve şifre tekrarı birbiriyle eşleşmiyor.');
      return;
    }
    if (!bootstrapToken.trim()) {
      setError('Güvenlik gereği sunucu dağıtımında oluşturulan Kurulum Güvenlik Belirtecini (Bootstrap Token) giriniz.');
      return;
    }

    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!schoolName.trim()) {
      setError('Lütfen okul adını giriniz.');
      return;
    }

    setStep(3);
  };

  const handleFinalSubmit = () => {
    onComplete({
      adminEmail,
      adminName,
      adminPassword,
      bootstrapToken,
      schoolName,
      logoUrl: logoUrl || undefined,
      academicYear,
      classes,
      courses,
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8">
      {/* İlerleme Çubuğu */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between text-xs font-semibold">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              1
            </span>
            <span>İlk Yönetici Hesabı</span>
          </div>
          <div className="w-12 h-0.5 bg-slate-200" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              2
            </span>
            <span>Okul Bilgileri</span>
          </div>
          <div className="w-12 h-0.5 bg-slate-200" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              3
            </span>
            <span>Sınıf & Ders Onayı</span>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Adım 1: İlk Yönetici */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">1. İlk Yöneticiyi Oluşturun</h3>
                <p className="text-xs text-slate-500">
                  Bu hesap oluşturulduktan sonra genel yönetici kaydı otomatik olarak kapatılır.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Yönetici Adı ve Soyadı *
              </label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Örn: Dr. Ahmet Yılmaz"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
                placeholder="yonetici@okul.k12.tr"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Güçlü Şifre (En az 8 karakter) *
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Sunucu Kurulum Güvenlik Belirteci (Bootstrap Secret Token) *
                </label>
                <span className="text-[11px] text-amber-700 font-medium">Tek Kullanımlık</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={bootstrapToken}
                  onChange={(e) => setBootstrapToken(e.target.value)}
                  placeholder="Sunucu ortamında oluşturulan tek kullanımlık kurulum belirteci..."
                  className="w-full pl-9 pr-3.5 py-2 text-sm font-mono border border-amber-300 bg-amber-50/30 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                * Yetkisiz kişilerin ilk yönetici olmasını engellemek için sunucu konsolunda üretilen gizli belirteçtir. Veritabanındaki özetle doğrulanır ve kurulum sonrası otomatik silinir.
              </p>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
              >
                <span>Sonraki: Okul Bilgileri</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Adım 2: Okul Bilgileri */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">2. Okul Kimliğini Tanımlayın</h3>
                <p className="text-xs text-slate-500">
                  Okul adı ve logo resmi PDF değerlendirme formları ve resmi raporlarda yer alır.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Resmî Okul Adı *
              </label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Örn: Atatürk Mesleki ve Teknik Anadolu Lisesi"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Okul Logosu URL (İsteğe Bağlı)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://.../okul-logosu.png (Boş bırakılırsa varsayılan arma kullanılır)"
                  className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Logo daha sonra yönetici ayarları panelinden güncellenebilir veya yüklenebilir.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Başlangıç Akademik Yılı *
              </label>
              <input
                type="text"
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50 text-slate-700 font-medium"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Şartname gereği başlangıç akademik yılı 2026–2027 olarak belirlenmiştir.
              </span>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Geri
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
              >
                <span>Sonraki: Sınıf & Ders Kontrolü</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Adım 3: Sınıf ve Ders Onayı */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">3. Başlangıç Sınıfları ve Dersleri Onaylayın</h3>
                <p className="text-xs text-slate-500">
                  Aşağıdaki sınıflar ve dersler sistem başlatıldığında otomatik olarak veritabanına işlenecektir.
                </p>
              </div>
            </div>

            {/* Sınıflar */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <School className="w-4 h-4 text-slate-400" />
                Başlangıç Sınıfları (4 Şube)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {classes.map((cls) => (
                  <div
                    key={cls.name}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800"
                  >
                    {cls.name}
                    <span className="block text-[11px] font-normal text-slate-500 mt-0.5">
                      {cls.gradeLevel}. Sınıf Şubesi
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dersler */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-slate-400" />
                Başlangıç Dersleri (2 Ders)
              </h4>
              <div className="space-y-2">
                {courses.map((crs) => (
                  <div
                    key={crs.code}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 text-sm">{crs.name}</span>
                      <p className="text-xs text-slate-500 mt-0.5">{crs.description}</p>
                    </div>
                    <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded text-indigo-600">
                      {crs.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bilgilendirme Kutusu */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Kurulum tamamlandığında ilk yönetici hesabı aktif hale gelir. Excel ile öğrenci aktarımı, öğretmen onayları ve görev havuzları hemen kullanılabilir.
              </span>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Geri
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>İlk Kurulumu Tamamla ve Sistemi Başlat</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
