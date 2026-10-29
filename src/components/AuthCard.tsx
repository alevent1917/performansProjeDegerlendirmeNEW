/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Bölüm 5: Kimlik Doğrulama & Kayıt Kartı (AuthCard)
 * Öğrenci (Aktivasyon kodlu), Öğretmen Başvurusu, Giriş ve Şifre Sıfırlama
 */

import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  Shield,
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  UserCheck,
  Hash,
} from 'lucide-react';
import { UserRole } from '../types';
import { validateActivationCodeFormat } from '../utils/validation';

interface AuthCardProps {
  onLogin: (data: { email: string; pass: string; selectedContextRole: UserRole }) => Promise<void>;
  onStudentRegister: (data: {
    schoolNumber: string;
    activationCode: string;
    fullName?: string;
    email: string;
    password: string;
  }) => Promise<void>;
  onTeacherApply: (data: {
    fullName: string;
    email: string;
    branchSubject: string;
    applicationNotes?: string;
  }) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  isLoading?: boolean;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  onLogin,
  onStudentRegister,
  onTeacherApply,
  onForgotPassword,
  isLoading = false,
}) => {
  type AuthTab = 'login' | 'student_register' | 'teacher_apply' | 'forgot_password';
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [selectedContextRole, setSelectedContextRole] = useState<UserRole>('student');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolNumber, setSchoolNumber] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [studentFullName, setStudentFullName] = useState('');
  const [fullName, setFullName] = useState('');
  const [branchSubject, setBranchSubject] = useState('Programlama Temelleri');
  const [applicationNotes, setApplicationNotes] = useState('');

  // UI feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetFeedback = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleTabChange = (tab: AuthTab) => {
    resetFeedback();
    setActiveTab(tab);
  };

  // 1. Giriş İşlemi
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!email || !password) {
      setErrorMessage('Lütfen e-posta ve şifrenizi giriniz.');
      return;
    }

    try {
      await onLogin({ email, pass: password, selectedContextRole });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Giriş yapılamadı.';
      setErrorMessage(msg);
    }
  };

  // 2. Öğrenci Kaydı (Aktivasyon Kodlu)
  const handleStudentRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!schoolNumber.trim()) {
      setErrorMessage('Lütfen okul numaranızı giriniz.');
      return;
    }

    if (!validateActivationCodeFormat(activationCode)) {
      setErrorMessage(
        'Geçersiz aktivasyon kodu formatı. Okul idaresinden aldığınız kodu kontrol ediniz (Örn: AKT-9B41-8932).'
      );
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage('Lütfen e-posta ve şifrenizi eksiksiz giriniz.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Şifreniz güvenlik nedeniyle en az 8 karakter olmalıdır.');
      return;
    }

    try {
      await onStudentRegister({
        schoolNumber: schoolNumber.trim(),
        activationCode: activationCode.trim(),
        fullName: studentFullName.trim() || undefined,
        email: email.trim(),
        password,
      });
      setSuccessMessage(
        'Kayıt talebiniz alındı! Doğrulama e-postası adresinize gönderildi. E-postanızı onayladıktan sonra okul numaranız veya e-postanız ile giriş yapabilirsiniz.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kayıt işlemi başarısız oldu.';
      setErrorMessage(msg);
    }
  };

  // 3. Öğretmen Başvurusu
  const handleTeacherApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!fullName.trim() || !email.trim() || !branchSubject.trim()) {
      setErrorMessage('Lütfen ad soyad, e-posta ve branş alanlarını doldurunuz.');
      return;
    }

    try {
      await onTeacherApply({
        fullName: fullName.trim(),
        email: email.trim(),
        branchSubject,
        applicationNotes: applicationNotes.trim() || undefined,
      });
      setSuccessMessage(
        'Öğretmen başvurunuz okul yönetimine iletildi. İdare onayladıktan sonra sisteme giriş davetiniz e-postanıza iletilecektir.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Başvuru gönderilemedi.';
      setErrorMessage(msg);
    }
  };

  // 4. Şifre Sıfırlama
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!email.trim()) {
      setErrorMessage('Lütfen kayıtlı e-posta adresinizi giriniz.');
      return;
    }

    try {
      await onForgotPassword(email.trim());
      setSuccessMessage(
        'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol ediniz.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sıfırlama e-postası gönderilemedi.';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Sekme Seçiciler */}
      <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold">
        <button
          type="button"
          onClick={() => handleTabChange('login')}
          className={`py-3.5 text-center border-b-2 transition-all ${
            activeTab === 'login'
              ? 'border-indigo-600 text-indigo-600 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Giriş Yap
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('student_register')}
          className={`py-3.5 text-center border-b-2 transition-all ${
            activeTab === 'student_register'
              ? 'border-indigo-600 text-indigo-600 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Öğrenci Kaydı
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('teacher_apply')}
          className={`py-3.5 text-center border-b-2 transition-all ${
            activeTab === 'teacher_apply'
              ? 'border-indigo-600 text-indigo-600 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Öğretmen Başvurusu
        </button>
      </div>

      <div className="p-6 sm:p-8">
        {/* Hata / Başarı Bildirimleri */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 1. GİRİŞ FORMU */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Giriş Türü Seçiniz
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { role: 'student', label: 'Öğrenci', icon: GraduationCap },
                  { role: 'teacher', label: 'Öğretmen', icon: BookOpen },
                  { role: 'admin', label: 'Yönetici', icon: Shield },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.role}
                      onClick={() => setSelectedContextRole(item.role as UserRole)}
                      className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                        selectedContextRole === item.role
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                * Giriş ekranındaki rol seçimi yönlendirme amaçlıdır; asıl yetki veritabanındaki güvenli kullanıcı kaydı ile belirlenir.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {selectedContextRole === 'student' ? 'Okul E-postası / Okul Numarası' : 'E-posta Adresi'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedContextRole === 'student' ? '1042 veya ogrenci@okul.k12.tr' : 'ad.soyad@okul.k12.tr'}
                  className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Şifre
                </label>
                <button
                  type="button"
                  onClick={() => handleTabChange('forgot_password')}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >
                  Şifremi Unuttum
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. ÖĞRENCİ KAYIT FORMU (Aktivasyon Kodlu) */}
        {activeTab === 'student_register' && (
          <form onSubmit={handleStudentRegisterSubmit} className="space-y-4">
            <div className="p-3 bg-sky-50 rounded-lg border border-sky-100 text-xs text-sky-800 leading-relaxed">
              Öğrenci hesabı açmak için okul idaresince oluşturulmuş <strong>tek kullanımlık aktivasyon koduna</strong> sahip olmanız gerekmektedir.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Okul Numaranız *
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={schoolNumber}
                  onChange={(e) => setSchoolNumber(e.target.value)}
                  placeholder="Örn: 1042"
                  className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adınız ve Soyadınız *
              </label>
              <input
                type="text"
                required
                value={studentFullName}
                onChange={(e) => setStudentFullName(e.target.value)}
                placeholder="Örn: Ali Demir"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tek Kullanımlık Aktivasyon Kodu *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                  placeholder="Örn: AKT-9B41-8932"
                  className="w-full pl-9 pr-3.5 py-2 text-sm uppercase tracking-wider font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-posta Adresiniz (Doğrulama Gönderilecek) *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ogrenci@alanadi.com"
                  className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Belirleyeceğiniz Şifre (En az 8 karakter) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Aktivasyon Kodunu Doğrula ve Kaydol</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 3. ÖĞRETMEN BAŞVURUSU */}
        {activeTab === 'teacher_apply' && (
          <form onSubmit={handleTeacherApplySubmit} className="space-y-4">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-xs text-emerald-800 leading-relaxed">
              Öğretmen hesapları güvenlik gereği okul yöneticisinin inceleme ve onayının ardından aktifleşir.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adınız ve Soyadınız *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Örn: Ayşe Demir"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kurumsal E-posta Adresiniz *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ad.soyad@okul.k12.tr"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Branş / Ders Alanınız *
              </label>
              <select
                value={branchSubject}
                onChange={(e) => setBranchSubject(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
              >
                <option value="Programlama Temelleri">Programlama Temelleri</option>
                <option value="Ağ Sistemleri ve Anahtarlama">Ağ Sistemleri ve Anahtarlama</option>
                <option value="Bilişim Teknolojileri - Diğer">Bilişim Teknolojileri - Diğer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Yöneticiye İletilecek Not (İsteğe Bağlı)
              </label>
              <textarea
                rows={2}
                value={applicationNotes}
                onChange={(e) => setApplicationNotes(e.target.value)}
                placeholder="Gireceğiniz sınıflar veya ders yetki talebiniz..."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  <span>Öğretmen Başvurusunu Gönder</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 4. ŞİFREMİ UNUTTUM */}
        {activeTab === 'forgot_password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 leading-relaxed">
              Kayıtlı e-posta adresinizi giriniz. Güvenli şifre sıfırlama bağlantısı e-postanıza gönderilecektir.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-posta Adresi *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@okul.k12.tr"
                  className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTabChange('login')}
                className="w-1/3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg"
              >
                Geri Dön
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-2/3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <span>Bağlantı Gönder</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
