import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('shopera_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('shopera_access_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem('shopera_access_token');
      if (accessToken) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('shopera_user', JSON.stringify(res.data));
          }
        } catch (err) {
          console.error("Auth session expired or invalid:", err.message);
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    if (res.success && res.data) {
      const { access_token, refresh_token, user: userData } = res.data;
      localStorage.setItem('shopera_access_token', access_token);
      localStorage.setItem('shopera_refresh_token', refresh_token);
      localStorage.setItem('shopera_user', JSON.stringify(userData));
      setToken(access_token);
      setUser(userData);
      return userData;
    }
    throw new Error(res.message || "Failed to log in");
  };

  const register = async (userData) => {
    const res = await authApi.register(userData);
    if (res.success && res.data) {
      const { access_token, refresh_token, user: newUser } = res.data;
      localStorage.setItem('shopera_access_token', access_token);
      localStorage.setItem('shopera_refresh_token', refresh_token);
      localStorage.setItem('shopera_user', JSON.stringify(newUser));
      setToken(access_token);
      setUser(newUser);
      return newUser;
    }
    throw new Error(res.message || "Registration failed");
  };

  const logout = () => {
    localStorage.removeItem('shopera_access_token');
    localStorage.removeItem('shopera_refresh_token');
    localStorage.removeItem('shopera_user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.getMe();
      if (res.success && res.data) {
        setUser(res.data);
        localStorage.setItem('shopera_user', JSON.stringify(res.data));
      }
    } catch (err) {
      console.error("Error refreshing user profile", err);
    }
  };

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated,
      isAdmin,
      login,
      register,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
