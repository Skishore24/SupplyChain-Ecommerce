import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartApi } from '../services/cartApi';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { showToast, fetchCart } = useCart();
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = async () => {
    if (!isAuthenticated) {
      setWishlist(null);
      return;
    }
    try {
      setLoading(true);
      const res = await cartApi.getWishlist();
      if (res.success) {
        setWishlist(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch wishlist:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [isAuthenticated]);

  const isInWishlist = (productId) => {
    if (!wishlist?.items) return false;
    return wishlist.items.some((item) => item.product_id === productId);
  };

  const toggleWishlist = async (productId) => {
    if (!isAuthenticated) {
      showToast("Please sign in to save items to your wishlist", "warning");
      return;
    }
    try {
      if (isInWishlist(productId)) {
        const res = await cartApi.removeFromWishlist(productId);
        if (res.success) {
          setWishlist(res.data);
          showToast("Removed from wishlist", "info");
        }
      } else {
        const res = await cartApi.addToWishlist(productId);
        if (res.success) {
          setWishlist(res.data);
          showToast("Saved to your wishlist", "success");
        }
      }
    } catch (err) {
      showToast(err.message || "Failed to update wishlist", "danger");
    }
  };

  const moveToCart = async (productId) => {
    try {
      const res = await cartApi.moveToCart(productId);
      if (res.success) {
        await fetchWishlist();
        await fetchCart();
        showToast("Item moved from wishlist to your bag", "success");
      }
    } catch (err) {
      showToast(err.message || "Failed to move item to cart", "danger");
    }
  };

  const itemCount = wishlist?.item_count || 0;

  return (
    <WishlistContext.Provider value={{
      wishlist,
      itemCount,
      loading,
      isInWishlist,
      toggleWishlist,
      moveToCart,
      fetchWishlist
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
};
