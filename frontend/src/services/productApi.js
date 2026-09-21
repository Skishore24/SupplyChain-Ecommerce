import api from './api';

export const productApi = {
  getProducts: (params) => api.get('/products', { params }),
  getFeatured: () => api.get('/products/featured'),
  getNewArrivals: () => api.get('/products/new-arrivals'),
  getProductBySlug: (slug) => api.get(`/products/slug/${slug}`),
  getProductById: (id) => api.get(`/products/${id}`),
  getReviews: (productId, params) => api.get(`/products/${productId}/reviews`, { params }),
  createReview: (productId, data) => api.post(`/products/${productId}/reviews`, data),
};
