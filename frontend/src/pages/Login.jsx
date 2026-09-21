import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export const Login = () => {
  const { login } = useAuth();
  const { showToast } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const user = await login({ email, password, remember_me: rememberMe });
      showToast(`Welcome back, ${user.first_name}!`, 'success');
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      showToast(err.message || 'Invalid email or password', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdmin = () => {
    setEmail('admin@shopera.com');
    setPassword('Admin@Shopera2026!');
  };

  const handleDemoCustomer = () => {
    setEmail('sarah.jenkins@example.com');
    setPassword('Customer@1234');
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-surface rounded-card-lg border border-line p-8 shadow-premium space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-extrabold text-base">
              S
            </div>
            <span className="text-xl font-bold text-ink-primary">SHOPERA</span>
          </Link>
          <h1 className="text-xl font-bold text-ink-primary">Welcome Back</h1>
          <p className="text-xs text-ink-muted mt-1">Sign in to manage your orders, bag, and preferences.</p>
        </div>

        {/* Quick Demo Fill Pills */}
        <div className="p-3 bg-slate-50 rounded-card border border-line text-xs space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Quick Fill Demo Accounts:</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDemoCustomer}
              className="flex-1 py-1.5 px-2 bg-white border border-line rounded-btn text-xs font-semibold hover:border-accent hover:text-accent transition-colors"
            >
              Customer Demo
            </button>
            <button
              type="button"
              onClick={handleDemoAdmin}
              className="flex-1 py-1.5 px-2 bg-white border border-line rounded-btn text-xs font-semibold hover:border-accent hover:text-accent transition-colors"
            >
              Admin Demo
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            icon={Mail}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wider">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-accent hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                icon={Lock}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-ink-muted hover:text-ink-primary"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-accent"
              />
              <span className="text-xs text-ink-secondary">Remember session for 7 days</span>
            </label>
          </div>

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-line text-xs text-ink-secondary space-y-2">
          <div>
            Don't have an account yet?{' '}
            <Link to="/register" className="font-semibold text-accent hover:underline">
              Create an account
            </Link>
          </div>
          <div className="pt-2">
            <Link to="/admin/login" className="text-[11px] font-medium text-ink-muted hover:text-ink-primary transition-colors">
              Staff or Administrator? <span className="underline">Access Admin Portal →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
