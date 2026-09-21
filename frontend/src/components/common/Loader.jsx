export const Loader = ({ size = 'md', text = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`animate-spin rounded-full border-slate-200 border-t-accent ${
          sizeClasses[size] || sizeClasses.md
        }`}
      />
      {text && <p className="text-xs font-medium text-slate-500">{text}</p>}
    </div>
  );
};

export const Skeleton = ({ className = '', rounded = 'rounded-md' }) => {
  return <div className={`animate-shimmer bg-slate-200 ${rounded} ${className}`}></div>;
};

export const ProductCardSkeleton = () => {
  return (
    <div className="bg-surface rounded-card p-3.5 border border-line flex flex-col gap-3">
      <Skeleton className="w-full aspect-[4/4] rounded-xl" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-8 w-8 rounded-btn" />
      </div>
    </div>
  );
};

export const DashboardCardSkeleton = () => {
  return (
    <div className="bg-surface rounded-card p-5 border border-line flex flex-col gap-3">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-28" />
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="w-full bg-surface rounded-card border border-line overflow-hidden">
      <div className="p-4 border-b border-line flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
