import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { formatPrice } from '../../utils/currency';

export const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const fallbackImage = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80";

  const primaryImage = product.primary_image_url || (product.images?.[0]?.image_url) || fallbackImage;
  const secondaryImage = product.images?.[1]?.image_url;
  const [currentImage, setCurrentImage] = useState(primaryImage);

  const isSaved = isInWishlist(product.id);
  const isOutOfStock = product.stock_quantity <= 0;
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= (product.low_stock_threshold || 5);

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || isAdding) return;
    setIsAdding(true);
    await addToCart(product.id, 1);
    setIsAdding(false);
  };

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  return (
    <div
      className="group relative bg-surface rounded-card p-3 sm:p-4 border border-line flex flex-col justify-between transition-all duration-300 hover:shadow-premium hover:-translate-y-1"
      onMouseEnter={() => secondaryImage && setCurrentImage(secondaryImage)}
      onMouseLeave={() => setCurrentImage(primaryImage)}
    >
      <div>
        {/* Image Container with Badges */}
        <div className="relative aspect-square w-full rounded-card-sm overflow-hidden bg-slate-50 mb-3.5">
          <Link to={`/products/${product.slug}`} className="block w-full h-full">
            <img
              src={imageError ? fallbackImage : currentImage}
              alt={product.name}
              onError={() => setImageError(true)}
              loading="lazy"
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
          </Link>

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 pointer-events-none">
            {product.discount_percentage > 0 && (
              <span className="px-2 py-0.5 rounded-badge bg-primary text-white text-[10px] font-bold uppercase tracking-wider shadow-subtle">
                -{product.discount_percentage}%
              </span>
            )}
            {isLowStock && (
              <span className="px-2 py-0.5 rounded-badge bg-amber-500 text-white text-[10px] font-bold tracking-wider shadow-subtle">
                Low Stock
              </span>
            )}
            {isOutOfStock && (
              <span className="px-2 py-0.5 rounded-badge bg-slate-700 text-white text-[10px] font-bold tracking-wider shadow-subtle">
                Sold Out
              </span>
            )}
          </div>

          {/* Wishlist Button */}
          <button
            onClick={handleWishlistClick}
            aria-label="Toggle wishlist"
            className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all shadow-subtle z-10 ${
              isSaved
                ? 'bg-rose-50 text-rose-500 border border-rose-200'
                : 'bg-white/80 text-ink-muted hover:text-rose-500 hover:bg-white border border-line'
            }`}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Category & Rating */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider truncate">
            {product.category?.name || 'Studio Product'}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-xs font-bold text-ink-primary">{product.rating ? Number(product.rating).toFixed(1) : '5.0'}</span>
            <span className="text-[10px] text-ink-muted">({product.review_count || 0})</span>
          </div>
        </div>

        {/* Product Name */}
        <Link to={`/products/${product.slug}`} className="block group-hover:text-accent transition-colors">
          <h3 className="text-sm font-semibold text-ink-primary line-clamp-1 leading-snug mb-1">
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-ink-muted line-clamp-1 mb-3">
          {product.short_description || product.brand || 'Precision engineered'}
        </p>
      </div>

      {/* Price & Quick Add Button */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-line/60">
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-extrabold text-ink-primary">
            {formatPrice(product.price)}
          </span>
          {product.original_price && Number(product.original_price) > Number(product.price) && (
            <span className="text-xs text-ink-muted line-through">
              {formatPrice(product.original_price)}
            </span>
          )}
        </div>

        <button
          onClick={handleQuickAdd}
          disabled={isOutOfStock || isAdding}
          className={`p-2 rounded-btn transition-all duration-150 flex items-center justify-center ${
            isOutOfStock
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-accent hover:scale-105 shadow-subtle active:scale-95'
          }`}
          title={isOutOfStock ? 'Sold out' : 'Add to bag'}
        >
          <ShoppingBag className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
