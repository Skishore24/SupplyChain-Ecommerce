import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag, Trash2, Edit2, Percent, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Loader } from '../../components/common/Loader';
import { EmptyState } from '../../components/common/EmptyState';
import { formatPrice } from '../../utils/currency';

export const Coupons = () => {
  const { showToast } = useCart();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [form, setForm] = useState({
    code: '',
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    minimum_order: 0,
    maximum_discount: '',
    usage_limit: 100,
    is_active: true,
  });

  const { data: couponsData, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => adminApi.getCoupons(),
  });
  const coupons = couponsData?.data || [];

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setForm({
      code: '',
      discount_type: 'PERCENTAGE',
      discount_value: 15,
      minimum_order: 50,
      maximum_discount: '',
      usage_limit: 100,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCoupon(c);
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: parseFloat(c.discount_value),
      minimum_order: parseFloat(c.minimum_order || 0),
      maximum_discount: c.maximum_discount ? String(c.maximum_discount) : '',
      usage_limit: c.usage_limit ?? 100,
      is_active: c.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingCoupon) {
        return adminApi.updateCoupon(editingCoupon.id, payload);
      }
      return adminApi.createCoupon(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-coupons']);
      showToast(editingCoupon ? 'Coupon updated' : 'Coupon created', 'success');
      setIsModalOpen(false);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to save coupon', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-coupons']);
      showToast('Coupon deleted', 'success');
      setDeleteConfirmId(null);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to delete coupon', 'error');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.code || !form.discount_value) {
      showToast('Coupon code and discount value are required', 'error');
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      minimum_order: parseFloat(form.minimum_order || 0),
      maximum_discount: form.maximum_discount ? parseFloat(form.maximum_discount) : null,
      usage_limit: parseInt(form.usage_limit, 10),
      is_active: form.is_active,
    };

    saveMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900">Promotions & Coupons</h1>
          <p className="text-sm text-slate-500">Create discount codes, set spending limits, and track marketing voucher usage.</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Create Coupon
        </Button>
      </div>

      {/* Coupons Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader size="lg" text="Loading promotional coupons..." />
          </div>
        ) : coupons.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No promotional coupons yet"
            description="Create your first marketing campaign coupon code to boost customer conversion."
            actionLabel="Create Coupon"
            onAction={handleOpenCreate}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-4">Promo Code</th>
                  <th className="px-6 py-4">Discount Type</th>
                  <th className="px-6 py-4">Benefit</th>
                  <th className="px-6 py-4">Min Spend</th>
                  <th className="px-6 py-4">Usage Counter</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coupons.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-accent" />
                        <span className="font-mono font-bold text-slate-900 tracking-wider">
                          {c.code}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                      {c.discount_type === 'PERCENTAGE' ? 'Percentage Off' : 'Fixed Amount Off'}
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-900">
                      {c.discount_type === 'PERCENTAGE'
                        ? `${parseFloat(c.discount_value)}% OFF`
                        : `${formatPrice(c.discount_value)} OFF`}
                      {c.maximum_discount && (
                        <span className="block text-xs font-normal text-slate-400">
                          Max {formatPrice(c.maximum_discount)}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-700">
                      {formatPrice(c.minimum_order)}
                    </td>

                    <td className="px-6 py-4 text-xs font-mono text-slate-600">
                      <span className="font-bold text-slate-900">{c.used_count}</span> / {c.usage_limit} uses
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant={c.is_active ? 'success' : 'neutral'}>
                        {c.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(c.id)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create Promotion Coupon'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Promo Code *"
            placeholder="e.g. SUMMER25, LUXURY50"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-700 uppercase">
                Discount Type *
              </label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:border-accent focus:outline-hidden"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed Dollar ($)</option>
              </select>
            </div>

            <Input
              label={form.discount_type === 'PERCENTAGE' ? 'Discount Rate (%) *' : 'Discount Value ($) *'}
              type="number"
              step="0.01"
              value={form.discount_value}
              onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Minimum Cart Subtotal ($)"
              type="number"
              step="0.01"
              value={form.minimum_order}
              onChange={(e) => setForm({ ...form, minimum_order: e.target.value })}
            />

            <Input
              label="Maximum Discount Cap ($)"
              type="number"
              step="0.01"
              placeholder="Optional"
              value={form.maximum_discount}
              onChange={(e) => setForm({ ...form, maximum_discount: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max Usages Limit *"
              type="number"
              value={form.usage_limit}
              onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
              required
            />

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="cpn_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded-md border-slate-300 text-accent focus:ring-accent"
              />
              <label htmlFor="cpn_active" className="text-sm font-medium text-slate-700">
                Active & Redeemable
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Coupon"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this promotional coupon? Customers will no longer be able to apply it.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteConfirmId)}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
