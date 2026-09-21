import React from 'react';

export const Button = ({
  children,
  variant = 'primary', // 'primary', 'secondary', 'outline', 'ghost', 'danger'
  size = 'md', // 'sm', 'md', 'lg'
  className = '',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-btn transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none";

  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover focus:ring-primary shadow-subtle",
    secondary: "bg-accent text-white hover:bg-accent-hover focus:ring-accent shadow-subtle",
    outline: "border border-line bg-surface text-ink-primary hover:bg-slate-50 focus:ring-slate-400",
    ghost: "bg-transparent text-ink-secondary hover:text-ink-primary hover:bg-slate-100 focus:ring-slate-300",
    danger: "bg-danger text-white hover:bg-red-700 focus:ring-danger shadow-subtle",
    light: "bg-blue-50 text-accent hover:bg-blue-100 focus:ring-accent"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-6 py-3.5 text-base gap-2.5 font-semibold"
  };

  return (
    <button
      type={type}
      className={`${baseClasses} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};
