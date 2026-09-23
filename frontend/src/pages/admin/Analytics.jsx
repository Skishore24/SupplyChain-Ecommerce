import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, Users, Percent, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { Loader } from '../../components/common/Loader';
import { formatPrice } from '../../utils/currency';

const PERIOD_OPTIONS = [
  { label: 'Past 7 Days', value: '7days' },
  { label: 'Past 30 Days', value: '30days' },
  { label: 'Past 3 Months', value: '3months' },
  { label: 'Past Year', value: '1year' },
];

const COLORS = ['#0F172A', '#2563EB', '#0D9488', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6'];

export const Analytics = () => {
  const [period, setPeriod] = useState('30days');

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['admin-analytics', period],
    queryFn: () => adminApi.getDashboard(period),
  });

  const data = dashboardData?.data;
  const metrics = data?.metrics || {};
  const revenueChart = data?.revenue_chart || [];
  const ordersChart = data?.orders_chart || [];
  const categorySales = data?.category_sales || [];
  const customerGrowth = data?.customer_growth || [];

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader size="lg" text="Computing store analytics..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900">Store Analytics</h1>
          <p className="text-sm text-slate-500">Deep-dive financial performance, order volumes, and customer conversion dynamics.</p>
        </div>

        {/* Period Selector */}
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                period === opt.value
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Revenue */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gross Revenue</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-accent">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-slate-900">
              {metrics.revenue?.formatted_value || formatPrice(metrics.revenue?.current_value || metrics.revenue?.current || 0)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className={`flex items-center font-bold ${metrics.revenue?.is_positive !== false ? 'text-emerald-600' : 'text-rose-600'}`}>
              {metrics.revenue?.is_positive !== false ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {metrics.revenue?.percentage_change ?? metrics.revenue?.growth_rate ?? 0}%
            </span>
            <span className="text-slate-400">vs prior period</span>
          </div>
        </div>

        {/* Orders */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Orders</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-slate-900">
              {metrics.orders?.formatted_value || metrics.orders?.current_value || metrics.orders?.current || 0}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className={`flex items-center font-bold ${metrics.orders?.is_positive !== false ? 'text-emerald-600' : 'text-rose-600'}`}>
              {metrics.orders?.is_positive !== false ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {metrics.orders?.percentage_change ?? metrics.orders?.growth_rate ?? 0}%
            </span>
            <span className="text-slate-400">vs prior period</span>
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average Order Value</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-slate-900">
              {metrics.aov?.formatted_value || formatPrice(metrics.aov?.current_value || metrics.aov?.current || 0)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <span>Calculated per placed checkout</span>
          </div>
        </div>

        {/* Repeat Customer Rate */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Repeat Retention</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-slate-900">
              {typeof data?.repeat_customer_rate === 'object' ? (data?.repeat_customer_rate?.repeat_rate ?? 0) : (data?.repeat_customer_rate || 0)}%
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <span>Buyers with 2+ fulfilled orders</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Growth Trend */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-bold text-slate-900">Revenue Progression</h2>
              <p className="text-xs text-slate-500">Sales volume over the selected timeframe</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip
                  formatter={(val) => [formatPrice(val), 'Revenue']}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', border: 'none' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Volume Trend */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-bold text-slate-900">Order Frequency</h2>
              <p className="text-xs text-slate-500">Count of orders processed per day</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(val) => [val, 'Orders']}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', border: 'none' }}
                />
                <Bar dataKey="orders_count" fill="#0F172A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Sales Breakdown */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="mb-6">
            <h2 className="font-serif text-lg font-bold text-slate-900">Category Sales Share</h2>
            <p className="text-xs text-slate-500">Revenue attribution distributed across departments</p>
          </div>
          <div className="h-72 w-full">
            {categorySales.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No categorical sales recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySales}
                    dataKey="sales"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {categorySales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [formatPrice(val), 'Sales']}
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', border: 'none' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Customer Growth Progression */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="mb-6">
            <h2 className="font-serif text-lg font-bold text-slate-900">Customer Base Growth</h2>
            <p className="text-xs text-slate-500">New verified customer registrations over time</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={customerGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(val) => [val, 'New Users']}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', border: 'none' }}
                />
                <Area type="monotone" dataKey="new_customers" stroke="#0D9488" strokeWidth={2.5} fill="#CCFBF1" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
