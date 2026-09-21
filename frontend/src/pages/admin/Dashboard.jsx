import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Sparkles,
  Calendar
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { adminApi } from '../../services/adminApi';
import { DashboardCardSkeleton } from '../../components/common/Loader';
import { Link } from 'react-router-dom';
import { formatPrice } from '../../utils/currency';

const COLORS = ['#2563EB', '#0F172A', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export const Dashboard = () => {
  const [period, setPeriod] = useState('30days');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard', period],
    queryFn: () => adminApi.getDashboard(period),
  });

  const dashboard = data?.data;
  const metrics = dashboard?.metrics;
  const revenueChart = dashboard?.revenue_chart || [];
  const categorySales = dashboard?.category_sales || [];
  const topProducts = dashboard?.top_products || [];
  const repeatRate = dashboard?.repeat_customer_rate?.repeat_rate || 68;

  const statCards = [
    {
      key: 'revenue',
      title: 'Total Revenue',
      icon: DollarSign,
      metric: metrics?.revenue,
      color: 'text-accent',
      bg: 'bg-blue-50',
    },
    {
      key: 'orders',
      title: 'Total Orders',
      icon: ShoppingBag,
      metric: metrics?.orders,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      key: 'customers',
      title: 'Total Customers',
      icon: Users,
      metric: metrics?.customers,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      key: 'products',
      title: 'Active Products',
      icon: Package,
      metric: metrics?.products,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header & Date Filter (Inspired by Reference 1 Shopeers Dashboard) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-ink-muted mt-0.5">Real-time commerce telemetry powered by MySQL database.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-input bg-surface border border-line text-xs font-semibold text-ink-secondary">
            <Calendar className="w-3.5 h-3.5 text-ink-muted" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent border-none text-xs focus:outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last 1 Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          const m = card.metric;
          if (isLoading) return <DashboardCardSkeleton key={card.key} />;

          return (
            <div
              key={card.key}
              className="bg-surface rounded-card p-5 border border-line shadow-subtle flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">{card.title}</span>
                <div className={`w-8 h-8 rounded-xl ${card.bg} ${card.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="my-3">
                <span className="text-2xl sm:text-3xl font-black text-ink-primary tracking-tight">
                  {m?.formatted_value || '0'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-0.5 font-bold ${
                    m?.is_positive ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {m?.is_positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {m?.percentage_change}%
                </span>
                <span className="text-ink-muted">vs previous period</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue Overview Curve Chart */}
        <div className="lg:col-span-8 bg-surface rounded-card p-6 border border-line shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink-primary">Revenue Telemetry</h3>
              <p className="text-xs text-ink-muted">Daily accumulated payment settlements</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val) => [formatPrice(val), 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Repeat Customer Rate / Loyalty Widget (Inspired by Reference 1) */}
        <div className="lg:col-span-4 bg-surface rounded-card p-6 border border-line shadow-subtle flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink-primary">Repeat Customer Rate</h3>
            <p className="text-xs text-ink-muted">Retention cohort efficiency</p>
          </div>

          <div className="py-8 flex flex-col items-center justify-center">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-accent"
                  strokeDasharray={`${repeatRate}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-black text-ink-primary">{repeatRate}%</span>
                <span className="text-[10px] text-ink-muted block font-semibold">Retention</span>
              </div>
            </div>
            <p className="text-xs text-center text-ink-secondary mt-4 max-w-xs">
              On track for industry-leading 80% multi-purchase milestone.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-card-sm border border-line text-xs text-ink-muted flex items-center justify-between">
            <span>Customer Lifetime Metric</span>
            <span className="font-bold text-accent">Active</span>
          </div>
        </div>
      </div>

      {/* Second Analytics Row: Top Products & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Selling Products Table */}
        <div className="lg:col-span-8 bg-surface rounded-card p-6 border border-line shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-primary">Top Performing Goods</h3>
            <Link to="/admin/products" className="text-xs font-semibold text-accent hover:underline">
              Manage Products
            </Link>
          </div>

          <div className="divide-y divide-line">
            {topProducts.length === 0 ? (
              <p className="text-xs text-ink-muted py-6 text-center">No sales recorded yet.</p>
            ) : (
              topProducts.map((p) => (
                <div key={p.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-card-sm overflow-hidden bg-slate-50 border border-line shrink-0">
                      <img src={p.primary_image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-ink-primary truncate max-w-xs sm:max-w-sm">{p.name}</p>
                      <p className="text-ink-muted font-mono">{p.sku}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <span className="font-bold text-ink-primary">{p.units_sold}</span>
                      <span className="text-ink-muted block text-[10px]">units sold</span>
                    </div>
                    <div>
                      <span className="font-extrabold text-ink-primary">{formatPrice(p.revenue)}</span>
                      <span className="text-emerald-600 block text-[10px] font-semibold">settled</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category Sales Share Pie Chart */}
        <div className="lg:col-span-4 bg-surface rounded-card p-6 border border-line shadow-subtle space-y-4">
          <h3 className="text-sm font-bold text-ink-primary">Sales by Category</h3>
          <div className="h-48 w-full flex items-center justify-center">
            {categorySales.length === 0 ? (
              <p className="text-xs text-ink-muted">Awaiting order transactions</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySales}
                    dataKey="sales"
                    nameKey="category_name"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {categorySales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatPrice(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {categorySales.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                  <span className="text-ink-secondary truncate max-w-[140px]">{c.category_name}</span>
                </div>
                <span className="font-bold text-ink-primary">{c.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
