import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Star, ShieldCheck, Truck, RotateCcw, Award, Heart, ShoppingBag, ArrowLeft, Check, Minus, Plus } from 'lucide-react';
import { productApi } from '../services/productApi';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { ProductGallery } from '../components/product/ProductGallery';
import { ProductReviews } from '../components/product/ProductReviews';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/Loader';
import { formatPrice } from '../utils/currency';

export const ProductDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  // Fetch product detail
  const { data: productData, isLoading, refetch } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productApi.getProductBySlug(slug),
  });

  const product = productData?.data;

  // Fetch reviews
  const { data: reviewsData, refetch: refetchReviews } = useQuery({
    queryKey: ['product-reviews', product?.id],
    queryFn: () => productApi.getReviews(product.id),
    enabled: !!product?.id,
  });

  // Fetch related products in same category
  const { data: relatedData } = useQuery({
    queryKey: ['related-products', product?.category?.slug],
    queryFn: () => productApi.getProducts({ category: product.category.slug, page_size: 4 }),
    enabled: !!product?.category?.slug,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <Skeleton className="w-full aspect-square rounded-card-lg" />
          </div>
          <div className="lg:col-span-5 space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto py-20 text-center px-4">
        <h2 className="text-xl font-bold text-ink-primary mb-2">Product Not Found</h2>
        <p className="text-sm text-ink-muted mb-6">The requested product could not be located in our catalog.</p>
        <Link to="/products">
          <Button variant="primary">Return to Catalog</Button>
        </Link>
      </div>
    );
  }

  const reviews = reviewsData?.data?.items || [];
  const related = (relatedData?.data?.items || []).filter((p) => p.id !== product.id).slice(0, 4);
  const isSaved = isInWishlist(product.id);
  const isOutOfStock = product.stock_quantity <= 0;

  const handleAddToCart = async () => {
    if (isOutOfStock || isAdding) return;
    setIsAdding(true);
    await addToCart(product.id, quantity);
    setIsAdding(false);
  };

  const handleBuyNow = async () => {
    if (isOutOfStock || isAdding) return;
    setIsAdding(true);
    const added = await addToCart(product.id, quantity);
    setIsAdding(false);
    if (added) {
      navigate('/checkout');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb back link */}
      <div className="mb-6 flex items-center gap-2 text-xs text-ink-muted">
        <Link to="/products" className="hover:text-ink-primary flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Shop
        </Link>
        <span>/</span>
        {product.category && (
          <>
            <Link to={`/products?category=${product.category.slug}`} className="hover:text-ink-primary">
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-ink-primary font-medium truncate max-w-xs">{product.name}</span>
      </div>

      {/* Main Showcase Layout (Inspired by Reference 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Left Column: Interactive Product Gallery */}
        <div className="lg:col-span-7">
          <ProductGallery images={product.images || []} productName={product.name} />
        </div>

        {/* Right Column: Product Info & Actions */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            {/* Category & SKU */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-accent">
                {product.category?.name || 'Studio Gear'}
              </span>
              <span className="text-xs text-ink-muted">SKU: {product.sku}</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-primary tracking-tight leading-snug">
              {product.name}
            </h1>

            {/* Rating summary */}
            <div className="flex items-center gap-2 mt-2.5">
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= Math.round(product.rating || 5) ? 'fill-current' : 'text-slate-200'}`}
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-ink-primary">{Number(product.rating || 5).toFixed(1)}</span>
              <span className="text-xs text-ink-muted">({product.review_count || 0} reviews)</span>
            </div>
          </div>

          {/* Pricing */}
          <div className="p-4 bg-surface rounded-card border border-line flex items-baseline gap-3">
            <span className="text-3xl font-black text-ink-primary">
              {formatPrice(product.price)}
            </span>
            {product.original_price && Number(product.original_price) > Number(product.price) && (
              <>
                <span className="text-base text-ink-muted line-through">
                  {formatPrice(product.original_price)}
                </span>
                <span className="px-2 py-0.5 rounded-badge bg-rose-50 text-danger text-xs font-bold">
                  Save {product.discount_percentage}%
                </span>
              </>
            )}
          </div>

          {/* Short Description */}
          <p className="text-sm text-ink-secondary leading-relaxed">
            {product.short_description || product.description}
          </p>

          {/* Variants selector (if present) */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary">
                Options / Variants
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-3.5 py-2 rounded-btn text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'border-accent bg-blue-50 text-accent ring-2 ring-blue-100 shadow-subtle'
                          : 'border-line bg-surface text-ink-secondary hover:border-slate-400'
                      }`}
                    >
                      {v.variant_name}
                      {Number(v.price_modifier) > 0 && ` (+${formatPrice(v.price_modifier)})`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity selector & Stock */}
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center border border-line rounded-btn bg-surface overflow-hidden">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="p-2.5 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 text-xs font-bold text-ink-primary select-none">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                disabled={quantity >= product.stock_quantity}
                className="p-2.5 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs">
              {product.stock_quantity > 0 ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  In Stock ({product.stock_quantity} units available)
                </span>
              ) : (
                <span className="text-danger font-semibold">Out of Stock</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                loading={isAdding}
                variant="primary"
                size="lg"
                className="flex-1 shadow-premium"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Shopping Bag</span>
              </Button>

              <button
                onClick={() => toggleWishlist(product.id)}
                className={`p-3.5 rounded-btn border transition-all ${
                  isSaved
                    ? 'bg-rose-50 text-rose-500 border-rose-200 shadow-subtle'
                    : 'bg-surface border-line text-ink-secondary hover:text-rose-500 hover:bg-slate-50'
                }`}
                aria-label="Save to wishlist"
              >
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            </div>

            <Button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              variant="secondary"
              size="lg"
              className="w-full"
            >
              Buy Now with Express Checkout
            </Button>
          </div>

          {/* Trust Indicators Box */}
          <div className="p-4 bg-slate-50 rounded-card border border-line grid grid-cols-2 gap-3 text-xs text-ink-secondary pt-4">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-accent" />
              <span>Complimentary insured delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>256-Bit SSL checkout</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-purple-600" />
              <span>30-Day trial returns</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              <span>2-Year warranty guaranteed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications & Extended Description */}
      <div className="mt-16 pt-12 border-t border-line grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xl font-bold text-ink-primary">Design & Engineering Notes</h2>
          <div className="text-sm text-ink-secondary leading-relaxed space-y-3">
            <p>{product.description || product.short_description}</p>
            <p>
              Each component is rigorously inspected for mechanical tolerance, acoustic balance, or tactile feedback. Designed to be field-maintainable and repairable rather than prematurely replaced.
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 bg-surface rounded-card p-6 border border-line">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-primary mb-4">Technical Specifications</h3>
          <dl className="divide-y divide-line text-xs">
            <div className="py-2.5 flex justify-between">
              <dt className="text-ink-muted">Brand</dt>
              <dd className="font-semibold text-ink-primary">{product.brand || 'SHOPERA Studio'}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-ink-muted">Category</dt>
              <dd className="font-semibold text-ink-primary">{product.category?.name || 'Accessories'}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-ink-muted">SKU Reference</dt>
              <dd className="font-mono text-ink-primary">{product.sku}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-ink-muted">Warranty</dt>
              <dd className="font-semibold text-ink-primary">24 Months Comprehensive</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Real Reviews Section */}
      <ProductReviews
        productId={product.id}
        reviews={reviews}
        averageRating={product.rating}
        totalReviews={product.review_count}
        onReviewAdded={() => {
          refetchReviews();
          refetch();
        }}
      />

      {/* Related Products Carousel / Grid */}
      {related.length > 0 && (
        <div className="mt-20 pt-12 border-t border-line">
          <h2 className="text-xl font-bold text-ink-primary mb-6">Complete the Setup / Related Items</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
