import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  MapPin,
  Truck,
  CreditCard,
  ClipboardCheck,
  ArrowRight,
  ShieldCheck,
  Plus,
  ArrowLeft,
  Package
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/authApi';
import { orderApi } from '../services/orderApi';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { formatPrice } from '../utils/currency';

export const Checkout = () => {
  const { cart, loading: cartLoading, fetchCart, showToast } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [deliveryMethod, setDeliveryMethod] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('Credit/Debit Card');
  const [notes, setNotes] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Address modal state
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [newAddress, setNewAddress] = useState({
    full_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
    phone: user?.phone || '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'United States',
    is_default: true,
  });

  // Fetch user addresses
  const { data: addressesData, refetch: refetchAddresses } = useQuery({
    queryKey: ['user-addresses'],
    queryFn: () => authApi.getAddresses(),
  });

  const addresses = addressesData?.data || [];

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
      setSelectedAddressId(defaultAddr.id);
    }
  }, [addresses, selectedAddressId]);

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await authApi.createAddress(newAddress);
      if (res.success) {
        showToast('Address added successfully', 'success');
        setAddressModalOpen(false);
        await refetchAddresses();
        setSelectedAddressId(res.data.id);
      }
    } catch (err) {
      showToast(err.message || 'Failed to save address', 'danger');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      showToast('Please select a delivery address', 'warning');
      setCurrentStep(1);
      return;
    }

    try {
      setIsPlacingOrder(true);
      const res = await orderApi.createOrder({
        shipping_address_id: selectedAddressId,
        billing_address_id: selectedAddressId,
        payment_method: paymentMethod,
        coupon_code: cart?.coupon_code || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success && res.data) {
        setCompletedOrder(res.data);
        setCurrentStep(5);
        await fetchCart();
      }
    } catch (err) {
      showToast(err.message || 'Failed to place order. Please verify stock.', 'danger');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const items = cart?.items || [];
  const subtotal = Number(cart?.subtotal || 0);
  const discount = Number(cart?.discount || 0);
  const shipping = Number(cart?.shipping || 0);
  const tax = Number(cart?.tax || 0);
  const total = Number(cart?.total || 0);

  // If order is completed, show step 5 confirmation receipt
  if (currentStep === 5 && completedOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-surface rounded-card-lg border border-line p-8 sm:p-12 shadow-premium text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 animate-in zoom-in-75 duration-300">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Payment & Order Confirmed</span>
            <h1 className="text-2xl sm:text-3xl font-black text-ink-primary tracking-tight mt-1">
              Thank You For Your Order!
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted mt-2">
              Order reference: <span className="font-mono font-bold text-ink-primary">{completedOrder.order_number}</span>
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-card border border-line text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-ink-muted">Tracking Code</span>
              <span className="font-mono font-semibold text-accent">{completedOrder.shipment?.tracking_number || 'TRK-ASSIGNED'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Carrier</span>
              <span className="font-semibold text-ink-primary">{completedOrder.shipment?.carrier || 'FedEx Express'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Payment Reference</span>
              <span className="font-mono text-ink-primary">{completedOrder.payment?.payment_reference}</span>
            </div>
            <div className="flex justify-between border-t border-line/60 pt-2 font-bold text-sm text-ink-primary">
              <span>Grand Total Paid</span>
              <span>{formatPrice(completedOrder.total)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link to={`/profile/orders/${completedOrder.id}`} className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full sm:w-auto">
                <Package className="w-4 h-4" />
                Track Order Status
              </Button>
            </Link>
            <Link to="/" className="w-full sm:w-auto">
              <Button variant="outline" size="md" className="w-full sm:w-auto">
                Back to Homepage
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Checkout Steps Progress Indicator */}
      <div className="mb-10 max-w-2xl mx-auto">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-line -translate-y-1/2 z-0"></div>
          {[
            { step: 1, title: 'Address', icon: MapPin },
            { step: 2, title: 'Delivery', icon: Truck },
            { step: 3, title: 'Payment', icon: CreditCard },
            { step: 4, title: 'Review', icon: ClipboardCheck },
          ].map(({ step, title, icon: Icon }) => {
            const isCompleted = currentStep > step;
            const isCurrent = currentStep === step;
            return (
              <div key={step} className="relative z-10 flex flex-col items-center">
                <button
                  onClick={() => step < currentStep && setCurrentStep(step)}
                  disabled={step > currentStep}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-subtle'
                      : isCurrent
                      ? 'bg-primary text-white ring-4 ring-blue-100 shadow-subtle'
                      : 'bg-surface border border-line text-ink-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
                <span className={`text-[11px] font-semibold mt-2 ${isCurrent ? 'text-ink-primary font-bold' : 'text-ink-muted'}`}>
                  {title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Step Views (Left Column) */}
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: ADDRESS */}
          {currentStep === 1 && (
            <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-line">
                <div>
                  <h2 className="text-base font-bold text-ink-primary">Select Shipping Address</h2>
                  <p className="text-xs text-ink-muted mt-0.5">Choose where your order will be delivered</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAddressModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  Add Address
                </Button>
              </div>

              {addresses.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-line rounded-card-sm space-y-3">
                  <p className="text-xs text-ink-muted">No addresses saved on your profile yet.</p>
                  <Button size="sm" onClick={() => setAddressModalOpen(true)}>Add New Address</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`p-4 rounded-card-sm border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        selectedAddressId === addr.id
                          ? 'border-accent bg-blue-50/40 shadow-subtle ring-2 ring-blue-100'
                          : 'border-line hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-ink-primary">{addr.full_name}</span>
                          {addr.is_default && (
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">Default</span>
                          )}
                        </div>
                        <p className="text-xs text-ink-secondary leading-relaxed">
                          {addr.address_line_1} {addr.address_line_2}
                        </p>
                        <p className="text-xs text-ink-secondary">
                          {addr.city}, {addr.state} {addr.postal_code}
                        </p>
                        <p className="text-xs text-ink-muted mt-2">{addr.phone}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-line">
                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={!selectedAddressId}
                  variant="primary"
                  size="md"
                >
                  <span>Continue to Delivery</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: DELIVERY */}
          {currentStep === 2 && (
            <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-6">
              <div className="pb-4 border-b border-line">
                <h2 className="text-base font-bold text-ink-primary">Delivery Method</h2>
                <p className="text-xs text-ink-muted mt-0.5">Select your preferred courier service</p>
              </div>

              <div className="space-y-3">
                <label
                  onClick={() => setDeliveryMethod('standard')}
                  className={`p-4 rounded-card-sm border-2 cursor-pointer flex items-center justify-between transition-all ${
                    deliveryMethod === 'standard' ? 'border-accent bg-blue-50/40 ring-2 ring-blue-100' : 'border-line hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-xs font-bold text-ink-primary">Standard Insured Courier (FedEx Express)</p>
                      <p className="text-xs text-ink-muted">Estimated delivery in 2–4 business days</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-ink-primary">
                    {subtotal >= 100 ? 'Complimentary' : '$15.00'}
                  </span>
                </label>
              </div>

              <div className="flex justify-between pt-4 border-t border-line">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)}>
                  <ArrowLeft className="w-4 h-4" /> Back to Address
                </Button>
                <Button variant="primary" size="md" onClick={() => setCurrentStep(3)}>
                  <span>Continue to Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT */}
          {currentStep === 3 && (
            <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-6">
              <div className="pb-4 border-b border-line">
                <h2 className="text-base font-bold text-ink-primary">Payment Architecture</h2>
                <p className="text-xs text-ink-muted mt-0.5">Verified mock transaction engine active. No real credit card charged.</p>
              </div>

              <div className="space-y-3">
                {['Credit/Debit Card', 'Apple Pay / Digital Wallet', 'Instant Bank Wire'].map((m) => (
                  <label
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`p-4 rounded-card-sm border-2 cursor-pointer flex items-center justify-between transition-all ${
                      paymentMethod === m ? 'border-accent bg-blue-50/40 ring-2 ring-blue-100' : 'border-line hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-accent" />
                      <span className="text-xs font-bold text-ink-primary">{m}</span>
                    </div>
                    {paymentMethod === m && <CheckCircle2 className="w-4 h-4 text-accent" />}
                  </label>
                ))}
              </div>

              <div className="p-4 bg-slate-50 rounded-card-sm border border-line text-xs text-ink-muted space-y-1">
                <p className="font-semibold text-ink-primary flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  PCI-DSS Compliant Test Gateway
                </p>
                <p>Safe sandbox environment enabled. An authentic cryptographic reference (e.g. SHP-PAY-XXXX) will be generated in MySQL upon order confirmation.</p>
              </div>

              <div className="flex justify-between pt-4 border-t border-line">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button variant="primary" size="md" onClick={() => setCurrentStep(4)}>
                  <span>Review Order</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {currentStep === 4 && (
            <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-6">
              <div className="pb-4 border-b border-line">
                <h2 className="text-base font-bold text-ink-primary">Review & Authorize Order</h2>
                <p className="text-xs text-ink-muted mt-0.5">Please review your shipping and total amounts before authorizing.</p>
              </div>

              {/* Delivery & Payment Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-card-sm bg-slate-50 border border-line">
                  <p className="font-bold text-ink-primary uppercase tracking-wider text-[10px] mb-1">Shipping Destination</p>
                  {selectedAddressId && addresses.find((a) => a.id === selectedAddressId) ? (
                    <p className="text-ink-secondary">
                      {addresses.find((a) => a.id === selectedAddressId).full_name}, {addresses.find((a) => a.id === selectedAddressId).address_line_1}, {addresses.find((a) => a.id === selectedAddressId).city}
                    </p>
                  ) : null}
                </div>
                <div className="p-3.5 rounded-card-sm bg-slate-50 border border-line">
                  <p className="font-bold text-ink-primary uppercase tracking-wider text-[10px] mb-1">Payment Method</p>
                  <p className="text-ink-secondary">{paymentMethod} (Authorized upon submission)</p>
                </div>
              </div>

              {/* Order Items Review */}
              <div className="border border-line rounded-card-sm divide-y divide-line overflow-hidden">
                {items.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded bg-slate-100 overflow-hidden shrink-0">
                        <img src={item.product?.primary_image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-bold text-ink-primary">{item.product?.name}</p>
                        <p className="text-ink-muted">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-bold text-ink-primary">{formatPrice(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Delivery notes optional */}
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  Delivery Notes / Instructions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Leave with building reception or front porch"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-input px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex justify-between pt-4 border-t border-line">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)}>
                  <ArrowLeft className="w-4 h-4" /> Back to Payment
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  loading={isPlacingOrder}
                  onClick={handlePlaceOrder}
                  className="shadow-premium"
                >
                  Authorize & Place Order ({formatPrice(total)})
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Summary Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-4">
            <h3 className="text-sm font-bold text-ink-primary uppercase tracking-wider pb-3 border-b border-line">
              Order Breakdown
            </h3>

            <div className="space-y-2.5 text-xs text-ink-secondary">
              <div className="flex justify-between">
                <span>Items ({cart?.item_count || 0})</span>
                <span className="font-semibold text-ink-primary">{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Promotional Discount</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-semibold text-ink-primary">
                  {shipping === 0 ? 'Complimentary' : formatPrice(shipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Tax (8%)</span>
                <span className="font-semibold text-ink-primary">{formatPrice(tax)}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-line flex justify-between items-baseline">
              <span className="text-sm font-bold text-ink-primary">Total</span>
              <span className="text-2xl font-black text-ink-primary">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Address Modal */}
      <Modal isOpen={addressModalOpen} onClose={() => setAddressModalOpen(false)} title="Add Delivery Address">
        <form onSubmit={handleCreateAddress} className="space-y-3.5">
          <Input
            label="Full Name"
            value={newAddress.full_name}
            onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
            required
          />
          <Input
            label="Phone Number"
            value={newAddress.phone}
            onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
            required
          />
          <Input
            label="Street Address Line 1"
            value={newAddress.address_line_1}
            onChange={(e) => setNewAddress({ ...newAddress, address_line_1: e.target.value })}
            required
          />
          <Input
            label="Apt / Suite / Unit (Optional)"
            value={newAddress.address_line_2}
            onChange={(e) => setNewAddress({ ...newAddress, address_line_2: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              value={newAddress.city}
              onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
              required
            />
            <Input
              label="State / Province"
              value={newAddress.state}
              onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Postal Code"
              value={newAddress.postal_code}
              onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
              required
            />
            <Input
              label="Country"
              value={newAddress.country}
              disabled
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-line">
            <Button variant="ghost" size="sm" onClick={() => setAddressModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm">Save Address</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
