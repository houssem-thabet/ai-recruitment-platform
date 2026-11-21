'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextValue {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  success: () => {},
  error: () => {},
  info: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((type: ToastItem['type'], message: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismiss = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider
      value={{
        success: (m) => pushToast('success', m),
        error: (m) => pushToast('error', m),
        info: (m) => pushToast('info', m),
      }}
    >
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto animate-slide-in-right flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-2xl backdrop-blur-xl transition-all ${
              t.type === 'success'
                ? 'bg-white/95 dark:bg-[#0E172C]/95 border-emerald-500/35 text-[#101B35] dark:text-slate-100'
                : t.type === 'error'
                ? 'bg-white/95 dark:bg-[#0E172C]/95 border-rose-500/40 text-[#101B35] dark:text-slate-100'
                : 'bg-white/95 dark:bg-[#0E172C]/95 border-[#367BF5]/35 text-[#101B35] dark:text-slate-100'
            }`}
          >
            {t.type === 'success' && (
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            )}
            {t.type === 'error' && (
              <div className="w-6 h-6 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
            )}
            {t.type === 'info' && (
              <div className="w-6 h-6 rounded-lg bg-[#367BF5]/15 flex items-center justify-center shrink-0">
                <Info className="w-4 h-4 text-[#367BF5] dark:text-[#28C5D8]" />
              </div>
            )}
            <p className="text-xs sm:text-sm font-semibold flex-1 leading-snug pt-0.5">
              {t.message}
            </p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
