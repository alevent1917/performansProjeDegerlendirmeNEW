/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Bölüm 28: Otomatik Oturum Kapatma ve İnaktivite Sayacı Modalı
 */

import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';

interface InactivityTimeoutModalProps {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onTimeout: () => void;
  isEnabled?: boolean;
}

export const InactivityTimeoutModal: React.FC<InactivityTimeoutModalProps> = ({
  timeoutMinutes = 30,
  warningMinutes = 2,
  onTimeout,
  isEnabled = true,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(timeoutMinutes * 60);
  const [showWarning, setShowWarning] = useState<boolean>(false);

  const resetTimer = useCallback(() => {
    setSecondsRemaining(timeoutMinutes * 60);
    setShowWarning(false);
  }, [timeoutMinutes]);

  useEffect(() => {
    if (!isEnabled) return;

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleUserActivity = () => {
      // Sadece uyarı ekranı açık değilken zamanlayıcıyı sessizce sıfırla
      if (!showWarning) {
        setSecondsRemaining(timeoutMinutes * 60);
      }
    };

    activityEvents.forEach((event) => window.addEventListener(event, handleUserActivity));

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeout();
          return 0;
        }

        const warningThreshold = warningMinutes * 60;
        if (prev - 1 <= warningThreshold) {
          setShowWarning(true);
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      activityEvents.forEach((event) => window.removeEventListener(event, handleUserActivity));
      clearInterval(interval);
    };
  }, [isEnabled, timeoutMinutes, warningMinutes, onTimeout, showWarning]);

  if (!showWarning) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-amber-200 overflow-hidden">
        <div className="bg-amber-50 border-b border-amber-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Oturum Süresi Dolmak Üzere
            </h3>
            <p className="text-xs text-amber-700">
              Güvenliğiniz için işlem yapılmadığında oturumunuz kapatılır.
            </p>
          </div>
        </div>

        <div className="p-6 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-800 rounded-xl font-mono text-2xl font-bold">
            <Clock className="w-5 h-5 text-slate-500" />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          <p className="text-xs text-slate-600">
            Sistemde son {timeoutMinutes} dakikadır işlem yapılmadı. Oturumunuzun açık kalmasını istiyorsanız lütfen aşağıdaki butona tıklayınız.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onTimeout}
              className="flex-1 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Şimdi Çıkış Yap
            </button>
            <button
              type="button"
              onClick={resetTimer}
              className="flex-1 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Oturumu Uzat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
