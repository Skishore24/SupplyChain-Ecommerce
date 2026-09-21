import api from './api';

export const adminApi = {
  // Dashboard & Analytics
  getDashboard: (period = '30days') => api.get('/admin/dashboard', { params: { period } }),
  getRevenueAnalytics: (period = '30days') => api.get('/admin/analytics/revenue', { params: { period } }),
  getOrdersAnalytics: (period = '30days') => api.get('/admin/analytics/orders', { params: { period } }),
  getCustomersAnalytics: (period = '30days') => api.get('/admin/analytics/customers', { params: { period } }),
  getCategorySales: () => api.get('/admin/analytics/categories'),

  // Products CRUD
  getProducts: (params) => api.get('/admin/products', { params }),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),

  // Categories CRUD
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`),

  // Orders Management
  getOrders: (params) => api.get('/admin/orders', { params }),
  updateOrderStatus: (id, data) => api.put(`/orders/${id}/status`, data),

  // Customers Management
  getCustomers: (params) => api.get('/admin/customers', { params }),
  updateCustomerStatus: (id, data) => api.put(`/admin/customers/${id}/status`, data),

  // Inventory Management
  getInventory: (params) => api.get('/admin/inventory', { params }),
  updateInventory: (id, data) => api.put(`/admin/inventory/${id}`, data),

  // Coupons CRUD
  getCoupons: () => api.get('/coupons'),
  createCoupon: (data) => api.post('/coupons', data),
  updateCoupon: (id, data) => api.put(`/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/coupons/${id}`),
  validateCoupon: (code, cartTotal) => api.post('/coupons/validate', { code, cart_total: cartTotal }),

  // Reviews Moderation
  getReviews: (params) => api.get('/reviews', { params }),
  updateReviewStatus: (id, status) => api.put(`/reviews/${id}/status`, { status }),
  deleteReview: (id) => api.delete(`/reviews/${id}`),
};
