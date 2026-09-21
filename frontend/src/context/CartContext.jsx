import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartApi } from '../services/cartApi';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type, id: Date.now() });
    setTimeout(() => {
      setToastMessage((curr) => (curr?.id === toastMessage?.id ? null : curr));
    }, 3500);
  };

  const fetchCart = async (code = couponCode) => {
    if (!isAuthenticated) {
      setCart(null);
      return;
    }
    try {
      setLoading(true);
      const res = await cartApi.getCart(code);
      if (res.success) {
        setCart(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch cart:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [isAuthenticated]);

  const addToCart = async (productId, quantity = 1) => {
    if (!isAuthenticated) {
      showToast("Please sign in to add items to your cart", "warning");
      return false;
    }
    try {
      const res = await cartApi.addToCart(productId, quantity);
      if (res.success) {
        setCart(res.data);
        showToast("Added to bag successfully", "success");
        return true;
      }
    } catch (err) {
      showToast(err.message || "Could not add product to cart", "danger");
      return false;
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      const res = await cartApi.updateQuantity(itemId, quantity);
      if (res.success) {
        setCart(res.data);
      }
    } catch (err) {
      showToast(err.message || "Failed to update item quantity", "danger");
    }
  };

  const removeItem = async (itemId) => {
    try {
      const res = await cartApi.removeItem(itemId);
      if (res.success) {
        setCart(res.data);
        showToast("Item removed from your bag", "success");
      }
    } catch (err) {
      showToast(err.message || "Failed to remove item", "danger");
    }
  };

  const clearCart = async () => {
    try {
      await cartApi.clearCart();
      setCart({ items: [], item_count: 0, subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0 });
    } catch (err) {
      console.error("Error clearing cart", err);
    }
  };

  const applyCoupon = async (code) => {
    setCouponCode(code);
    await fetchCart(code);
  };

  const itemCount = cart?.item_count || 0;

  return (
    <CartContext.Provider value={{
      cart,
      itemCount,
      loading,
      couponCode,
      toastMessage,
      showToast,
      fetchCart,
      addToCart,
      updateQuantity,
      removeItem,
      clearCart,
      applyCoupon
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
