/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Bölüm 21: Evrensel Kullanıcı İşlem Onay Penceresi (Confirm Modal)
 * Erişilebilir, klavye odaklanması destekli, iptal ve onay seçenekli modal bileşeni.
 */

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Onayla',
  cancelText = 'Vazgeç',
  variant = 'primary',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Modal açıldığında odaklan
      setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isLoading) {
          onCancel();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-rose-600" aria-hidden="true" />,
          btn: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" aria-hidden="true" />,
          btn: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
        };
      case 'primary':
      default:
        return {
          icon: <CheckCircle className="w-6 h-6 text-indigo-600" aria-hidden="true" />,
          btn: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500',
        };
    }
  };

  const currentVariant = getVariantStyles();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden transform transition-all">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-slate-100 shrink-0">
              {currentVariant.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3
                id="confirm-modal-title"
                className="text-lg font-semibold text-slate-900"
              >
                {title}
              </h3>
              <p
                id="confirm-modal-desc"
                className="mt-2 text-sm text-slate-600 leading-relaxed"
              >
                {message}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              aria-label="Pencereyi kapat"
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg shadow-2xs hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-slate-400 transition-colors"
          >
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-offset-2 transition-colors flex items-center gap-2 ${currentVariant.btn}`}
          >
            {isLoading && (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
