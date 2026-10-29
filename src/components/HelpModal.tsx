/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Bölüm 22: Kullanıcı Rollerine Özel Yardım Sayfaları (Help Modal)
 * Öğrenci, Öğretmen ve Yönetici için ayrılmış kılavuz rehberleri.
 */

import React, { useState } from 'react';
import {
  X,
  BookOpen,
  GraduationCap,
  Shield,
  FileCheck,
  Upload,
  Calendar,
  Key,
  Database,
  Users,
} from 'lucide-react';
import { UserRole } from '../types';

interface HelpModalProps {
  isOpen: boolean;
  initialRole?: UserRole;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  initialRole = 'student',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<UserRole>(initialRole);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Başlık ve Kapatma Butonu */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 id="help-modal-title" className="text-lg font-bold text-slate-900">
              Sistem Kullanım Kılavuzu & Yardım
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Rolünüze uygun adımları, teslim kurallarını ve yönergeleri inceleyebilirsiniz.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rol Sekmeleri */}
        <div className="flex border-b border-slate-200 bg-white px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('student')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'student'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Öğrenci Kılavuzu
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teacher')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'teacher'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Öğretmen Kılavuzu
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'admin'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            Yönetici Kılavuzu
          </button>
        </div>

        {/* İçerik */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700">
          {activeTab === 'student' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-sky-50 rounded-lg border border-sky-100 flex items-start gap-3">
                <Key className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sky-900">1. Giriş ve Kayıt (Aktivasyon Kodu)</h4>
                  <p className="text-xs text-sky-800 mt-1 leading-relaxed">
                    İlk kayıt için okul idarenizden veya öğretmeninizden aldığınız <strong>tek kullanımlık aktivasyon kodunu</strong> ve okul numaranızı girmelisiniz. Ardından e-posta adresinizi doğrulayarak şifrenizi belirleyin.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
                <Upload className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900">2. Görev Teslimi (PDF / Kâğıt)</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    - <strong>Dijital Teslim:</strong> Yalnızca <strong>PDF</strong> formatında ve en fazla <strong>15 MB</strong> boyutunda dosya yükleyebilirsiniz. Son teslim tarihine kadar yeni sürüm yükleyebilirsiniz (eski sürümler korunur).<br />
                    - <strong>Kâğıt Teslim:</strong> Görevi fiziki teslim ettiyseniz &quot;Kâğıt Teslim Bildir&quot; butonuna basınız. Öğretmeniniz teslim aldığında onaylayacaktır.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
                <Calendar className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900">3. Ek Süre Talebi</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Son teslim tarihinden önce geçerli mazeretinizi belirterek öğretmenden ek süre talep edebilirsiniz. Onaylandığında yeni son tarih sistemde güncellenir.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900">4. Değerlendirme & Rapor İndirme</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Öğretmeniniz puanlamayı tamamladığında ölçüt bazlı puanlarınızı, öğretmen yorumunu görebilir ve onaylı <strong>Değerlendirme Formu PDF</strong> çıktınızı alabilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'teacher' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-emerald-900">1. Görev Havuzu & Ölçüt Şablonları</h4>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    Kişisel veya zümre öğretmenleriyle paylaşımlı görev havuzu oluşturabilirsiniz. Değerlendirme ölçütlerinin <strong>maksimum puan toplamı mutlaka 100</strong> olmalıdır.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
                <Users className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900">2. Görev Dağıtımı (Taslak & Onay)</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Görevleri tek veya çoklu sınıfa dengeli/rastgele dağıtabilirsiniz. Sistem önce <strong>taslak dağıtım</strong> oluşturur. Siz inceleyip onaylamadan öğrencilere yayımlanmaz.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900">3. Teslim İndirme (ZIP) & 0.1 Puanlama</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Öğrenci teslimlerini tekil veya toplu ZIP olarak indirebilirsiniz (öğrenci no ve adı ile standart adlandırılır). Değerlendirmeyi taslak kaydedebilir, 0.1 hassasiyetle puanlayıp tamamlayabilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-indigo-50 rounded-lg border border-indigo-100 flex items-start gap-3">
                <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-indigo-900">1. İlk Kurulum & Okul Yapılandırması</h4>
                  <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
                    İlk kurulum sihirbazı ile ilk yönetici hesabı oluşturulur, genel yönetici kaydı kapatılır. Okul adı, logo ve 2026-2027 akademik yılı başlangıç sınıfları (9/B, 10/B, 11/B, 12/B) onaylanır.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
                <Users className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900">2. Excel Öğrenci İçe Aktarma & Aktivasyon Kodları</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Öğrenci listeleri Excel ile önizlemeli içe aktarılır. Mevcut kayıtlar ezilmez. Öğrenciler için tek kullanımlık güvenli aktivasyon kodları toplu üretilebilir.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
                <Database className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900">3. Yedekleme & Güvenlik (30 Gün Saklama)</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Günlük otomatik veritabanı ve dosya yedekleri tutulur. 30 gün boyunca güvenli saklanır ve yalnızca yetkili yöneticiler tarafından indirilebilir.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alt Kısım */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Teknik destek için okul bilişim koordinatörlüğü ile iletişime geçiniz.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
