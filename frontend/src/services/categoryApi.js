import api from './api';

export const categoryApi = {
  getCategories: (activeOnly = true) => api.get('/categories', { params: { active_only: activeOnly } }),
  getCategoryById: (id) => api.get(`/categories/${id}`),
  getCategoryBySlug: (slug) => api.get(`/categories/slug/${slug}`),
};
