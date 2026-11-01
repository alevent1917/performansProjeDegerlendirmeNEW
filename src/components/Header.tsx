/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Ana Başlık ve Üst Menü Bileşeni (Header)
 */

import React from 'react';
import {
  GraduationCap,
  Bell,
  HelpCircle,
  LogOut,
  School,
  User,
  Shield,
  BookOpen,
} from 'lucide-react';
import { UserRole } from '../types';
import { ROLE_LABELS } from '../lib/constants';

interface HeaderProps {
  schoolName: string;
  logoUrl?: string;
  activeAcademicYear: string;
  currentUser?: {
    fullName: string;
    role: UserRole;
    email: string;
    schoolNumber?: string;
  } | null;
  unreadNotificationCount: number;
  onOpenNotifications: () => void;
  onOpenHelp: () => void;
  onLogout?: () => void;
  onSwitchRolePreview?: (role: UserRole) => void;
}

export const Header: React.FC<HeaderProps> = ({
  schoolName,
  logoUrl,
  activeAcademicYear,
  currentUser,
  unreadNotificationCount,
  onOpenNotifications,
  onOpenHelp,
  onLogout,
  onSwitchRolePreview,
}) => {
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />;
      case 'teacher':
        return <BookOpen className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />;
      case 'student':
      default:
        return <GraduationCap className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Sol: Okul Logosu ve Sistem Başlığı */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 overflow-hidden text-indigo-600">
              {logoUrl && !imgError ? (
                <img
                  src={logoUrl}
                  alt={schoolName}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <School className="w-6 h-6" aria-hidden="true" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 tracking-tight text-sm sm:text-base">
                  {schoolName || 'Performans & Proje Görev Takip'}
                </span>
                <span className="hidden sm:inline-block text-xs font-normal text-slate-400">
                  /
                </span>
                <span className="hidden sm:inline-block text-xs text-slate-500 font-medium">
                  {activeAcademicYear}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                T.C. Millî Eğitim Bakanlığı Standartlarına Uygun Görev & Ölçüt Takip Sistemi
              </p>
            </div>
          </div>

          {/* Sağ: Yardım, Bildirimler ve Kullanıcı Bilgisi */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Önizleme Rol Değiştirici (Geliştirme ve Test aşaması için) */}
            {onSwitchRolePreview && (
              <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                <span className="px-2 py-1 text-slate-500 font-medium">Görünüm:</span>
                {(['student', 'teacher', 'admin'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => onSwitchRolePreview(r)}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      currentUser?.role === r
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            )}

            {/* Yardım Butonu */}
            <button
              type="button"
              onClick={onOpenHelp}
              aria-label="Kullanım Kılavuzu ve Yardım"
              title="Kullanım Kılavuzu"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors relative"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Bildirim Zili */}
            <button
              type="button"
              onClick={onOpenNotifications}
              aria-label={`Bildirimler: ${unreadNotificationCount} okunmamış`}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Kullanıcı Profili */}
            {currentUser ? (
              <div className="flex items-center gap-3 pl-2 sm:border-l sm:border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 flex items-center justify-end gap-1.5">
                    {getRoleIcon(currentUser.role)}
                    <span>{currentUser.fullName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {currentUser.schoolNumber
                      ? `No: ${currentUser.schoolNumber}`
                      : ROLE_LABELS[currentUser.role]}
                  </div>
                </div>

                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    title="Güvenli Çıkış Yap"
                    aria-label="Oturumu Kapat"
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <User className="w-4 h-4 text-slate-400" />
                <span>Misafir Oturumu</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
