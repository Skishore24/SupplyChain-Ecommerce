import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { authApi } from '../services/authApi';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await authApi.forgotPassword({ email });
      setSubmitted(true);
    } catch (err) {
      // Keep UX consistent to prevent account enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-surface rounded-card-lg border border-line p-8 shadow-premium space-y-6 text-center">
        {submitted ? (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-ink-primary">Check Your Email</h2>
            <p className="text-xs text-ink-secondary leading-relaxed">
              If an account with {email} exists in our system, password reset instructions and security tokens have been dispatched.
            </p>
            <div className="pt-4">
              <Link to="/login">
                <Button variant="outline" size="sm" className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-bold text-ink-primary">Reset Password</h1>
              <p className="text-xs text-ink-muted mt-1">Enter your registered email to receive reset instructions.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <Input
                label="Email Address"
                type="email"
                icon={Mail}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                <span>Send Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="pt-2 text-xs text-ink-secondary">
              Remember your password?{' '}
              <Link to="/login" className="font-semibold text-accent hover:underline">
                Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
