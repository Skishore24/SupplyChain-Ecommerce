import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Package, Truck, ShieldCheck, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { orderApi } from '../services/orderApi';
import { useCart } from '../context/CartContext';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/Loader';
import { formatPrice } from '../utils/currency';

export const OrderDetails = () => {
  const { id } = useParams();
  const { showToast } = useCart();
  const [cancelling, setCancelling] = useState(false);

  const { data: orderData, isLoading, refetch } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: () => orderApi.getOrderDetails(id),
  });

  const order = orderData?.data;

  const handleCancelOrder = async () => {
    if (!window.confirm("Are you sure you want to cancel this order? Stock will be returned to inventory.")) return;
    try {
      setCancelling(true);
      const res = await orderApi.cancelOrder(id);
      if (res.success) {
        showToast("Order has been cancelled", "success");
        await refetch();
      }
    } catch (err) {
      showToast(err.message || "Failed to cancel order", "danger");
    } finally {
      setCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto py-20 text-center px-4">
        <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
        <Link to="/profile/orders">
          <Button variant="outline">Return to Orders</Button>
        </Link>
      </div>
    );
  }

  const steps = [
    { label: 'Confirmed', done: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) },
    { label: 'Processing', done: ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) },
    { label: 'Shipped', done: ['SHIPPED', 'DELIVERED'].includes(order.status) },
    { label: 'Delivered', done: order.status === 'DELIVERED' },
  ];

  const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center justify-between pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <Link to="/profile/orders" className="p-2 rounded-btn hover:bg-slate-100 text-ink-muted">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-ink-primary">{order.order_number}</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-badge bg-blue-50 text-accent border border-blue-200">
                {order.status}
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Placed on {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
            </p>
          </div>
        </div>

        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            loading={cancelling}
            onClick={handleCancelOrder}
            className="text-danger hover:bg-red-50 hover:border-danger/30"
          >
            Cancel Order
          </Button>
        )}
      </div>

      {/* Tracking Timeline Status */}
      {order.status !== 'CANCELLED' ? (
        <div className="bg-surface rounded-card p-6 border border-line shadow-subtle">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-6">Delivery Progression</h2>
          <div className="grid grid-cols-4 gap-2 relative">
            {steps.map((s, idx) => (
              <div key={idx} className="flex flex-col items-center text-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  s.done ? 'bg-accent text-white shadow-subtle' : 'bg-slate-100 text-ink-muted'
                }`}>
                  {s.done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span className={`text-xs mt-2 font-medium ${s.done ? 'text-ink-primary font-bold' : 'text-ink-muted'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {order.shipment?.tracking_number && (
            <div className="mt-6 pt-4 border-t border-line/60 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-ink-secondary gap-2">
              <span>Carrier: <strong className="text-ink-primary">{order.shipment.carrier}</strong></span>
              <span>Tracking Number: <strong className="font-mono text-accent">{order.shipment.tracking_number}</strong></span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-rose-50 rounded-card border border-rose-200 text-xs text-danger font-semibold flex items-center gap-2">
          <XCircle className="w-5 h-5" />
          <span>This order has been cancelled and refunded to your original payment method.</span>
        </div>
      )}

      {/* Purchased Items */}
      <div className="bg-surface rounded-card border border-line overflow-hidden shadow-subtle">
        <div className="p-4 border-b border-line">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary">Order Items ({order.items?.length})</h3>
        </div>
        <div className="divide-y divide-line">
          {order.items?.map((item) => (
            <div key={item.id} className="p-4 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-ink-primary text-sm">{item.product_name}</p>
                <p className="text-ink-muted">SKU: {item.sku} • Quantity: {item.quantity}</p>
              </div>
              <span className="font-extrabold text-sm text-ink-primary">
                {formatPrice(item.total_price)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Addresses & Financial Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-surface rounded-card p-5 border border-line text-xs space-y-1.5 shadow-subtle">
          <p className="font-bold uppercase tracking-wider text-[10px] text-ink-muted mb-1">Delivery Address</p>
          <p className="font-bold text-ink-primary">{order.shipping_address?.full_name}</p>
          <p className="text-ink-secondary">{order.shipping_address?.address_line_1}</p>
          <p className="text-ink-secondary">{order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.postal_code}</p>
          <p className="text-ink-muted">{order.shipping_address?.phone}</p>
        </div>

        <div className="bg-surface rounded-card p-5 border border-line text-xs space-y-2 shadow-subtle">
          <p className="font-bold uppercase tracking-wider text-[10px] text-ink-muted mb-1">Financial Breakdown</p>
          <div className="flex justify-between">
            <span className="text-ink-muted">Subtotal</span>
            <span className="font-medium text-ink-primary">{formatPrice(order.subtotal)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Discount</span>
              <span>-{formatPrice(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-ink-muted">Shipping</span>
            <span className="font-medium text-ink-primary">{formatPrice(order.shipping)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Tax</span>
            <span className="font-medium text-ink-primary">{formatPrice(order.tax)}</span>
          </div>
          <div className="flex justify-between border-t border-line/60 pt-2 font-bold text-sm text-ink-primary">
            <span>Total Paid</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
