import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  showClose = true
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className={`relative bg-surface rounded-card-lg border border-line shadow-drawer w-full ${maxWidth} overflow-hidden z-10 animate-in zoom-in-95 duration-200`}>
        {title && (
          <div className="px-6 py-4 border-b border-line flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink-primary">
              {title}
            </h3>
            {showClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-full text-ink-muted hover:text-ink-primary hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className="p-6 max-h-[85vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
