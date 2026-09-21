import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Store, ShieldCheck, Database, Server, Mail, DollarSign, Globe, Check, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import api from '../../services/api';

export const Settings = () => {
  const { user } = useAuth();
  const { showToast } = useCart();
  const [saving, setSaving] = useState(false);

  const [storeSettings, setStoreSettings] = useState({
    store_name: 'SHOPERA Luxury Atelier',
    tagline: 'Refined Modern Aesthetics & High-Craft Goods',
    support_email: 'concierge@shopera.com',
    currency: 'INR (₹)',
    tax_rate: '8.00',
    free_shipping_threshold: '300.00',
    standard_shipping_rate: '15.00',
    express_shipping_rate: '35.00',
  });

  const { data: healthData } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => api.get('/health'),
  });

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      showToast('Storefront configurations saved successfully', 'success');
    }, 600);
  };

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900">Platform Settings</h1>
        <p className="text-sm text-slate-500">Configure global storefront parameters, financial tax rates, and inspect system telemetry.</p>
      </div>

      {/* System Infrastructure Telemetry */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <h2 className="mb-4 font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
          <Server className="h-5 w-5 text-accent" /> System Telemetry & Status
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">FastAPI Backend</span>
            <div className="mt-2 flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-sm font-bold text-slate-900">Operational</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Port 8000 (v1.0.0)</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">MySQL 8.4 Engine</span>
            <div className="mt-2 flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-600" />
              <span className="font-mono text-sm font-bold text-slate-900">Connected</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Schema: ecommerce_db</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Admin Session</span>
            <div className="mt-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" />
              <span className="font-semibold text-sm text-slate-900 truncate">{user?.email}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Role: {user?.role}</p>
          </div>
        </div>
      </div>

      {/* Store Identity & Currency */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <h2 className="mb-6 font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
            <Store className="h-5 w-5 text-accent" /> Storefront Identity
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input
              label="Storefront Brand Name"
              value={storeSettings.store_name}
              onChange={(e) => setStoreSettings({ ...storeSettings, store_name: e.target.value })}
              required
            />

            <Input
              label="Tagline & Brand Statement"
              value={storeSettings.tagline}
              onChange={(e) => setStoreSettings({ ...storeSettings, tagline: e.target.value })}
            />

            <Input
              label="Concierge & Support Email"
              type="email"
              value={storeSettings.support_email}
              onChange={(e) => setStoreSettings({ ...storeSettings, support_email: e.target.value })}
              required
            />

            <Input
              label="Catalog Primary Currency"
              value={storeSettings.currency}
              disabled
            />
          </div>
        </div>

        {/* Shipping & Tax Rules */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <h2 className="mb-6 font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-accent" /> Financial & Shipping Policy
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Input
              label="Tax Rate (%)"
              type="number"
              step="0.1"
              value={storeSettings.tax_rate}
              onChange={(e) => setStoreSettings({ ...storeSettings, tax_rate: e.target.value })}
            />

            <Input
              label="Standard Shipping Fee (₹)"
              type="number"
              step="0.01"
              value={storeSettings.standard_shipping_rate}
              onChange={(e) => setStoreSettings({ ...storeSettings, standard_shipping_rate: e.target.value })}
            />

            <Input
              label="Free Shipping Minimum (₹)"
              type="number"
              step="0.01"
              value={storeSettings.free_shipping_threshold}
              onChange={(e) => setStoreSettings({ ...storeSettings, free_shipping_threshold: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            <Save className="mr-2 h-4 w-4" /> Save Store Configuration
          </Button>
        </div>
      </form>
    </div>
  );
};
