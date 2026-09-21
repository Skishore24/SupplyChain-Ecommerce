import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, AlertTriangle, Layers, Edit3, ArrowUpRight, CheckCircle } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import { Loader } from '../../components/common/Loader';
import { EmptyState } from '../../components/common/EmptyState';

export const Inventory = () => {
  const { showToast } = useCart();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Edit stock modal
  const [editingItem, setEditingItem] = useState(null);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);

  const { data: invData, isLoading } = useQuery({
    queryKey: ['admin-inventory', page, search, lowStockOnly],
    queryFn: () =>
      adminApi.getInventory({
        page,
        page_size: 15,
        search: search.trim() || undefined,
        low_stock_only: lowStockOnly,
      }),
  });

  const items = invData?.data?.items || [];
  const totalPages = invData?.data?.total_pages || 1;

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateInventory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-inventory']);
      queryClient.invalidateQueries(['admin-products']);
      queryClient.invalidateQueries(['admin-dashboard']);
      showToast('Inventory updated successfully', 'success');
      setEditingItem(null);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to update stock', 'error');
    },
  });

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setStockQuantity(item.current_stock);
    setLowStockThreshold(item.low_stock_threshold);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!editingItem) return;
    updateMutation.mutate({
      id: editingItem.id,
      data: {
        stock_quantity: parseInt(stockQuantity, 10),
        low_stock_threshold: parseInt(lowStockThreshold, 10),
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900">Inventory & Stock</h1>
          <p className="text-sm text-slate-500">Monitor warehouse supply, restock items, and configure low-stock safety triggers.</p>
        </div>
      </div>

      {/* Filter and Low Stock Switcher */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU or item name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-sm text-slate-900 focus:border-accent focus:bg-white focus:outline-hidden"
          />
        </div>

        <button
          onClick={() => {
            setLowStockOnly(!lowStockOnly);
            setPage(1);
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold tracking-wide transition-all ${
            lowStockOnly
              ? 'border border-amber-300 bg-amber-50 text-amber-900'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className={`h-4 w-4 ${lowStockOnly ? 'text-amber-600' : 'text-slate-400'}`} />
          <span>Low Stock Alerts Only</span>
        </button>
      </div>

      {/* Inventory Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader size="lg" text="Loading inventory records..." />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No inventory records found"
            description="All stock quantities are adequate or no items match your search filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">On Hand Stock</th>
                  <th className="px-6 py-4">Threshold</th>
                  <th className="px-6 py-4">Supply Health</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.primary_image_url}
                          alt={item.name}
                          className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://placehold.co/100x100?text=No+Img';
                          }}
                        />
                        <span className="font-semibold text-slate-900 max-w-[200px] truncate block">
                          {item.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{item.sku}</td>

                    <td className="px-6 py-4 text-xs text-slate-600">
                      {item.category_name || 'Uncategorized'}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`font-mono text-base font-bold ${item.current_stock <= item.low_stock_threshold ? 'text-red-600' : 'text-slate-900'}`}>
                        {item.current_stock}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {item.low_stock_threshold} units
                    </td>

                    <td className="px-6 py-4">
                      {item.current_stock === 0 ? (
                        <Badge variant="danger">Out of Stock</Badge>
                      ) : item.is_low_stock ? (
                        <Badge variant="warning">Low Stock</Badge>
                      ) : (
                        <Badge variant="success">Optimal</Badge>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(item)}
                      >
                        <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Adjust Stock
                      </Button>
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

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title={editingItem ? `Adjust Stock: ${editingItem.name}` : 'Stock Adjustment'}
      >
        {editingItem && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <img
                  src={editingItem.primary_image_url}
                  alt={editingItem.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
                <div>
                  <div className="font-semibold text-slate-900">{editingItem.name}</div>
                  <div className="font-mono text-xs text-slate-500">SKU: {editingItem.sku}</div>
                </div>
              </div>
            </div>

            <Input
              label="New Stock Quantity On Hand *"
              type="number"
              min="0"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              required
            />

            <Input
              label="Low Stock Warning Threshold *"
              type="number"
              min="1"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              required
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" type="button" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={updateMutation.isPending}>
                Save Stock
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
