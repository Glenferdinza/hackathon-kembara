'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3 rounded-md border shadow-md transition-all animate-in slide-in-from-right duration-200 ${
              toast.type === 'success'
                ? 'bg-white border-blue-300 text-slate-800'
                : toast.type === 'error'
                ? 'bg-white border-red-300 text-slate-800'
                : 'bg-white border-blue-300 text-slate-800'
            }`}
          >
            <span
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded-xs uppercase shrink-0 mt-0.5 ${
                toast.type === 'success'
                  ? 'bg-blue-100 text-[#1E40AF]'
                  : toast.type === 'error'
                  ? 'bg-red-100 text-[#D94841]'
                  : 'bg-blue-100 text-[#1E40AF]'
              }`}
            >
              {toast.type === 'success' ? 'SUKSES' : toast.type === 'error' ? 'ERROR' : 'INFO'}
            </span>
            <div className="flex-1 text-xs font-medium leading-snug">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 font-bold transition-colors text-xs p-0.5"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (msg: string) => {
        if (typeof window !== 'undefined') console.log('[Toast]:', msg);
      },
    };
  }
  return context;
}
