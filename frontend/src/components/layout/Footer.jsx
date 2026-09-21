import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, Award } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-surface border-t border-line mt-20">
      {/* Trust Badges Bar */}
      <div className="border-b border-line py-8 bg-slate-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-accent flex items-center justify-center shrink-0 border border-blue-100">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-ink-primary uppercase tracking-wide">Complimentary Shipping</p>
              <p className="text-xs text-ink-muted">On all domestic orders over ₹1,000</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-ink-primary uppercase tracking-wide">Secure Transaction</p>
              <p className="text-xs text-ink-muted">End-to-end verified authentication</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-ink-primary uppercase tracking-wide">30-Day Returns</p>
              <p className="text-xs text-ink-muted">Hassle-free direct return labels</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-ink-primary uppercase tracking-wide">2-Year Warranty</p>
              <p className="text-xs text-ink-muted">Comprehensive product coverage</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white">
              <span className="font-extrabold text-sm">S</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-ink-primary">SHOPERA</span>
          </div>
          <p className="text-xs text-ink-secondary leading-relaxed max-w-sm mb-6">
            A curated platform engineering everyday objects with enduring material integrity, precision mechanics, and pure Scandinavian aesthetics.
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-ink-secondary font-medium">FastAPI & MySQL Production Engine Active</span>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-primary mb-4">Catalog</h4>
          <ul className="space-y-2.5 text-xs text-ink-secondary">
            <li><Link to="/products?category=audio-and-sound" className="hover:text-ink-primary transition-colors">Audio & Sound</Link></li>
            <li><Link to="/products?category=wearables-and-watches" className="hover:text-ink-primary transition-colors">Wearables & Watches</Link></li>
            <li><Link to="/products?category=computers-and-tech" className="hover:text-ink-primary transition-colors">Mechanical Keyboards</Link></li>
            <li><Link to="/products?category=bags-and-backpacks" className="hover:text-ink-primary transition-colors">Technical Packs</Link></li>
            <li><Link to="/products?category=home-and-lighting" className="hover:text-ink-primary transition-colors">Studio Lighting</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-primary mb-4">Customer Care</h4>
          <ul className="space-y-2.5 text-xs text-ink-secondary">
            <li><Link to="/profile/orders" className="hover:text-ink-primary transition-colors">Track Orders</Link></li>
            <li><Link to="/profile/addresses" className="hover:text-ink-primary transition-colors">Shipping Addresses</Link></li>
            <li><Link to="/cart" className="hover:text-ink-primary transition-colors">Shopping Bag</Link></li>
            <li><Link to="/wishlist" className="hover:text-ink-primary transition-colors">Saved Items</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-primary mb-4">Administration</h4>
          <ul className="space-y-2.5 text-xs text-ink-secondary">
            <li><Link to="/admin" className="hover:text-accent font-semibold transition-colors">Admin Dashboard</Link></li>
            <li><Link to="/admin/products" className="hover:text-accent transition-colors">Product Manager</Link></li>
            <li><Link to="/admin/orders" className="hover:text-accent transition-colors">Order Fulfillment</Link></li>
            <li><Link to="/admin/inventory" className="hover:text-accent transition-colors">Stock Control</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line py-6 text-center text-xs text-ink-muted">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 SHOPERA Inc. All rights reserved. Designed for everyday excellence.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-ink-secondary cursor-pointer">Privacy Policy</span>
            <span className="hover:text-ink-secondary cursor-pointer">Terms of Service</span>
            <span className="hover:text-ink-secondary cursor-pointer">API Status</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
