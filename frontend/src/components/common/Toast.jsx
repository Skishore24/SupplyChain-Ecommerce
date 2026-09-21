import React from 'react';
import { useCart } from '../../context/CartContext';
import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';

export const Toast = () => {
  const { toastMessage } = useCart();
  if (!toastMessage) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    danger: <XCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-600 shrink-0" />
  };

  const bgStyles = {
    success: 'bg-white border-emerald-200 text-slate-800',
    danger: 'bg-white border-rose-200 text-slate-800',
    warning: 'bg-white border-amber-200 text-slate-800',
    info: 'bg-white border-blue-200 text-slate-800'
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-card border shadow-float ${bgStyles[toastMessage.type] || bgStyles.info} min-w-[280px] max-w-md`}>
        {icons[toastMessage.type] || icons.info}
        <span className="text-sm font-medium">
          {toastMessage.message}
        </span>
      </div>
    </div>
  );
};
