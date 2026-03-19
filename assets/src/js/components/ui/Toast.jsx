import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ErrorIcon, SuccessIcon, WarningIcon, InfoIcon, CloseIcon } from '../icons';

const ToastContext = createContext(null);

const ICONS = {
  error: <ErrorIcon className="w-5 h-5" />,
  success: <SuccessIcon className="w-5 h-5" />,
  warning: <WarningIcon className="w-5 h-5" />,
  info: <InfoIcon className="w-5 h-5" />,
};

const STYLES = {
  error: { bg: 'bg-gradient-to-r from-red-500/20 to-red-600/10', border: 'border-red-500/40', icon: 'text-red-400', text: 'text-red-100', progress: 'bg-red-500' },
  success: { bg: 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/40', icon: 'text-emerald-400', text: 'text-emerald-100', progress: 'bg-emerald-500' },
  warning: { bg: 'bg-gradient-to-r from-amber-500/20 to-amber-600/10', border: 'border-amber-500/40', icon: 'text-amber-400', text: 'text-amber-100', progress: 'bg-amber-500' },
  info: { bg: 'bg-gradient-to-r from-blue-500/20 to-blue-600/10', border: 'border-blue-500/40', icon: 'text-blue-400', text: 'text-blue-100', progress: 'bg-blue-500' },
};

function ToastItem({ id, type, message, duration, action, onDismiss }) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);
  const style = STYLES[type] || STYLES.info;

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) { clearInterval(interval); handleDismiss(); }
    }, 50);
    return () => clearInterval(interval);
  }, [duration]);

  const handleDismiss = () => { setIsLeaving(true); setTimeout(() => onDismiss(id), 300); };

  return (
    <div className={`relative overflow-hidden rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 ${style.bg} ${style.border} ${isLeaving ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`} style={{ minWidth: '320px', maxWidth: '420px' }}>
      <div className="flex items-start gap-3 p-4">
        <div className={`flex-shrink-0 ${style.icon}`}>{ICONS[type]}</div>
        <p className={`flex-1 text-sm font-medium ${style.text}`}>{message}</p>
        {action && (
          <button 
            onClick={() => { action.onClick(); handleDismiss(); }} 
            className="flex-shrink-0 px-3 py-1 text-xs font-semibold rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            {action.label}
          </button>
        )}
        <button onClick={handleDismiss} className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"><CloseIcon className="w-4 h-4" /></button>
      </div>
      <div className="h-1 w-full bg-black/20"><div className={`h-full ${style.progress} transition-all duration-100 ease-linear`} style={{ width: `${progress}%` }} /></div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((type, message, options = {}) => { 
    const { duration = 5000, action } = typeof options === 'number' ? { duration: options } : options;
    const id = Date.now() + Math.random(); 
    setToasts((prev) => [...prev, { id, type, message, duration, action }]); 
    return id; 
  }, []);
  const removeToast = useCallback((id) => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, []);
  const toast = { error: (msg, dur) => addToast('error', msg, dur), success: (msg, dur) => addToast('success', msg, dur), warning: (msg, dur) => addToast('warning', msg, dur), info: (msg, dur) => addToast('info', msg, dur), dismiss: removeToast };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">{toasts.map((t) => <ToastItem key={t.id} {...t} onDismiss={removeToast} />)}</div>
    </ToastContext.Provider>
  );
}

export function useToast() { const ctx = useContext(ToastContext); if (!ctx) throw new Error('useToast must be used within ToastProvider'); return ctx; }