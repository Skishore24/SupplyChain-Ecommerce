import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export const Register = () => {
  const { register } = useAuth();
  const { showToast } = useCart();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    terms_accepted: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password rules validation preview
  const password = formData.password;
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[\W_]/.test(password),
  };

  const isPasswordValid = Object.values(checks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Password does not fulfill all required security criteria.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await register(formData);
      showToast('Registration complete! Welcome to SHOPERA.', 'success');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed.');
      showToast(err.message || 'Registration failed.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-surface rounded-card-lg border border-line p-8 shadow-premium space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-extrabold text-base">
              S
            </div>
            <span className="text-xl font-bold text-ink-primary">SHOPERA</span>
          </Link>
          <h1 className="text-xl font-bold text-ink-primary">Create Your Account</h1>
          <p className="text-xs text-ink-muted mt-1">Join the community of intentional creators and everyday explorers.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-danger text-xs font-semibold rounded-card-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              icon={User}
              placeholder="Sarah"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              placeholder="Jenkins"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            icon={Mail}
            placeholder="sarah.jenkins@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            label="Phone Number"
            type="tel"
            icon={Phone}
            placeholder="+1 (555) 000-0000"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                icon={Lock}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

          {/* Password Security Rules Checklist */}
          <div className="p-3.5 bg-slate-50 rounded-card-sm border border-line text-xs space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">Security Standards:</p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <span className={`flex items-center gap-1.5 ${checks.length ? 'text-emerald-600 font-semibold' : 'text-ink-muted'}`}>
                {checks.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                8+ Characters
              </span>
              <span className={`flex items-center gap-1.5 ${checks.upper ? 'text-emerald-600 font-semibold' : 'text-ink-muted'}`}>
                {checks.upper ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                1 Uppercase
              </span>
              <span className={`flex items-center gap-1.5 ${checks.lower ? 'text-emerald-600 font-semibold' : 'text-ink-muted'}`}>
                {checks.lower ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                1 Lowercase
              </span>
              <span className={`flex items-center gap-1.5 ${checks.number ? 'text-emerald-600 font-semibold' : 'text-ink-muted'}`}>
                {checks.number ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                1 Number
              </span>
              <span className={`flex items-center gap-1.5 ${checks.special ? 'text-emerald-600 font-semibold' : 'text-ink-muted'}`}>
                {checks.special ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                1 Special Char
              </span>
            </div>
          </div>

          <Input
            label="Confirm Password"
            type="password"
            icon={Lock}
            placeholder="••••••••"
            value={formData.confirm_password}
            onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
            required
          />

          <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.terms_accepted}
              onChange={(e) => setFormData({ ...formData, terms_accepted: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded text-accent"
              required
            />
            <span className="text-xs text-ink-secondary leading-tight">
              I agree to the SHOPERA Terms of Service and Privacy Policy.
            </span>
          </label>

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            <span>Complete Registration</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-line text-xs text-ink-secondary">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
