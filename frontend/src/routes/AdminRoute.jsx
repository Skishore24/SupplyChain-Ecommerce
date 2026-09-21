import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/common/Loader';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../components/common/Button';

export const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="bg-surface rounded-card p-8 border border-line shadow-premium max-w-md w-full text-center">
          <div className="w-14 h-14 bg-rose-50 text-danger rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-ink-primary mb-2">Unauthorized Access</h2>
          <p className="text-sm text-ink-secondary mb-6 leading-relaxed">
            You do not possess the required administrator privileges to access the SHOPERA Management Portal.
          </p>
          <Button onClick={() => window.location.href = '/'} variant="primary" className="w-full">
            Return to Storefront
          </Button>
        </div>
      </div>
    );
  }

  return children;
};
