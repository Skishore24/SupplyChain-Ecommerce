import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, X, SlidersHorizontal, ChevronDown, Check } from 'lucide-react';
import { productApi } from '../services/productApi';
import { categoryApi } from '../services/categoryApi';
import { ProductGrid } from '../components/product/ProductGrid';
import { Pagination } from '../components/common/Pagination';
import { Button } from '../components/common/Button';

export const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Extract query params
  const page = parseInt(searchParams.get('page') || '1', 10);
  const categorySlug = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';
  const rating = searchParams.get('rating') || '';
  const inStock = searchParams.get('in_stock') === 'true';
  const sort = searchParams.get('sort') || 'featured';

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getCategories(true),
  });
  const categories = categoriesData?.data || [];

  // Fetch products with current parameters
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', page, categorySlug, search, minPrice, maxPrice, rating, inStock, sort],
    queryFn: () =>
      productApi.getProducts({
        page,
        page_size: 12,
        category: categorySlug || undefined,
        search: search || undefined,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
        rating: rating ? Number(rating) : undefined,
        in_stock: inStock ? true : undefined,
        sort,
      }),
  });

  const products = productsData?.data?.items || [];
  const total = productsData?.data?.total || 0;
  const totalPages = productsData?.data?.total_pages || 1;

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === null || value === undefined || value === '') {
      newParams.delete(key);
    } else {
      newParams.set(key, String(value));
    }
    // Always reset to page 1 on filter changes
    if (key !== 'page') {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = categorySlug || search || minPrice || maxPrice || rating || inStock;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header & Sort Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-line mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink-primary tracking-tight">
            {search ? `Search results for "${search}"` : categorySlug ? `Category: ${categories.find(c => c.slug === categorySlug)?.name || categorySlug}` : 'All Products'}
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Showing <span className="font-semibold text-ink-primary">{total}</span> items
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-surface border border-line rounded-btn text-ink-primary hover:bg-slate-50"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters {hasActiveFilters ? '(Active)' : ''}</span>
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <span className="text-xs text-ink-muted hidden sm:inline">Sort:</span>
            <select
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="bg-surface border border-line rounded-btn py-2 px-3 text-xs font-medium text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest Releases</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block space-y-6 bg-surface p-6 rounded-card border border-line h-fit shadow-subtle">
          <div className="flex items-center justify-between pb-4 border-b border-line">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
              <Filter className="w-4 h-4 text-accent" />
              Filter Catalog
            </h3>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-accent hover:underline font-medium"
              >
                Reset
              </button>
            )}
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-secondary mb-3">Categories</h4>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              <button
                onClick={() => updateParam('category', '')}
                className={`w-full text-left px-2.5 py-1.5 rounded-btn text-xs font-medium transition-colors flex items-center justify-between ${
                  !categorySlug ? 'bg-blue-50 text-accent font-semibold' : 'text-ink-secondary hover:bg-slate-50'
                }`}
              >
                <span>All Categories</span>
                {!categorySlug && <Check className="w-3.5 h-3.5" />}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => updateParam('category', cat.slug)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-btn text-xs font-medium transition-colors flex items-center justify-between ${
                    categorySlug === cat.slug ? 'bg-blue-50 text-accent font-semibold' : 'text-ink-secondary hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  <span className="text-[10px] text-ink-muted">({cat.product_count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="pt-4 border-t border-line">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-secondary mb-3">Price Range (₹)</h4>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => updateParam('min_price', e.target.value)}
                className="w-full bg-slate-50 border border-line rounded-input px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => updateParam('max_price', e.target.value)}
                className="w-full bg-slate-50 border border-line rounded-input px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Minimum Rating */}
          <div className="pt-4 border-t border-line">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-secondary mb-3">Rating</h4>
            <div className="space-y-1">
              {[4.5, 4.0, 3.5].map((stars) => (
                <button
                  key={stars}
                  onClick={() => updateParam('rating', rating === String(stars) ? '' : stars)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-btn text-xs transition-colors flex items-center justify-between ${
                    rating === String(stars) ? 'bg-blue-50 text-accent font-semibold' : 'text-ink-secondary hover:bg-slate-50'
                  }`}
                >
                  <span>{stars}★ & above</span>
                  {rating === String(stars) && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Stock Availability */}
          <div className="pt-4 border-t border-line">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => updateParam('in_stock', e.target.checked ? 'true' : '')}
                className="w-4 h-4 rounded text-accent focus:ring-accent border-line"
              />
              <span className="text-xs font-medium text-ink-secondary">In Stock Items Only</span>
            </label>
          </div>
        </aside>

        {/* Products Grid & Pagination */}
        <div className="lg:col-span-3 space-y-6">
          <ProductGrid
            products={products}
            loading={isLoading}
            onResetFilters={handleClearFilters}
          />

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(newPage) => updateParam('page', newPage)}
          />
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileFilterOpen(false)} />
          <div className="relative w-4/5 max-w-sm bg-surface h-full shadow-drawer p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-line">
                <span className="text-sm font-bold uppercase tracking-wider">Filters</span>
                <button onClick={() => setMobileFilterOpen(false)}>
                  <X className="w-5 h-5 text-ink-muted" />
                </button>
              </div>

              {/* Categories */}
              <div>
                <h4 className="text-xs font-bold uppercase text-ink-secondary mb-2">Categories</h4>
                <div className="space-y-1">
                  <button
                    onClick={() => { updateParam('category', ''); setMobileFilterOpen(false); }}
                    className="w-full text-left py-1.5 text-xs text-ink-secondary hover:text-accent"
                  >
                    All Categories
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { updateParam('category', c.slug); setMobileFilterOpen(false); }}
                      className="w-full text-left py-1.5 text-xs text-ink-secondary hover:text-accent truncate"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => updateParam('in_stock', e.target.checked ? 'true' : '')}
                  className="w-4 h-4 rounded text-accent"
                />
                <span className="text-xs text-ink-secondary">In Stock Only</span>
              </label>
            </div>

            <div className="pt-6 border-t border-line flex gap-3">
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="w-1/2">
                Clear
              </Button>
              <Button size="sm" onClick={() => setMobileFilterOpen(false)} className="w-1/2">
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
