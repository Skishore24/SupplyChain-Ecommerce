import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { formatPrice } from '../utils/currency';

export const Wishlist = () => {
  const { wishlist, itemCount, removeFromWishlist, moveToCart } = useWishlist();
  const navigate = useNavigate();

  const items = wishlist?.items || [];

  if (itemCount === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Save pieces you love while browsing our catalog and return to them anytime."
          actionText="Discover Studio Products"
          onAction={() => navigate('/products')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-line">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-primary tracking-tight">
            Saved Items ({itemCount})
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Goods saved for your future studio or everyday setups.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => {
          const product = item.product;
          if (!product) return null;
          const isOutOfStock = product.stock_quantity <= 0;

          return (
            <div
              key={item.id}
              className="bg-surface rounded-card p-4 border border-line shadow-subtle flex flex-col justify-between"
            >
              <div>
                <div className="aspect-square w-full rounded-card-sm overflow-hidden bg-slate-50 mb-3 relative">
                  <Link to={`/products/${product.slug}`}>
                    <img
                      src={product.primary_image_url}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/80 backdrop-blur-md border border-line text-ink-muted hover:text-danger hover:bg-white shadow-subtle"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  {product.category?.name || 'Item'}
                </span>
                <Link to={`/products/${product.slug}`}>
                  <h3 className="text-sm font-bold text-ink-primary line-clamp-1 hover:text-accent transition-colors">
                    {product.name}
                  </h3>
                </Link>
                <p className="text-base font-black text-ink-primary mt-1">
                  {formatPrice(product.price)}
                </p>
              </div>

              <div className="pt-4 border-t border-line/60 mt-4">
                <Button
                  onClick={() => moveToCart(product.id)}
                  disabled={isOutOfStock}
                  variant="primary"
                  size="sm"
                  className="w-full"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{isOutOfStock ? 'Sold Out' : 'Move to Bag'}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
