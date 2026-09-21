import React, { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  id,
  type = 'text',
  ...props
}, ref) => {
  const inputId = id || props.name || Math.random().toString(36).substr(2, 9);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative rounded-input">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`w-full bg-surface border ${error ? 'border-danger focus:ring-danger' : 'border-line focus:ring-accent focus:border-accent'} rounded-input py-2.5 px-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-colors ${Icon ? 'pl-10' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-danger font-medium flex items-center gap-1">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-xs text-ink-muted">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
