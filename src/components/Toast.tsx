import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  language?: 'EN' | 'AR';
}

export default function Toast({ message, type, onClose, language = 'EN' }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 ${language === 'AR' ? 'left-4' : 'right-4'} z-50 ${language === 'AR' ? 'animate-slide-in-rtl' : 'animate-slide-in'}`} dir={language === 'AR' ? 'rtl' : 'ltr'}>
      <div
        className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl ${
          type === 'success'
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
        }`}
      >
        {type === 'success' ? (
          <CheckCircle className="w-5 h-5" />
        ) : (
          <XCircle className="w-5 h-5" />
        )}
        <span className="font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 hover:bg-white/20 rounded-lg p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
