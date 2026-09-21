import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Users, ShieldAlert, ShieldCheck, Mail, Phone, Calendar, ShoppingBag } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Pagination } from '../../components/common/Pagination';
import { Loader } from '../../components/common/Loader';
import { EmptyState } from '../../components/common/EmptyState';
import { formatPrice } from '../../utils/currency';

export const Customers = () => {
  const { showToast } = useCart();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['admin-customers', page, search],
    queryFn: () =>
      adminApi.getCustomers({
        page,
        page_size: 15,
        search: search.trim() || undefined,
      }),
  });

  const customers = customersData?.data?.items || [];
  const totalPages = customersData?.data?.total_pages || 1;

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }) =>
      adminApi.updateCustomerStatus(id, { is_active: isActive }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-customers']);
      showToast(res.message || 'Customer status updated', 'success');
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to update customer status', 'error');
    },
  });

  const handleToggleStatus = (customer) => {
    toggleStatusMutation.mutate({
      id: customer.id,
      isActive: !customer.is_active,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">Manage customer accounts, purchase history, and access status.</p>
        </div>
      </div>

      {/* Filter / Search */}
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers by name, email, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-sm text-slate-900 focus:border-accent focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader size="lg" text="Loading customer accounts..." />
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description="No customer records match your current search query."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Orders Placed</th>
                  <th className="px-6 py-4">Total Spent</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4">Account Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                          {c.first_name?.[0] || 'C'}{c.last_name?.[0] || ''}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {c.first_name} {c.last_name}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">ID: #{c.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span>{c.email}</span>
                      </div>
                      {c.phone && (
                        <div className="mt-1 flex items-center gap-1.5 text-slate-500">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                        <ShoppingBag className="h-3.5 w-3.5 text-slate-400" />
                        {c.orders_count}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {formatPrice(c.total_spent || 0)}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant={c.is_active ? 'success' : 'danger'}>
                        {c.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant={c.is_active ? 'outline' : 'primary'}
                        onClick={() => handleToggleStatus(c)}
                        disabled={toggleStatusMutation.isPending}
                      >
                        {c.is_active ? 'Disable Access' : 'Enable Access'}
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
    </div>
  );
};
