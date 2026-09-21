import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, Image as ImageIcon, Folder, ExternalLink, Eye } from 'lucide-react';
import { categoryApi } from '../../services/categoryApi';
import { adminApi } from '../../services/adminApi';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Loader } from '../../components/common/Loader';
import { EmptyState } from '../../components/common/EmptyState';

export const Categories = () => {
  const { showToast } = useCart();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    display_order: 0,
    is_active: true,
  });

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['categories-admin'],
    queryFn: () => categoryApi.getCategories(false),
  });
  const categories = categoriesData?.data || [];

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setForm({
      name: '',
      slug: '',
      description: '',
      image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
      display_order: categories.length,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      image_url: cat.image_url || '',
      display_order: cat.display_order ?? 0,
      is_active: cat.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleNameChange = (name) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug ? prev.slug : slug,
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingCategory) {
        return adminApi.updateCategory(editingCategory.id, payload);
      }
      return adminApi.createCategory(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['categories-admin']);
      queryClient.invalidateQueries(['categories']);
      showToast(editingCategory ? 'Category updated' : 'Category created', 'success');
      setIsModalOpen(false);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to save category', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories-admin']);
      queryClient.invalidateQueries(['categories']);
      showToast('Category deleted', 'success');
      setDeleteConfirmId(null);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to delete category', 'error');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.slug) {
      showToast('Name and Slug are required', 'error');
      return;
    }
    saveMutation.mutate(form);
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500">Organize your catalog structure and manage category visual assets.</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories by name or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-sm text-slate-900 focus:border-accent focus:bg-white focus:outline-hidden"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {filteredCategories.length} Categories
        </span>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader size="lg" text="Loading categories..." />
        </div>
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={Folder}
          title="No categories found"
          description="Create your first product category to organize your luxury collection."
          actionLabel="Add Category"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCategories.map((category) => (
            <div
              key={category.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all hover:shadow-md"
            >
              {/* Image Preview Banner */}
              <div className="relative aspect-16/9 w-full overflow-hidden bg-slate-100">
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/400x225?text=No+Image';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <ImageIcon className="h-10 w-10" />
                  </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                  <Badge variant={category.is_active ? 'success' : 'neutral'}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-serif text-lg font-bold text-slate-900 group-hover:text-accent transition-colors">
                    {category.name}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">Order: {category.display_order}</span>
                </div>
                <p className="mt-1 text-xs font-mono text-slate-500">/{category.slug}</p>
                <p className="mt-2 line-clamp-2 text-xs text-slate-600 flex-1">
                  {category.description || 'No description provided.'}
                </p>

                {/* Footer stats and actions */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs font-medium text-slate-500">
                    {category.product_count ?? 0} Products
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(category)}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                      title="Edit Category"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(category.id)}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Delete Category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name *"
            placeholder="e.g., Luxury Audio"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />

          <Input
            label="URL Slug *"
            placeholder="luxury-audio"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            required
          />

          <div>
            <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-700 uppercase">
              Description
            </label>
            <textarea
              placeholder="A brief overview of this category's collections..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <Input
              label="Banner Image URL"
              placeholder="https://images.unsplash.com/..."
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            />
            {form.image_url && (
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <p className="p-2 text-xs font-medium text-slate-500">Live Image Preview:</p>
                <div className="relative aspect-16/9 w-full">
                  <img
                    src={form.image_url}
                    alt="Category Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/400x225?text=Invalid+Image+URL';
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Display Order"
              type="number"
              value={form.display_order}
              onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value, 10) || 0 })}
            />
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="cat_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded-md border-slate-300 text-accent focus:ring-accent"
              />
              <label htmlFor="cat_active" className="text-sm font-medium text-slate-700">
                Active in Store
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Category"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this category? Products assigned to this category may become uncategorized.
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
