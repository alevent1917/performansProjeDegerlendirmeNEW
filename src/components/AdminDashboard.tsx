/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Okul Yönetici Paneli (Admin Dashboard) - Aşama 3, 4 & 5
 * Okul ayarları, sınıf/ders yönetimi, öğretmen yetkilendirme matrisi,
 * aktivasyon kodu üretimi, öğretmen başvuruları onayı, not denetim günlüğü ve JSON yedekleme.
 */

import React, { useState } from 'react';
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
} from 'lucide-react';
import { formatTurkishDate } from '../utils/validation';

export const AdminDashboard: React.FC = () => {
  type AdminTab = 'settings' | 'classes_courses' | 'permissions' | 'activation_codes' | 'applications' | 'audit_log' | 'backup';
  const [activeTab, setActiveTab] = useState<AdminTab>('settings');

  // 1. Okul Ayarları
  const [settings, setSettings] = useState({
    schoolName: 'Atatürk Mesleki ve Teknik Anadolu Lisesi',
    activeAcademicYear: '2026-2027',
    studentMaxFileSizeMb: 15,
    teacherMaxFileSizeMb: 20,
    inactivityTimeoutMinutes: 30,
    reportHeaderTitle: 'T.C. MİLLÎ EĞİTİM BAKANLIĞI',
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // 2. Sınıflar ve Dersler
  const [classrooms, setClassrooms] = useState([
    { id: 'cl-1', name: '9/B', gradeLevel: 9, branch: 'B', studentCount: 34 },
    { id: 'cl-2', name: '10/B', gradeLevel: 10, branch: 'B', studentCount: 34 },
    { id: 'cl-3', name: '11/B', gradeLevel: 11, branch: 'B', studentCount: 32 },
    { id: 'cl-4', name: '12/B', gradeLevel: 12, branch: 'B', studentCount: 36 },
  ]);

  const [courses, setCourses] = useState([
    { id: 'crs-1', code: 'PRG101', name: 'Programlama Temelleri', hours: 4 },
    { id: 'crs-2', code: 'NET201', name: 'Ağ Sistemleri ve Anahtarlama', hours: 6 },
  ]);

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

      {/* 1. OKUL AYARLARI FORMU */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Kurumsal Okul Parametreleri & Güvenlik Limitleri
          </h3>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSettingsSaved(true);
              setTimeout(() => setSettingsSaved(false), 2000);
            }}
            className="space-y-4 max-w-2xl"
          >
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Okul Tam Adı
              </label>
              <input
                type="text"
                required
                value={settings.schoolName}
                onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Aktif Akademik Yıl
                </label>
                <input
                  type="text"
                  required
                  value={settings.activeAcademicYear}
                  onChange={(e) => setSettings({ ...settings, activeAcademicYear: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  İnaktivite Oturum Zaman Aşımı (Dakika)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  required
                  value={settings.inactivityTimeoutMinutes}
                  onChange={(e) =>
                    setSettings({ ...settings, inactivityTimeoutMinutes: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Öğrenci Azami PDF Boyutu (MB)
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
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <span className="text-[11px] text-slate-500">Mevcut kural: 15 MB (CHECK kısıtı)</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Öğretmen Yönerge Boyutu (MB)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={settings.teacherMaxFileSizeMb}
                  onChange={(e) =>
                    setSettings({ ...settings, teacherMaxFileSizeMb: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <span className="text-[11px] text-slate-500">Mevcut kural: 20 MB</span>
              </div>
            </div>

            {settingsSaved && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Okul ayarları veritabanında güncellendi.</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs"
              >
                Ayarları Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. SINIFLAR VE DERSLER */}
      {activeTab === 'classes_courses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Aktif Şubeler ({classrooms.length})</span>
              <span className="text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
                2026-2027
              </span>
            </h3>
            <div className="divide-y divide-slate-100">
              {classrooms.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{c.name} Şubesi</span>
                    <span className="text-slate-500 text-[11px] block">{c.gradeLevel}. Sınıf Düzeyi</span>
                  </div>
                  <span className="font-mono text-slate-600">{c.studentCount} Kayıtlı Öğrenci</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Tanımlı Dersler ({courses.length})</span>
              <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                Aktif Müfredat
              </span>
            </h3>
            <div className="divide-y divide-slate-100">
              {courses.map((crs) => (
                <div key={crs.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-indigo-700">{crs.code}</span>
                    <span className="font-semibold text-slate-900 ml-2">{crs.name}</span>
                  </div>
                  <span className="font-mono text-slate-600">{crs.hours} Saat / Hafta</span>
                </div>
              ))}
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
    </div>
  );
};
