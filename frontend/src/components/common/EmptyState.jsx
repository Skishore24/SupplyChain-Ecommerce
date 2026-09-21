import React from 'react';
import { Button } from './Button';

export const EmptyState = ({
  icon: Icon,
  title = "No items found",
  description = "There are currently no records matching your criteria.",
  actionText,
  onAction,
  className = ""
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center bg-surface rounded-card border border-line ${className}`}>
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-ink-muted mb-4 shadow-subtle">
          <Icon className="w-8 h-8" />
        </div>
      )}
      <h3 className="text-base font-semibold text-ink-primary mb-1">
        {title}
      </h3>
      <p className="text-sm text-ink-secondary max-w-sm mb-6">
        {description}
      </p>
      {actionText && onAction && (
        <Button onClick={onAction} size="sm" variant="primary">
          {actionText}
        </Button>
      )}
    </div>
  );
};
