import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, ShieldCheck, Truck, RefreshCw, Star, Compass } from 'lucide-react';
import { productApi } from '../services/productApi';
import { categoryApi } from '../services/categoryApi';
import { ProductCard } from '../components/product/ProductCard';
import { ProductCardSkeleton, Skeleton } from '../components/common/Loader';
import { Button } from '../components/common/Button';

export const Home = () => {
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getCategories(true),
  });

  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => productApi.getFeatured(),
  });

  const { data: newArrivalsData, isLoading: newArrivalsLoading } = useQuery({
    queryKey: ['new-arrivals'],
    queryFn: () => productApi.getNewArrivals(),
  });

  const categories = categoriesData?.data || [];
  const featuredProducts = featuredData?.data || [];
  const newArrivals = newArrivalsData?.data || [];

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* 1. HERO SECTION (Inspired by Reference 2 & 3) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        <div className="relative bg-surface rounded-card-lg border border-line p-6 sm:p-10 lg:p-16 overflow-hidden shadow-premium">
          {/* Subtle decorative background gradient */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-50/80 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-slate-100/70 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Column: Headline & Call To Action */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-badge bg-blue-50 border border-blue-200/60 text-accent text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>2026 Studio Collection Available</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-ink-primary tracking-tight leading-[1.1]">
                Discover What <br className="hidden sm:inline" />
                <span className="text-accent underline decoration-blue-200 decoration-wavy decoration-2">Moves You</span>.
              </h1>

              <p className="text-base sm:text-lg text-ink-secondary max-w-xl leading-relaxed">
                Curated everyday objects engineered with uncompromising material integrity, precision mechanics, and pure Scandinavian aesthetics.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link to="/products">
                  <Button size="lg" variant="primary" className="shadow-premium">
                    <span>Shop All Products</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/products?sort=popular">
                  <Button size="lg" variant="outline">
                    <span>Explore Bestsellers</span>
                  </Button>
                </Link>
              </div>

              {/* Metrics micro row */}
              <div className="pt-6 border-t border-line/60 grid grid-cols-3 gap-4 max-w-md">
                <div>
                  <p className="text-xl sm:text-2xl font-black text-ink-primary">30+</p>
                  <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Curated Goods</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-ink-primary">10</p>
                  <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Categories</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-ink-primary">4.9★</p>
                  <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Buyer Rating</p>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Showcase Card with Floating Accent */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-square w-full rounded-card-lg overflow-hidden bg-slate-100 border border-line shadow-float group">
                <img
                  src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000&q=85"
                  alt="Aether Pro Headphones"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />

                {/* Floating pill badge inspired by Reference 2 */}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-card-sm border border-line shadow-subtle flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent animate-ping"></div>
                  <div>
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Featured Sound</p>
                    <p className="text-xs font-extrabold text-ink-primary">Aether Pro Wireless ANC</p>
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-3.5 rounded-card-sm border border-line shadow-premium flex items-center justify-between">
                  <div>
                    <span className="text-xs text-ink-muted">Starting from</span>
                    <p className="text-base font-extrabold text-ink-primary">₹349.00</p>
                  </div>
                  <Link to="/products/aether-pro-wireless-anc-headphones">
                    <Button size="sm" variant="primary">
                      View Item
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORIES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-primary tracking-tight">
              Curated Collections
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-1">
              Browse refined goods by dedicated category disciplines.
            </p>
          </div>
          <Link to="/products" className="text-xs sm:text-sm font-semibold text-accent hover:text-accent-hover flex items-center gap-1">
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {categoriesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-card p-4 border border-line space-y-3">
                <Skeleton className="w-full aspect-square rounded-xl" />
                <Skeleton className="h-4 w-3/4 mx-auto" />
                <Skeleton className="h-3 w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.slice(0, 10).map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                className="group bg-surface rounded-card p-4 border border-line hover:border-slate-300 hover:shadow-premium transition-all duration-300 flex flex-col items-center text-center"
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-50 mb-3 relative">
                  <img
                    src={cat.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80"}
                    alt={cat.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-sm font-bold text-ink-primary group-hover:text-accent transition-colors">
                  {cat.name}
                </h3>
                <span className="text-[11px] font-medium text-ink-muted mt-0.5">
                  {cat.product_count || 0} products
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 3. FEATURED PRODUCTS (4 Columns on Desktop) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-primary tracking-tight">
              Featured Essentials
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-1">
              Hand-picked studio favorites praised by designers and everyday carriers.
            </p>
          </div>
          <Link to="/products?sort=popular" className="text-xs sm:text-sm font-semibold text-accent hover:text-accent-hover flex items-center gap-1">
            <span>Explore Popular</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {featuredLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {featuredProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 4. EDITORIAL SHOWCASE (Inspired by Reference 3 "Trail / High Quality Equipment") */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-primary text-white rounded-card-lg p-8 sm:p-12 lg:p-16 overflow-hidden relative shadow-drawer">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4 max-w-lg">
              <span className="text-xs uppercase tracking-widest text-blue-400 font-bold">Material Manifesto</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Our equipment is high quality, easy to use, and durable.
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Every material choice undergoes rigorous tactile testing. From 6061-T6 CNC aluminum keyboard chasses to vegetable-tanned Tuscan leather and X-Pac weatherproof composite weaves, we believe tools should outlast trends.
              </p>
              <div className="pt-2">
                <Link to="/products">
                  <Button variant="secondary" size="md">
                    Explore Technical Gear
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-[4/5] rounded-card-sm overflow-hidden bg-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80"
                  alt="Backpack gear"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="aspect-[4/5] rounded-card-sm overflow-hidden bg-slate-800 translate-y-4">
                <img
                  src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80"
                  alt="Mechanical watch"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. NEW ARRIVALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-primary tracking-tight">
              New Releases
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-1">
              Fresh additions freshly deployed to our fulfillment centers.
            </p>
          </div>
          <Link to="/products?sort=newest" className="text-xs sm:text-sm font-semibold text-accent hover:text-accent-hover flex items-center gap-1">
            <span>View All New</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {newArrivalsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {newArrivals.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
