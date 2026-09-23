import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Image as ImageIcon, Eye, Save, AlertCircle } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { productApi } from '../../services/productApi';
import { categoryApi } from '../../services/categoryApi';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Loader } from '../../components/common/Loader';

export const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useCart();
  const [submitting, setSubmitting] = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getCategories(false),
  });
  const categories = categoriesData?.data || [];

  const { data: productData, isLoading: loadingProduct, error: productError } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => productApi.getProductById(id),
    enabled: !!id,
  });

  const [form, setForm] = useState({
    name: '',
    slug: '',
    sku: '',
    category_id: '',
    brand: '',
    short_description: '',
    description: '',
    price: '',
    original_price: '',
    discount_percentage: 0,
    stock_quantity: 0,
    low_stock_threshold: 5,
    is_active: true,
  });

  const [images, setImages] = useState([]);
  const [variants, setVariants] = useState([]);

  useEffect(() => {
    if (productData?.data) {
      const p = productData.data;
      setForm({
        name: p.name || '',
        slug: p.slug || '',
        sku: p.sku || '',
        category_id: p.category_id ? String(p.category_id) : (p.category?.id ? String(p.category.id) : ''),
        brand: p.brand || 'Shopera Studio',
        short_description: p.short_description || '',
        description: p.description || '',
        price: p.price !== undefined ? String(p.price) : '',
        original_price: p.original_price ? String(p.original_price) : '',
        discount_percentage: p.discount_percentage || 0,
        stock_quantity: p.stock_quantity ?? 0,
        low_stock_threshold: p.low_stock_threshold ?? 5,
        is_active: p.is_active ?? true,
      });

      if (p.images && p.images.length > 0) {
        setImages(
          p.images.map((img, i) => ({
            id: img.id,
            image_url: img.image_url,
            alt_text: img.alt_text || '',
            sort_order: img.sort_order ?? i,
            is_primary: img.is_primary ?? (i === 0),
          }))
        );
      } else {
        setImages([
          {
            image_url: p.primary_image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
            alt_text: p.name,
            sort_order: 0,
            is_primary: true,
          },
        ]);
      }

      if (p.variants && p.variants.length > 0) {
        setVariants(
          p.variants.map((v) => ({
            id: v.id,
            variant_type: v.variant_type || 'Color',
            variant_name: v.variant_name || '',
            price_modifier: v.price_modifier || 0,
            stock_quantity: v.stock_quantity || 0,
          }))
        );
      }
    }
  }, [productData]);

  const handleAddImage = () => {
    setImages([
      ...images,
      {
        image_url: '',
        alt_text: '',
        sort_order: images.length,
        is_primary: false,
      },
    ]);
  };

  const handleRemoveImage = (index) => {
    if (images.length === 1) {
      showToast('At least one image URL is required', 'warning');
      return;
    }
    const filtered = images.filter((_, i) => i !== index);
    if (!filtered.some((img) => img.is_primary)) {
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
      { variant_type: 'Color', variant_name: '', price_modifier: 0, stock_quantity: 10 },
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.category_id) {
      showToast('Please fill all required fields (Name, Category, Price)', 'danger');
      return;
    }

    const validImages = images.filter((img) => img.image_url && img.image_url.trim() !== '');
    if (validImages.length === 0) {
      showToast('Please provide at least one valid Image URL', 'danger');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        sku: form.sku,
        category_id: parseInt(form.category_id, 10),
        brand: form.brand,
        short_description: form.short_description,
        description: form.description,
        price: parseFloat(form.price),
        original_price: form.original_price ? parseFloat(form.original_price) : null,
        discount_percentage: form.discount_percentage ? parseInt(form.discount_percentage, 10) : 0,
        stock_quantity: parseInt(form.stock_quantity, 10),
        low_stock_threshold: parseInt(form.low_stock_threshold, 10),
        is_active: form.is_active,
        images: validImages.map((img, idx) => ({
          image_url: img.image_url.trim(),
          alt_text: img.alt_text || form.name,
          sort_order: idx,
          is_primary: !!img.is_primary,
        })),
        variants: variants
          .filter((v) => v.variant_name && v.variant_name.trim() !== '')
          .map((v) => ({
            variant_type: v.variant_type,
            variant_name: v.variant_name.trim(),
            price_modifier: parseFloat(v.price_modifier || 0),
            stock_quantity: parseInt(v.stock_quantity || 0, 10),
          })),
      };

      await adminApi.updateProduct(id, payload);
      showToast('Product updated successfully', 'success');
      navigate('/admin/products');
    } catch (err) {
      showToast(err.message || 'Failed to update product', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader size="lg" text="Loading product data..." />
      </div>
    );
  }

  if (productError || !productData?.data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 font-serif text-xl font-bold text-slate-900">Product Not Found</h3>
        <p className="mt-2 text-sm text-slate-600">The product you are trying to edit does not exist or has been removed.</p>
        <Button className="mt-6" onClick={() => navigate('/admin/products')}>
          Return to Products
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/products"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900">Edit Product #{id}</h1>
            <p className="text-sm text-slate-500">Update specifications, images, pricing, and stock.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/admin/products')}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            <Save className="mr-2 h-4 w-4" /> Save Changes
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <h2 className="mb-6 font-serif text-lg font-bold text-slate-900">Basic Information</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Product Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <Input
              label="URL Slug *"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
            />

            <Input
              label="SKU (Stock Keeping Unit) *"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              required
            />

            <div>
              <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-700 uppercase">
                Category *
              </label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent"
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Brand"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            />

            <div className="md:col-span-2">
              <Input
                label="Short Description"
                value={form.short_description}
                onChange={(e) => setForm({ ...form, short_description: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-700 uppercase">
                Detailed Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={5}
                className="w-full rounded-xl border border-slate-200 p-4 text-sm text-slate-900 focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        {/* Pricing & Inventory */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <h2 className="mb-6 font-serif text-lg font-bold text-slate-900">Pricing & Inventory</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
            <Input
              label="Selling Price (₹) *"
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />

            <Input
              label="Original Price (₹)"
              type="number"
              step="0.01"
              value={form.original_price}
              onChange={(e) => setForm({ ...form, original_price: e.target.value })}
            />

            <Input
              label="Stock Quantity *"
              type="number"
              value={form.stock_quantity}
              onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
              required
            />

            <Input
              label="Low Stock Alert Threshold"
              type="number"
              value={form.low_stock_threshold}
              onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
            />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded-md border-slate-300 text-accent focus:ring-accent"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              Product is Active & visible in storefront
            </label>
          </div>
        </div>

        {/* Product Images (Multi-URL Management) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-bold text-slate-900">Product Images (Dynamic URLs)</h2>
              <p className="text-xs text-slate-500">Provide direct image URLs with preview support.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddImage}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Image URL
            </Button>
          </div>

          <div className="space-y-4">
            {images.map((img, index) => (
              <div
                key={index}
                className="flex flex-col gap-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all md:flex-row md:items-center"
              >
                {/* Preview Thumbnail */}
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {img.image_url ? (
                    <img
                      src={img.image_url}
                      alt={img.alt_text || 'Preview'}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/100x100?text=Invalid';
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                  {img.is_primary && (
                    <span className="absolute bottom-0 inset-x-0 bg-accent py-0.5 text-center text-[9px] font-bold text-white uppercase">
                      Primary
                    </span>
                  )}
                </div>

                {/* Input Fields */}
                <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
                  <Input
                    placeholder="https://images.unsplash.com/..."
                    value={img.image_url}
                    onChange={(e) => {
                      const updated = [...images];
                      updated[index].image_url = e.target.value;
                      setImages(updated);
                    }}
                  />
                  <Input
                    placeholder="Alt text (e.g., Angled View)"
                    value={img.alt_text}
                    onChange={(e) => {
                      const updated = [...images];
                      updated[index].alt_text = e.target.value;
                      setImages(updated);
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!img.is_primary && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetPrimary(index)}
                      className="text-xs text-accent hover:text-blue-700"
                    >
                      Make Primary
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Variants */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-bold text-slate-900">Product Variants</h2>
              <p className="text-xs text-slate-500">Add options such as Color, Size, Finish, or Material.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddVariant}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Variant
            </Button>
          </div>

          {variants.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">No variants configured. Product sells as single standard item.</p>
          ) : (
            <div className="space-y-3">
              {variants.map((v, index) => (
                <div key={index} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <select
                    value={v.variant_type}
                    onChange={(e) => {
                      const updated = [...variants];
                      updated[index].variant_type = e.target.value;
                      setVariants(updated);
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="Color">Color</option>
                    <option value="Size">Size</option>
                    <option value="Material">Material</option>
                    <option value="Edition">Edition</option>
                  </select>

                  <input
                    placeholder="Value (e.g. Matte Black)"
                    value={v.variant_name}
                    onChange={(e) => {
                      const updated = [...variants];
                      updated[index].variant_name = e.target.value;
                      setVariants(updated);
                    }}
                    className="flex-1 min-w-[140px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">+₹:</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={v.price_modifier}
                      onChange={(e) => {
                        const updated = [...variants];
                        updated[index].price_modifier = e.target.value;
                        setVariants(updated);
                      }}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Stock:</span>
                    <input
                      type="number"
                      placeholder="10"
                      value={v.stock_quantity}
                      onChange={(e) => {
                        const updated = [...variants];
                        updated[index].stock_quantity = e.target.value;
                        setVariants(updated);
                      }}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-sm"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setVariants(variants.filter((_, i) => i !== index))}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => navigate('/admin/products')}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            <Save className="mr-2 h-4 w-4" /> Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};
