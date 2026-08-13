import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'success') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 scale-100 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
                            toast.type === 'error'
                                ? 'bg-red-950/20 border-red-500/30 text-red-400 shadow-red-950/20'
                                : toast.type === 'warning'
                                ? 'bg-amber-950/20 border-amber-500/30 text-amber-400 shadow-amber-950/20'
                                : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400 shadow-emerald-950/20'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            {toast.type === 'error' ? (
                                <div className="h-7 w-7 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                            ) : toast.type === 'warning' ? (
                                <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                            ) : (
                                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                            <span className="text-sm font-semibold tracking-tight">{toast.message}</span>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 cursor-pointer rounded-lg hover:bg-zinc-800"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
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
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
