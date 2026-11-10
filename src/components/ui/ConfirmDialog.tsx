'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'primary' | 'danger' | 'warning';
}

interface ConfirmContextType {
  confirm: (optionsOrMessage: string | ConfirmDialogOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions>({
    title: 'Konfirmasi Tindakan',
    message: '',
    confirmText: 'Konfirmasi',
    cancelText: 'Batal',
    type: 'primary',
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((optionsOrMessage: string | ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      if (typeof optionsOrMessage === 'string') {
        setOptions({
          title: 'Konfirmasi Tindakan',
          message: optionsOrMessage,
          confirmText: 'Ya, Lanjutkan',
          cancelText: 'Batal',
          type: 'primary',
        });
      } else {
        setOptions({
          title: optionsOrMessage.title || 'Konfirmasi Tindakan',
          message: optionsOrMessage.message,
          confirmText: optionsOrMessage.confirmText || 'Konfirmasi',
          cancelText: optionsOrMessage.cancelText || 'Batal',
          type: optionsOrMessage.type || 'primary',
        });
      }
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter') {
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const badgeConfig = {
    danger: {
      badge: 'KONFIRMASI PENGHAPUSAN / TINDAKAN KRUSIAL',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      btnClass: 'bg-rose-700 hover:bg-rose-800 text-white',
    },
    warning: {
      badge: 'PERINGATAN OPERASIONAL',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      btnClass: 'bg-amber-700 hover:bg-amber-800 text-white',
    },
    primary: {
      badge: 'KONFIRMASI SISTEM OPERASIONAL',
      badgeClass: 'bg-blue-50 text-[#1E40AF] border-blue-200',
      btnClass: 'bg-[#1E40AF] hover:bg-[#1D4ED8] text-white',
    },
  }[options.type || 'primary'];

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={handleCancel}
        >
          <div
            className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-slate-100 space-y-1">
              <span
                className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${badgeConfig.badgeClass}`}
              >
                {badgeConfig.badge}
              </span>
              <h3 className="text-sm font-heading font-bold text-slate-900">
                {options.title}
              </h3>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                {options.message}
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer"
              >
                {options.cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors shadow-xs cursor-pointer ${badgeConfig.btnClass}`}
              >
                {options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  }
  return context;
}
