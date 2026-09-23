import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { StoreLayout } from '../components/layout/StoreLayout';
import { AdminLayout } from '../components/layout/AdminLayout';

// Guards
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';

// Customer Storefront Pages
import { Home } from '../pages/Home';
import { Products } from '../pages/Products';
import { ProductDetails } from '../pages/ProductDetails';
import { Cart } from '../pages/Cart';
import { Wishlist } from '../pages/Wishlist';
import { Checkout } from '../pages/Checkout';
import { Orders } from '../pages/Orders';
import { OrderDetails } from '../pages/OrderDetails';
import { Profile } from '../pages/Profile';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { ForgotPassword } from '../pages/ForgotPassword';

// Admin Portal Pages
import { Dashboard as AdminDashboard } from '../pages/admin/Dashboard';
import { Products as AdminProducts } from '../pages/admin/Products';
import { CreateProduct as AdminCreateProduct } from '../pages/admin/CreateProduct';
import { EditProduct as AdminEditProduct } from '../pages/admin/EditProduct';
import { Categories as AdminCategories } from '../pages/admin/Categories';
import { Orders as AdminOrders } from '../pages/admin/Orders';
import { Customers as AdminCustomers } from '../pages/admin/Customers';
import { Inventory as AdminInventory } from '../pages/admin/Inventory';
import { Coupons as AdminCoupons } from '../pages/admin/Coupons';
import { Reviews as AdminReviews } from '../pages/admin/Reviews';
import { Analytics as AdminAnalytics } from '../pages/admin/Analytics';
import { Settings as AdminSettings } from '../pages/admin/Settings';
import { AdminLogin } from '../pages/admin/AdminLogin';

// AI Intelligence Suite
import AICommandCenter from '../pages/admin/ai/AICommandCenter';
import InventoryRiskPage from '../pages/admin/ai/InventoryRiskPage';
import DemandForecastingPage from '../pages/admin/ai/DemandForecastingPage';
import AlertCenterPage from '../pages/admin/ai/AlertCenterPage';
import CustomerIntelligencePage from '../pages/admin/ai/CustomerIntelligencePage';
import AnomalyDetectionPage from '../pages/admin/ai/AnomalyDetectionPage';
import RecommendationsPage from '../pages/admin/ai/RecommendationsPage';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Customer Storefront Routes */}
      <Route element={<StoreLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wishlist" element={<Wishlist />} />

        {/* Customer Auth Pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Customer Routes */}
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:orderNumber"
          element={
            <ProtectedRoute>
              <OrderDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Admin Login Route (Publicly accessible to authenticate admin) */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Admin Portal Routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/create" element={<AdminCreateProduct />} />
        <Route path="products/new" element={<AdminCreateProduct />} />
        <Route path="products/edit/:id" element={<AdminEditProduct />} />
        <Route path="products/:id/edit" element={<AdminEditProduct />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="settings" element={<AdminSettings />} />

        {/* AI Supply Chain Intelligence Suite */}
        <Route path="ai" element={<AICommandCenter />} />
        <Route path="ai/inventory" element={<InventoryRiskPage />} />
        <Route path="ai/forecasting" element={<DemandForecastingPage />} />
        <Route path="ai/alerts" element={<AlertCenterPage />} />
        <Route path="ai/customers" element={<CustomerIntelligencePage />} />
        <Route path="ai/anomalies" element={<AnomalyDetectionPage />} />
        <Route path="ai/recommendations" element={<RecommendationsPage />} />
      </Route>

      {/* Fallback wildcard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
