import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { User, Package, MapPin, Settings, ShieldCheck, Edit2, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { authApi } from '../services/authApi';
import { orderApi } from '../services/orderApi';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { formatPrice } from '../utils/currency';

export const Profile = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useCart();

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
  });

  // Recent orders
  const { data: ordersData } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => orderApi.getUserOrders({ page: 1, page_size: 3 }),
  });

  // Addresses
  const { data: addressesData, refetch: refetchAddresses } = useQuery({
    queryKey: ['user-addresses'],
    queryFn: () => authApi.getAddresses(),
  });

  const orders = ordersData?.data?.items || [];
  const addresses = addressesData?.data || [];

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await authApi.updateProfile(profileForm);
      if (res.success) {
        showToast('Profile updated successfully', 'success');
        setEditProfileOpen(false);
        await refreshUser();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'danger');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DELIVERED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'SHIPPED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CONFIRMED': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'CANCELLED': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary text-white font-extrabold text-xl flex items-center justify-center shadow-subtle">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink-primary">
              {user?.first_name} {user?.last_name}
            </h1>
            <p className="text-xs text-ink-muted">{user?.email} • Member since {new Date(user?.created_at || Date.now()).getFullYear()}</p>
          </div>
        </div>

        <Button size="sm" variant="outline" onClick={() => setEditProfileOpen(true)}>
          <Edit2 className="w-3.5 h-3.5" />
          Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Recent Orders */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface rounded-card p-6 border border-line shadow-subtle">
            <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                <Package className="w-4 h-4 text-accent" />
                Recent Orders
              </h2>
              <Link to="/profile/orders" className="text-xs font-semibold text-accent hover:underline">
                View All Orders
              </Link>
            </div>

            {orders.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-6">You have not placed any orders yet.</p>
            ) : (
              <div className="divide-y divide-line">
                {orders.map((order) => (
                  <div key={order.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-ink-primary">{order.order_number}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-badge border ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted">
                        Placed on {new Date(order.created_at).toLocaleDateString()} • {order.items?.length || 1} items
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-ink-primary">{formatPrice(order.total)}</span>
                      <Link to={`/profile/orders/${order.id}`}>
                        <Button size="sm" variant="outline">
                          Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Saved Addresses */}
          <div className="bg-surface rounded-card p-6 border border-line shadow-subtle">
            <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink-primary flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent" />
                Shipping Addresses
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div key={addr.id} className="p-4 rounded-card-sm border border-line bg-slate-50/50 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-ink-primary">
                    <span>{addr.full_name}</span>
                    {addr.is_default && <span className="text-[10px] text-accent">Default</span>}
                  </div>
                  <p className="text-ink-secondary">{addr.address_line_1} {addr.address_line_2}</p>
                  <p className="text-ink-secondary">{addr.city}, {addr.state} {addr.postal_code}</p>
                  <p className="text-ink-muted">{addr.phone}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Account Navigation */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-surface rounded-card p-4 border border-line shadow-subtle space-y-1">
            <Link
              to="/profile/orders"
              className="flex items-center justify-between p-3 rounded-btn text-xs font-semibold text-ink-secondary hover:text-ink-primary hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-ink-muted" />
                <span>All Orders</span>
              </div>
              <span className="text-ink-muted">→</span>
            </Link>
            <Link
              to="/wishlist"
              className="flex items-center justify-between p-3 rounded-btn text-xs font-semibold text-ink-secondary hover:text-ink-primary hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-ink-muted" />
                <span>Saved Wishlist Items</span>
              </div>
              <span className="text-ink-muted">→</span>
            </Link>
            <Link
              to="/profile/settings"
              className="flex items-center justify-between p-3 rounded-btn text-xs font-semibold text-ink-secondary hover:text-ink-primary hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-ink-muted" />
                <span>Security & Credentials</span>
              </div>
              <span className="text-ink-muted">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={editProfileOpen} onClose={() => setEditProfileOpen(false)} title="Update Profile Information">
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={profileForm.first_name}
              onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={profileForm.last_name}
              onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
              required
            />
          </div>
          <Input
            label="Phone Number"
            value={profileForm.phone}
            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-line">
            <Button variant="ghost" size="sm" onClick={() => setEditProfileOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
