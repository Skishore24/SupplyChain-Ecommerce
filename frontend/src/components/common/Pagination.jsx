import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-btn border border-line bg-surface text-ink-secondary hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {Array.from({ length: totalPages }).map((_, idx) => {
        const page = idx + 1;
        // Show first, last, and window around current
        if (
          page === 1 ||
          page === totalPages ||
          (page >= currentPage - 1 && page <= currentPage + 1)
        ) {
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-9 h-9 text-xs font-semibold rounded-btn transition-colors ${
                currentPage === page
                  ? 'bg-primary text-white shadow-subtle'
                  : 'border border-line bg-surface text-ink-secondary hover:bg-slate-50'
              }`}
            >
              {page}
            </button>
          );
        }
        if (page === currentPage - 2 || page === currentPage + 2) {
          return (
            <span key={page} className="px-1 text-ink-muted text-xs">
              ...
            </span>
          );
        }
        return null;
      })}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-btn border border-line bg-surface text-ink-secondary hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
