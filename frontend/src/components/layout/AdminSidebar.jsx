import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Users,
  Boxes,
  TicketPercent,
  Star,
  BarChart3,
  Settings,
  ArrowUpRight,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminSidebar = ({ mobileOpen, setMobileOpen }) => {
  const { logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Orders', to: '/admin/orders', icon: ShoppingBag },
    { label: 'Products', to: '/admin/products', icon: Package },
    { label: 'Categories', to: '/admin/categories', icon: Layers },
    { label: 'Customers', to: '/admin/customers', icon: Users },
    { label: 'Inventory', to: '/admin/inventory', icon: Boxes },
    { label: 'Coupons', to: '/admin/coupons', icon: TicketPercent },
    { label: 'Reviews', to: '/admin/reviews', icon: Star },
    { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
    { label: 'Settings', to: '/admin/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-line flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo */}
          <div className="h-16 px-6 border-b border-line flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-subtle">
                S
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-ink-primary">SHOPERA</span>
                <span className="text-[10px] font-semibold text-accent uppercase tracking-wider -mt-1">Admin OS</span>
              </div>
            </Link>

            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-btn text-ink-muted hover:text-ink-primary hover:bg-slate-100 transition-colors"
              title="Open storefront"
            >
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-btn text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-50 text-accent font-bold'
                        : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Bottom Profile / Logout */}
        <div className="p-4 border-t border-line">
          <div className="p-3 bg-slate-50 rounded-card border border-line flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                AW
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-ink-primary truncate">Alexander W.</p>
                <p className="text-[10px] text-ink-muted truncate">Admin Principal</p>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-danger hover:bg-red-50 rounded-btn transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
