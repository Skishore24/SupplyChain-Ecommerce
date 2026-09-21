import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, ArrowLeft, ExternalLink, Clock } from 'lucide-react';
import { orderApi } from '../services/orderApi';
import { Button } from '../components/common/Button';
import { Pagination } from '../components/common/Pagination';
import { TableSkeleton } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';
import { formatPrice } from '../utils/currency';

export const Orders = () => {
  const [page, setPage] = useState(1);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['user-orders', page],
    queryFn: () => orderApi.getUserOrders({ page, page_size: 10 }),
  });

  const orders = ordersData?.data?.items || [];
  const totalPages = ordersData?.data?.total_pages || 1;

  const getStatusBadge = (status) => {
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
      <div className="flex items-center justify-between pb-4 border-b border-line mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-primary tracking-tight">
            Order History
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Track, review, or request assistance on previous purchases.
          </p>
        </div>
        <Link to="/products">
          <Button variant="outline" size="sm">Browse More</Button>
        </Link>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders found"
          description="You have not placed any orders with SHOPERA yet."
          actionText="Start Shopping"
          onAction={() => window.location.href = '/products'}
        />
      ) : (
        <div className="space-y-4">
          <div className="bg-surface rounded-card border border-line divide-y divide-line overflow-hidden shadow-subtle">
            {orders.map((order) => (
              <div key={order.id} className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-ink-primary">
                      {order.order_number}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-badge border ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    Purchased on {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </p>
                  {order.shipment?.tracking_number && (
                    <p className="text-xs text-accent font-mono">
                      Tracking: {order.shipment.tracking_number} ({order.shipment.carrier})
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-xs text-ink-muted block">Total Paid</span>
                    <span className="text-base font-black text-ink-primary">
                      {formatPrice(order.total)}
                    </span>
                  </div>

                  <Link to={`/profile/orders/${order.id}`}>
                    <Button size="sm" variant="primary">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}
    </div>
  );
};
