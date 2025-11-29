import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning';
  language?: 'EN' | 'AR';
}

export default function ConfirmDialog({
  title,
  message,
  confirmText = 'Yes, Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'danger',
  language = 'EN',
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" dir={language === 'AR' ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
              }`}
            >
              <AlertTriangle
                className={`w-6 h-6 ${
                  type === 'danger' ? 'text-red-600' : 'text-yellow-600'
                }`}
              />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>

          <p className="text-gray-600 mb-6">{message}</p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 hover:scale-105"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-6 py-3 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg ${
                type === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                  : 'bg-yellow-600 hover:bg-yellow-700 shadow-yellow-200'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
