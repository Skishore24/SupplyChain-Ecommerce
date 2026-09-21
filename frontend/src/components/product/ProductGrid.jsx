import React from 'react';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from '../common/Loader';
import { EmptyState } from '../common/EmptyState';
import { PackageSearch } from 'lucide-react';

export const ProductGrid = ({
  products = [],
  loading = false,
  skeletonCount = 8,
  onResetFilters
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No products found"
        description="We couldn't find any items matching your active filter criteria. Try adjusting your filters or search keywords."
        actionText={onResetFilters ? "Clear All Filters" : undefined}
        onAction={onResetFilters}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
