import { X, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'confirm' | 'alert';
}

export function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Tamam',
  cancelText = 'İptal',
  type = 'confirm',
}: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-scale-in">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <AlertCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 transition-colors"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-slate-600 leading-relaxed whitespace-pre-line">{message}</p>
          </div>

          <div className="flex gap-3 justify-end">
            {type === 'confirm' && (
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={() => {
                if (onConfirm) onConfirm();
                onClose();
              }}
              className="px-5 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30 transition-all"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
