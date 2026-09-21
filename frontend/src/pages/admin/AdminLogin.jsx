import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, Eye, EyeOff, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export const AdminLogin = () => {
  const { login, logout, user, isAuthenticated, isAdmin } = useAuth();
  const { showToast } = useCart();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@shopera.com');
  const [password, setPassword] = useState('Admin@Shopera2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-redirect if already authenticated as Admin
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      setLoading(true);
      const loggedUser = await login({ email, password, remember_me: true });
      if (loggedUser.role === 'ADMIN') {
        showToast(`Welcome to the Admin Portal, ${loggedUser.first_name}!`, 'success');
        navigate('/admin', { replace: true });
      } else {
        // Customer tried to log in through admin portal
        logout();
        setErrorMessage('Access Denied: This portal requires administrator privileges.');
        showToast('Unauthorized: Administrator privileges required', 'danger');
      }
    } catch (err) {
      const msg = err.message || 'Invalid administrator credentials';
      setErrorMessage(msg);
      showToast(msg, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoAdmin = () => {
    setEmail('admin@shopera.com');
    setPassword('Admin@Shopera2026!');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 shadow-inner mb-1">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            SHOPERA <span className="text-indigo-400 font-light">Control Plane</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Administrative Access & Supply Chain Operations
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 space-y-6">
          
          {/* Demo Fill Banner */}
          <div className="p-3.5 bg-indigo-950/40 border border-indigo-800/40 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-300">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Click to auto-populate Admin demo account:</span>
            </div>
            <button
              type="button"
              onClick={handleFillDemoAdmin}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-[11px] transition-colors shrink-0 shadow-sm"
            >
              Fill Admin
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@shopera.com"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enter Control Plane</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800/80 text-center space-y-2">
            <p className="text-xs text-slate-400">
              Authorized Personnel Only • All activity is logged and audited
            </p>
            <div>
              <Link
                to="/"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                ← Return to Storefront
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
