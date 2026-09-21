import React, { useState } from 'react';
import { Star, MessageSquarePlus } from 'lucide-react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { productApi } from '../../services/productApi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export const ProductReviews = ({ productId, reviews = [], averageRating = 5.0, totalReviews = 0, onReviewAdded }) => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useCart();
  const [modalOpen, setModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      showToast("Please write a short review comment", "warning");
      return;
    }
    try {
      setSubmitting(true);
      const res = await productApi.createReview(productId, { rating, comment });
      if (res.success) {
        showToast("Review submitted successfully!", "success");
        setModalOpen(false);
        setComment('');
        if (onReviewAdded) onReviewAdded();
      }
    } catch (err) {
      showToast(err.message || "Failed to submit review", "danger");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-16 pt-12 border-t border-line">
      {/* Header with Stats & Write Review Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-ink-primary">Verified Customer Reviews</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${s <= Math.round(averageRating) ? 'fill-current' : 'text-slate-200'}`}
                />
              ))}
            </div>
            <span className="text-sm font-bold text-ink-primary">{Number(averageRating).toFixed(1)} out of 5</span>
            <span className="text-xs text-ink-muted">({totalReviews} reviews)</span>
          </div>
        </div>

        <Button
          onClick={() => {
            if (!isAuthenticated) {
              showToast("Please sign in to submit a review", "warning");
              return;
            }
            setModalOpen(true);
          }}
          variant="outline"
          size="sm"
          className="self-start sm:self-auto"
        >
          <MessageSquarePlus className="w-4 h-4" />
          Write a Review
        </Button>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="bg-surface rounded-card p-8 text-center border border-line text-ink-muted text-sm">
          No reviews for this product yet. Be the first to share your experience!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((rev) => (
            <div key={rev.id} className="bg-surface rounded-card p-5 border border-line shadow-subtle flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${s <= Math.round(rev.rating) ? 'fill-current' : 'text-slate-200'}`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-ink-muted">
                    {new Date(rev.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-sm text-ink-primary leading-relaxed mb-3">
                  "{rev.comment}"
                </p>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-line/50">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                  {rev.user?.first_name?.[0] || 'U'}
                </div>
                <span className="text-xs font-semibold text-ink-secondary">
                  {rev.user?.first_name} {rev.user?.last_name?.[0]}.
                </span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-badge font-medium">
                  Verified Buyer
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Write Review Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Write a Product Review">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-2 uppercase tracking-wider">
              Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform focus:outline-none"
                >
                  <Star
                    className={`w-7 h-7 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                  />
                </button>
              ))}
              <span className="text-sm font-semibold text-ink-primary ml-2">{rating} Stars</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wider">
              Your Review & Experience
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you love most about this product? How is the acoustic balance, material feel, or daily performance?"
              className="w-full bg-slate-50 border border-line rounded-input p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-line">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={submitting}>
              Submit Review
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
