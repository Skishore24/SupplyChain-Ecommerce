import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, CheckCircle2, XCircle, ExternalLink, Package } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { categoryApi } from '../../services/categoryApi';
import { Button } from '../../components/common/Button';
import { TableSkeleton } from '../../components/common/Loader';
import { Pagination } from '../../components/common/Pagination';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../utils/currency';

export const AdminProducts = () => {
  const { showToast } = useCart();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => categoryApi.getCategories(false),
  });

  const { data: productsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-products', page, search, categoryId],
    queryFn: () => adminApi.getProducts({ page, page_size: 10, search, category_id: categoryId || undefined }),
  });

  const products = productsData?.data?.items || [];
  const totalPages = productsData?.data?.total_pages || 1;
  const categories = categoriesData?.data || [];

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}"?`)) return;
    try {
      const res = await adminApi.deleteProduct(id);
      if (res.success) {
        showToast("Product deleted successfully", "success");
        await refetch();
      }
    } catch (err) {
      showToast(err.message || "Failed to delete product", "danger");
    }
  };

  const handleToggleStatus = async (product) => {
    try {
      const res = await adminApi.updateProduct(product.id, { is_active: !product.is_active });
      if (res.success) {
        showToast(`Product ${!product.is_active ? 'activated' : 'deactivated'}`, "success");
        await refetch();
      }
    } catch (err) {
      showToast(err.message || "Failed to update product status", "danger");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary tracking-tight">Product Catalog Management</h1>
          <p className="text-xs text-ink-muted mt-0.5">Maintain items, SKU inventory, and multi-image URLs.</p>
        </div>

        <Link to="/admin/products/new">
          <Button variant="primary" size="md" className="shadow-subtle">
            <Plus className="w-4 h-4" />
            Add New Product
          </Button>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-surface rounded-card p-4 border border-line shadow-subtle flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 border border-line rounded-input pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
            className="bg-surface border border-line rounded-btn px-3 py-2 text-xs font-medium text-ink-primary focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Data Table */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : products.length === 0 ? (
        <div className="p-12 text-center bg-surface rounded-card border border-line text-xs text-ink-muted">
          No products found matching query.
        </div>
      ) : (
        <div className="bg-surface rounded-card border border-line overflow-hidden shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-line text-ink-muted uppercase font-semibold">
                <tr>
                  <th className="p-4">Item</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((p) => {
                  const isLow = p.stock_quantity <= p.low_stock_threshold;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="w-10 h-10 rounded-card-sm overflow-hidden bg-slate-100 border border-line shrink-0">
                            <img src={p.primary_image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <span className="font-bold text-ink-primary block max-w-xs truncate">{p.name}</span>
                            <span className="text-[10px] text-ink-muted">{p.brand || 'Shopera'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-ink-secondary">{p.sku}</td>
                      <td className="p-4 text-ink-secondary">{p.category?.name || 'Unassigned'}</td>
                      <td className="p-4 font-bold text-ink-primary">{formatPrice(p.price)}</td>
                      <td className="p-4">
                        <span className={`font-semibold ${isLow ? 'text-amber-600' : 'text-ink-primary'}`}>
                          {p.stock_quantity}
                        </span>
                        {isLow && <span className="block text-[9px] text-amber-500 font-bold">LOW STOCK</span>}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-[10px] font-bold ${
                            p.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {p.is_active ? 'Active' : 'Draft'}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/products/${p.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-btn text-ink-muted hover:text-ink-primary hover:bg-slate-100"
                            title="View product"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            to={`/admin/products/${p.id}/edit`}
                            className="p-1.5 rounded-btn text-ink-muted hover:text-accent hover:bg-blue-50"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 rounded-btn text-ink-muted hover:text-danger hover:bg-red-50"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-line">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
          </div>
        </div>
      )}
    </div>
  );
};

export const Products = AdminProducts;
export default AdminProducts;
