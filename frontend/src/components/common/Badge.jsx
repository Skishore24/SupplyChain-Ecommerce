import React from 'react';

export const Badge = ({
  children,
  variant = 'neutral', // 'neutral', 'primary', 'accent', 'success', 'warning', 'danger'
  size = 'md', // 'sm', 'md'
  className = '',
  dot = false,
  ...props
}) => {
  const variants = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-slate-900 text-white border-transparent',
    accent: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const dots = {
    neutral: 'bg-slate-400',
    primary: 'bg-white',
    accent: 'bg-blue-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-badge ${variants[variant] || variants.neutral} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dots[variant] || dots.neutral}`}></span>}
      {children}
    </span>
  );
};
