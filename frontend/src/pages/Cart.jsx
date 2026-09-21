import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Heart, ArrowRight, ShoppingBag, Tag, ShieldCheck, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { formatPrice } from '../utils/currency';

export const Cart = () => {
  const { cart, loading, updateQuantity, removeItem, applyCoupon } = useCart();
  const { toggleWishlist } = useWishlist();
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const items = cart?.items || [];
  const subtotal = Number(cart?.subtotal || 0);
  const discount = Number(cart?.discount || 0);
  const shipping = Number(cart?.shipping || 0);
  const tax = Number(cart?.tax || 0);
  const total = Number(cart?.total || 0);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setApplyingCoupon(true);
    await applyCoupon(couponInput.trim().toUpperCase());
    setApplyingCoupon(false);
  };

  const handleMoveToWishlist = async (productId, itemId) => {
    await toggleWishlist(productId);
    await removeItem(itemId);
  };

  if (!loading && items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Your shopping bag is empty"
          description="Explore our curated catalog of precision-engineered everyday goods and discover your next companion."
          actionText="Explore All Goods"
          onAction={() => navigate('/products')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-primary tracking-tight mb-8">
        Shopping Bag ({cart?.item_count || 0} items)
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-surface rounded-card border border-line divide-y divide-line overflow-hidden shadow-subtle">
            {items.map((item) => {
              const product = item.product;
              const imgUrl = product?.primary_image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';
              return (
                <div key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  {/* Image & Info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-card-sm overflow-hidden bg-slate-50 border border-line shrink-0">
                      <img
                        src={imgUrl}
                        alt={product?.name || 'Item'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        {product?.category?.name || 'Curated Item'}
                      </span>
                      <Link to={`/products/${product?.slug}`} className="block hover:text-accent transition-colors">
                        <h3 className="text-sm font-bold text-ink-primary truncate max-w-sm">
                          {product?.name}
                        </h3>
                      </Link>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {formatPrice(item.price_at_time)} each
                      </p>
                    </div>
                  </div>

                  {/* Quantity controls & Line Total */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-line/40">
                    <div className="flex items-center border border-line rounded-btn bg-surface">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2.5 py-1 text-xs hover:bg-slate-100 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="px-2.5 text-xs font-bold text-ink-primary select-none">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2.5 py-1 text-xs hover:bg-slate-100 transition-colors"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right min-w-[80px]">
                      <span className="text-base font-extrabold text-ink-primary">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleMoveToWishlist(item.product_id, item.id)}
                        className="p-2 rounded-btn text-ink-muted hover:text-rose-500 hover:bg-slate-100 transition-colors"
                        title="Move to wishlist"
                      >
                        <Heart className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 rounded-btn text-ink-muted hover:text-danger hover:bg-slate-100 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link to="/products" className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
              ← Continue Shopping
            </Link>
          </div>
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-5">
            <h2 className="text-base font-bold text-ink-primary uppercase tracking-wider pb-3 border-b border-line">
              Order Summary
            </h2>

            {/* Coupon Application */}
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                Have a Promo Code?
              </label>
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-2.5 w-4 h-4 text-ink-muted" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="e.g. SHOPERA10"
                    className="w-full bg-slate-50 border border-line rounded-input pl-9 pr-3 py-2 text-xs uppercase font-medium focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <Button type="submit" variant="outline" size="sm" loading={applyingCoupon}>
                  Apply
                </Button>
              </form>
              {cart?.coupon_code && (
                <p className="text-xs text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
                  Coupon "{cart.coupon_code}" applied successfully!
                </p>
              )}
            </div>

            {/* Price Calculations Breakdown */}
            <div className="space-y-2.5 text-xs text-ink-secondary pt-2 border-t border-line/60">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-ink-primary">{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Promotional Discount</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-semibold text-ink-primary">
                  {shipping === 0 ? 'Complimentary' : formatPrice(shipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Tax (8%)</span>
                <span className="font-semibold text-ink-primary">{formatPrice(tax)}</span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="pt-3 border-t border-line flex justify-between items-baseline">
              <span className="text-sm font-bold text-ink-primary">Total Amount</span>
              <span className="text-2xl font-black text-ink-primary">{formatPrice(total)}</span>
            </div>

            {/* Checkout Action */}
            <Button
              onClick={() => navigate('/checkout')}
              variant="primary"
              size="lg"
              className="w-full shadow-premium"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <div className="pt-2 text-center text-[11px] text-ink-muted flex items-center justify-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Safe 256-Bit Encrypted Payment Flow</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
