import api from './api';

export const orderApi = {
  createOrder: (orderData) => api.post('/orders', orderData),
  getUserOrders: (params) => api.get('/orders', { params }),
  getOrderDetails: (id) => api.get(`/orders/${id}`),
  cancelOrder: (id) => api.put(`/orders/${id}/cancel`),
};
