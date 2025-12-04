
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((type: ToastType, message: string, duration = 3000) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast: Toast = { id, type, message, duration };

        setToasts(prev => [...prev, newToast]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }

        // Haptic feedback on mobile
        if ('vibrate' in navigator) {
            navigator.vibrate(type === 'error' ? [100, 50, 100] : 50);
        }
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success': return <CheckCircle size={18} />;
            case 'error': return <XCircle size={18} />;
            case 'warning': return <AlertTriangle size={18} />;
            case 'info': return <Info size={18} />;
        }
    };

    const getStyles = (type: ToastType) => {
        switch (type) {
            case 'success': return 'toast-success';
            case 'error': return 'toast-error';
            case 'warning': return 'toast-warning';
            case 'info': return 'bg-blue-600 shadow-[0_10px_40px_rgba(59,130,246,0.4)]';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-24 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none">
                {toasts.map((toast, index) => (
                    <div
                        key={toast.id}
                        className={`toast show ${getStyles(toast.type)} flex items-center gap-3 pointer-events-auto`}
                        style={{
                            transform: `translateX(-50%) translateY(${-index * 60}px)`,
                            zIndex: 50 - index
                        }}
                    >
                        {getIcon(toast.type)}
                        <span className="text-white font-medium">{toast.message}</span>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

// Standalone toast component for use without context
interface ToastNotificationProps {
    type: ToastType;
    message: string;
    visible: boolean;
    onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
    type,
    message,
    visible,
    onClose
}) => {
    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={18} />;
            case 'error': return <XCircle size={18} />;
            case 'warning': return <AlertTriangle size={18} />;
            case 'info': return <Info size={18} />;
        }
    };

    const getStyles = () => {
        switch (type) {
            case 'success': return 'toast-success';
            case 'error': return 'toast-error';
            case 'warning': return 'toast-warning';
            case 'info': return 'bg-blue-600 shadow-[0_10px_40px_rgba(59,130,246,0.4)]';
        }
    };

    return (
        <div className={`toast ${visible ? 'show' : ''} ${getStyles()} flex items-center gap-3`}>
            {getIcon()}
            <span className="text-white font-medium">{message}</span>
            <button
                onClick={onClose}
                className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
            >
                <X size={14} />
            </button>
        </div>
    );
};

export default ToastProvider;
