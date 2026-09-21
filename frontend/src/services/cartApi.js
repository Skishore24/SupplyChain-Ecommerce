import api from './api';

export const cartApi = {
  getCart: (couponCode) => api.get('/cart', { params: { coupon_code: couponCode } }),
  addToCart: (productId, quantity = 1) => api.post('/cart/items', { product_id: productId, quantity }),
  updateQuantity: (itemId, quantity) => api.put(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId) => api.delete(`/cart/items/${itemId}`),
  clearCart: () => api.delete('/cart'),
  
  // Wishlist
  getWishlist: () => api.get('/wishlist'),
  addToWishlist: (productId) => api.post(`/wishlist/${productId}`),
  removeFromWishlist: (productId) => api.delete(`/wishlist/${productId}`),
  moveToCart: (productId) => api.post(`/wishlist/${productId}/move-to-cart`),
};
