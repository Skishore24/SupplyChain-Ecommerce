import api from './api';

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  updateProfile: (data) => api.put('/users/profile', data),
  getAddresses: () => api.get('/users/addresses'),
  createAddress: (data) => api.post('/users/addresses', data),
  updateAddress: (id, data) => api.put(`/users/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/users/addresses/${id}`),
  setDefaultAddress: (id) => api.put(`/users/addresses/${id}/default`),
};
