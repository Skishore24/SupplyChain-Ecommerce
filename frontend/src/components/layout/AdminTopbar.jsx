import React from 'react';
import { Menu, Bell, Search, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const AdminTopbar = ({ setMobileOpen }) => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-surface border-b border-line px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-btn text-ink-secondary hover:text-ink-primary hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Quick Search Bar */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-input bg-slate-50 border border-line w-72">
          <Search className="w-4 h-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Search orders, SKU, customers..."
            className="bg-transparent border-none text-xs text-ink-primary focus:outline-none w-full placeholder:text-ink-muted"
          />
          <kbd className="text-[10px] text-ink-muted bg-surface px-1.5 py-0.5 rounded border border-line">⌘K</kbd>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary hover:bg-slate-100 rounded-btn transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Live Storefront
        </Link>

        {/* Notifications mock trigger */}
        <button
          className="relative p-2 rounded-btn text-ink-secondary hover:text-ink-primary hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent"></span>
        </button>

        <div className="h-4 w-px bg-line"></div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
            {user?.first_name?.[0] || 'A'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-ink-primary leading-tight">{user?.first_name || 'Admin'}</p>
            <p className="text-[10px] text-emerald-600 font-semibold leading-tight">Active session</p>
          </div>
        </div>
      </div>
    </header>
  );
};
