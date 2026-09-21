import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Image as ImageIcon, Eye } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { categoryApi } from '../../services/categoryApi';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export const CreateProduct = () => {
  const navigate = useNavigate();
  const { showToast } = useCart();
  const [submitting, setSubmitting] = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getCategories(false),
  });
  const categories = categoriesData?.data || [];

  const [form, setForm] = useState({
    name: '',
    slug: '',
    sku: '',
    category_id: '',
    brand: 'Shopera Studio',
    short_description: '',
    description: '',
    price: '',
    original_price: '',
    discount_percentage: 0,
    stock_quantity: 20,
    low_stock_threshold: 5,
    is_active: true,
  });

  // Dynamic Image URLs List
  const [images, setImages] = useState([
    {
      image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
      alt_text: 'Primary showcase view',
      sort_order: 0,
      is_primary: true
    }
  ]);

  // Dynamic Variants
  const [variants, setVariants] = useState([]);

  // Auto-generate slug and SKU from name
  const handleNameChange = (name) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const sku = `SHP-${name.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    setForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug || slug,
      sku: prev.sku || sku
    }));
  };

  const handleAddImage = () => {
    setImages([
      ...images,
      {
        image_url: '',
        alt_text: '',
        sort_order: images.length,
        is_primary: false
      }
    ]);
  };

  const handleRemoveImage = (index) => {
    if (images.length === 1) {
      showToast("At least one image URL is required", "warning");
      return;
    }
    const filtered = images.filter((_, i) => i !== index);
    // ensure at least one is primary
    if (!filtered.some(img => img.is_primary)) {
      filtered[0].is_primary = true;
    }
    setImages(filtered);
  };

  const handleSetPrimary = (index) => {
    setImages(images.map((img, i) => ({ ...img, is_primary: i === index })));
  };

  const handleAddVariant = () => {
    setVariants([
      ...variants,
      { variant_type: 'Color', variant_name: '', price_modifier: 0, stock_quantity: 10 }
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (images.length === 0 || !images[0].image_url) {
      showToast("Please provide at least one valid image URL", "danger");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...form,
        category_id: form.category_id ? Number(form.category_id) : null,
        price: Number(form.price),
        original_price: form.original_price ? Number(form.original_price) : undefined,
        discount_percentage: Number(form.discount_percentage || 0),
        stock_quantity: Number(form.stock_quantity),
        low_stock_threshold: Number(form.low_stock_threshold),
        images: images.filter(img => img.image_url.trim() !== ''),
        variants: variants.filter(v => v.variant_name.trim() !== '').map(v => ({
          ...v,
          price_modifier: Number(v.price_modifier || 0),
          stock_quantity: Number(v.stock_quantity || 0)
        }))
      };

      const res = await adminApi.createProduct(payload);
      if (res.success) {
        showToast("Product created successfully with image URLs!", "success");
        navigate('/admin/products');
      }
    } catch (err) {
      showToast(err.message || "Failed to create product", "danger");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <Link to="/admin/products" className="p-2 rounded-btn hover:bg-slate-100 text-ink-muted">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-ink-primary">Add New Product</h1>
            <p className="text-xs text-ink-muted mt-0.5">Specify core parameters, pricing, and dynamic external image URLs.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-primary pb-2 border-b border-line">
            General Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              placeholder="e.g. Aether Wireless Headphones"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
            <Input
              label="URL Slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="SKU Identifier"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              required
            />
            <Input
              label="Brand Name"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            />
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wider">
                Category
              </label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full bg-surface border border-line rounded-input py-2.5 px-3.5 text-xs text-ink-primary focus:outline-none focus:ring-1 focus:ring-accent"
                required
              >
                <option value="">Select a Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Short Summary"
            placeholder="One-line summary shown on cards"
            value={form.short_description}
            onChange={(e) => setForm({ ...form, short_description: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wider">
              Detailed Description & Specifications
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Comprehensive architectural and material notes..."
              className="w-full bg-slate-50 border border-line rounded-input p-3 text-xs focus:outline-none focus:ring-1 focus:ring-accent focus:bg-white"
            />
          </div>
        </div>

        {/* Pricing & Stock */}
        <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-primary pb-2 border-b border-line">
            Pricing & Inventory
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Retail Price (₹)"
              type="number"
              step="0.01"
              placeholder="199.00"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
            <Input
              label="Original Price (₹)"
              type="number"
              step="0.01"
              placeholder="249.00"
              value={form.original_price}
              onChange={(e) => setForm({ ...form, original_price: e.target.value })}
            />
            <Input
              label="Discount (%)"
              type="number"
              value={form.discount_percentage}
              onChange={(e) => setForm({ ...form, discount_percentage: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Initial Stock Quantity"
              type="number"
              value={form.stock_quantity}
              onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
              required
            />
            <Input
              label="Low Stock Warning Threshold"
              type="number"
              value={form.low_stock_threshold}
              onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
              required
            />
          </div>
        </div>

        {/* PRODUCT IMAGE URL MANAGEMENT */}
        <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-primary">
                Product Image URL Management
              </h2>
              <p className="text-[11px] text-ink-muted">
                Admin enters external URLs (e.g. Unsplash, CDN). Live preview updates immediately.
              </p>
            </div>
            <Button size="sm" variant="outline" type="button" onClick={handleAddImage}>
              <Plus className="w-3.5 h-3.5" />
              Add Image URL
            </Button>
          </div>

          <div className="space-y-4">
            {images.map((img, idx) => (
              <div key={idx} className="p-4 bg-slate-50/70 rounded-card-sm border border-line flex flex-col sm:flex-row gap-4 items-start">
                {/* Live Image Preview Thumbnail */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-card-sm overflow-hidden bg-white border border-line shrink-0 flex items-center justify-center relative">
                  {img.image_url ? (
                    <img
                      src={img.image_url}
                      alt="Preview"
                      onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80"; }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-ink-muted" />
                  )}
                  {img.is_primary && (
                    <span className="absolute bottom-1 right-1 bg-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-subtle">
                      PRIMARY
                    </span>
                  )}
                </div>

                {/* URL inputs */}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={img.image_url}
                      onChange={(e) => {
                        const updated = [...images];
                        updated[idx].image_url = e.target.value;
                        setImages(updated);
                      }}
                      className="flex-1 bg-white border border-line rounded-input px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(idx)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-btn border transition-colors ${
                        img.is_primary ? 'bg-blue-50 text-accent border-blue-200' : 'bg-white border-line text-ink-muted hover:text-ink-primary'
                      }`}
                    >
                      {img.is_primary ? '★ Primary' : 'Set Primary'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="p-1.5 text-ink-muted hover:text-danger rounded-btn hover:bg-white border border-transparent hover:border-line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Alt text description (e.g. Side profile in matte black)"
                    value={img.alt_text}
                    onChange={(e) => {
                      const updated = [...images];
                      updated[idx].alt_text = e.target.value;
                      setImages(updated);
                    }}
                    className="w-full bg-white border border-line rounded-input px-3 py-1 text-xs text-ink-secondary focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex justify-end gap-3 pt-4 border-t border-line">
          <Link to="/admin/products">
            <Button variant="ghost" size="md">Cancel</Button>
          </Link>
          <Button type="submit" variant="primary" size="lg" loading={submitting}>
            Publish Product
          </Button>
        </div>
      </form>
    </div>
  );
};
