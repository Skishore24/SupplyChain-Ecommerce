import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, MessageSquare, Check, X, Trash2, Filter } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Pagination } from '../../components/common/Pagination';
import { Loader } from '../../components/common/Loader';
import { EmptyState } from '../../components/common/EmptyState';

const STATUS_TABS = ['ALL', 'APPROVED', 'PENDING', 'REJECTED'];

export const Reviews = () => {
  const { showToast } = useCart();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['admin-reviews', page, statusFilter],
    queryFn: () =>
      adminApi.getReviews({
        page,
        page_size: 10,
        status_filter: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  });

  const reviews = reviewsData?.data?.items || [];
  const totalPages = reviewsData?.data?.total_pages || 1;

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => adminApi.updateReviewStatus(id, status),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-reviews']);
      showToast('Review status updated', 'success');
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to update review status', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-reviews']);
      showToast('Review deleted', 'success');
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to delete review', 'error');
    },
  });

  const getStatusBadge = (st) => {
    switch (st) {
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900">Review Moderation</h1>
          <p className="text-sm text-slate-500">Approve or reject customer product feedback and preserve review credibility.</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xs">
        {STATUS_TABS.map((st) => (
          <button
            key={st}
            onClick={() => {
              setStatusFilter(st);
              setPage(1);
            }}
            className={`rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all ${
              statusFilter === st
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Reviews Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader size="lg" text="Loading customer reviews..." />
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No reviews found"
            description="There are no reviews matching your current moderation filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Rating</th>
                  <th className="px-6 py-4">Feedback Comment</th>
                  <th className="px-6 py-4">Submitted</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviews.map((rev) => (
                  <tr key={rev.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {rev.product?.primary_image_url && (
                          <img
                            src={rev.product.primary_image_url}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                          />
                        )}
                        <span className="font-semibold text-slate-900 max-w-[160px] truncate block">
                          {rev.product?.name || `Product #${rev.product_id}`}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs">
                      <div className="font-semibold text-slate-900">
                        {rev.user?.first_name} {rev.user?.last_name}
                      </div>
                      <div className="text-slate-400">{rev.user?.email}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="max-w-[280px] text-xs text-slate-700 line-clamp-3">
                        {rev.comment}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(rev.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="px-6 py-4">{getStatusBadge(rev.status)}</td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {rev.status !== 'APPROVED' && (
                          <button
                            onClick={() =>
                              updateStatusMutation.mutate({ id: rev.id, status: 'APPROVED' })
                            }
                            title="Approve Review"
                            className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {rev.status !== 'REJECTED' && (
                          <button
                            onClick={() =>
                              updateStatusMutation.mutate({ id: rev.id, status: 'REJECTED' })
                            }
                            title="Reject Review"
                            className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteMutation.mutate(rev.id)}
                          title="Delete Review"
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
