import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Icon and Style mapping
  const getToastDetails = (type) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="text-emerald-500 shrink-0 animate-bounce" size={20} />,
          bg: 'bg-white dark:bg-zinc-900 border-emerald-500/30 text-gray-900 dark:text-zinc-100',
          shadow: 'shadow-[0_8px_30px_rgb(16,185,129,0.12)]',
        };
      case 'error':
        return {
          icon: <XCircle className="text-red-500 shrink-0" size={20} />,
          bg: 'bg-white dark:bg-zinc-900 border-red-500/30 text-gray-900 dark:text-zinc-100',
          shadow: 'shadow-[0_8px_30px_rgb(239,68,68,0.12)]',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="text-amber-500 shrink-0" size={20} />,
          bg: 'bg-white dark:bg-zinc-900 border-amber-500/30 text-gray-900 dark:text-zinc-100',
          shadow: 'shadow-[0_8px_30px_rgb(245,158,11,0.12)]',
        };
      default:
        return {
          icon: <Info className="text-blue-500 shrink-0" size={20} />,
          bg: 'bg-white dark:bg-zinc-900 border-blue-500/30 text-gray-900 dark:text-zinc-100',
          shadow: 'shadow-[0_8px_30px_rgb(59,130,246,0.12)]',
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Portal Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const details = getToastDetails(toast.type);
          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 p-4 rounded-xl border ${details.bg} ${details.shadow} pointer-events-auto backdrop-blur-md transform transition-all duration-300 translate-y-0 opacity-100 animate-slide-in`}
            >
              {details.icon}
              <div className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
