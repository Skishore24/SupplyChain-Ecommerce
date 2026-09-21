import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, Eye, Truck, CheckCircle2, Clock, XCircle, ChevronRight, PackageCheck } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import { Loader } from '../../components/common/Loader';
import { EmptyState } from '../../components/common/EmptyState';
import { formatPrice } from '../../utils/currency';

const STATUS_OPTIONS = [
  'ALL',
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

export const Orders = () => {
  const { showToast } = useCart();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal for viewing and updating order
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['admin-orders', page, statusFilter, search],
    queryFn: () =>
      adminApi.getOrders({
        page,
        page_size: 10,
        status_filter: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
      }),
  });

  const orders = ordersData?.data?.items || [];
  const totalPages = ordersData?.data?.total_pages || 1;

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateOrderStatus(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-orders']);
      queryClient.invalidateQueries(['admin-dashboard']);
      showToast('Order status updated successfully', 'success');
      setUpdateModalOpen(false);
      setSelectedOrder(null);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to update order status', 'error');
    },
  });

  const handleOpenUpdate = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setCarrier(order.shipment?.carrier || 'FedEx Express');
    setTrackingNumber(order.shipment?.tracking_number || `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`);
    setUpdateModalOpen(true);
  };

  const handleStatusSubmit = (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    updateStatusMutation.mutate({
      id: selectedOrder.id,
      data: {
        status: newStatus,
        carrier: newStatus === 'SHIPPED' || newStatus === 'DELIVERED' ? carrier : undefined,
        tracking_number: newStatus === 'SHIPPED' || newStatus === 'DELIVERED' ? trackingNumber : undefined,
      },
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge variant="success">Delivered</Badge>;
      case 'SHIPPED':
        return <Badge variant="info">Shipped</Badge>;
      case 'PROCESSING':
      case 'CONFIRMED':
        return <Badge variant="warning">{status}</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900">Orders Management</h1>
          <p className="text-sm text-slate-500">Track fulfillment, assign shipments, and process customer orders.</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        {/* Status Pills */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
          {STATUS_OPTIONS.map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Order # (e.g. ORD-2026-...) or query..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-sm text-slate-900 focus:border-accent focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader size="lg" text="Loading orders..." />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="No orders found"
            description="There are currently no orders matching your selected status or search criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-4">Order #</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Items</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4">Fulfillment Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-700">
                      {order.items?.length || 0} items
                      {order.items?.[0] && (
                        <span className="block max-w-[180px] truncate text-slate-400">
                          {order.items[0].product_name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={order.payment_status === 'COMPLETED' ? 'success' : 'neutral'}>
                        {order.payment_status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenUpdate(order)}
                      >
                        Manage Status
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

      {/* Manage Status & Shipment Modal */}
      <Modal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title={selectedOrder ? `Manage Order ${selectedOrder.order_number}` : 'Order Details'}
      >
        {selectedOrder && (
          <form onSubmit={handleStatusSubmit} className="space-y-6">
            {/* Order Items Breakdown */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h4 className="mb-2 text-xs font-bold tracking-wider text-slate-600 uppercase">
                Order Items ({selectedOrder.items?.length})
              </h4>
              <div className="space-y-2">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">
                      {item.quantity}x {item.product_name}
                    </span>
                    <span className="font-mono text-slate-600">{formatPrice(item.total_price)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-xs font-bold text-slate-900">
                  <span>Total Amount Paid:</span>
                  <span className="font-mono">{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Status Selector */}
            <div>
              <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-700 uppercase">
                Fulfillment Status *
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-accent focus:outline-hidden"
                required
              >
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            {/* Shipment details if Shipped or Delivered */}
            {(newStatus === 'SHIPPED' || newStatus === 'DELIVERED') && (
              <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <Truck className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Logistics & Tracking</span>
                </div>
                <Input
                  label="Shipping Carrier"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="e.g., DHL Express, FedEx, UPS"
                />
                <Input
                  label="Tracking Code"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g., TRK-92841029"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <Button variant="outline" type="button" onClick={() => setUpdateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={updateStatusMutation.isPending}>
                Update Order Status
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
