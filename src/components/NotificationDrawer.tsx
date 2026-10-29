/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Bölüm 15: Bildirim Paneli (Notification Drawer)
 */

import React from 'react';
import { X, CheckCheck, Bell, Clock, Award, AlertCircle, Info } from 'lucide-react';
import { SystemNotification } from '../types';
import { formatTurkishDateTime } from '../utils/validation';

interface NotificationDrawerProps {
  isOpen: boolean;
  notifications: SystemNotification[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  notifications,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type: SystemNotification['type']) => {
    switch (type) {
      case 'evaluation':
        return <Award className="w-4 h-4 text-emerald-600" />;
      case 'deadline':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-sky-600" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-drawer-title"
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-2xs"
    >
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          {/* Başlık */}
          <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 id="notification-drawer-title" className="text-base font-bold text-slate-900">
                  Bildirimler
                </h2>
                <p className="text-xs text-slate-500">
                  {unreadCount > 0 ? `${unreadCount} yeni bildiriminiz var` : 'Tüm bildirimler okundu'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  title="Tümünü okundu işaretle"
                  aria-label="Tümünü okundu işaretle"
                  className="p-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors flex items-center gap-1 font-medium"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Tümünü Oku</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Kapat"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bildirim Listesi */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">Henüz bildiriminiz yok</p>
                <p className="text-xs text-slate-500 mt-1">
                  Yeni görev atamaları, teslimler ve değerlendirmeler burada listelenir.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => !item.isRead && onMarkAsRead(item.id)}
                  className={`p-4 transition-colors cursor-pointer ${
                    item.isRead ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/40 hover:bg-indigo-50/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                      {getNotificationIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-slate-900 truncate">
                          {item.title}
                        </h4>
                        {!item.isRead && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" aria-label="Okunmadı" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {item.message}
                      </p>
                      <span className="text-[11px] text-slate-400 mt-2 block">
                        {formatTurkishDateTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
