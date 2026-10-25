/**
 * Rutgers AI4Good 2026 — Shared S4 Authentication Modal
 * Conforms to Shared API Contract v2 (/api/v1/auth/login and /register)
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { ApiClient, defaultApiClient } from '../../api/client';
import { User } from '../../api/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
  apiClient?: ApiClient;
}

export function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  apiClient = defaultApiClient,
}: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (tab === 'register') {
        const regRes = await apiClient.register({ email, password });
        // After registration, log in
        await apiClient.login({ email, password });
        onAuthSuccess(regRes.user);
      } else {
        await apiClient.login({ email, password });
        const user = await apiClient.getMe();
        onAuthSuccess(user);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication modal"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg"
        >
          ×
        </button>

        <div className="flex border-b border-slate-200 mb-6">
          <button
            type="button"
            aria-label="Switch to Sign In"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-sm font-semibold border-b-2 text-center transition-colors ${
              tab === 'login'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            aria-label="Switch to Register"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`flex-1 py-2 text-sm font-semibold border-b-2 text-center transition-colors ${
              tab === 'register'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Register
          </button>
        </div>

        <h2 id="auth-modal-title" className="text-lg font-bold text-slate-900 mb-1">
          {tab === 'login' ? 'Sign in to your account' : 'Create an AI4Good student account'}
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Session tokens are stored in memory and sent via Bearer authorization.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="auth-email">
              Email Address
            </label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@rutgers.edu"
              required
              aria-label="Email Address"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="auth-password">
              Password
            </label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              aria-label="Password"
              className="w-full"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isSubmitting}
              aria-label={tab === 'login' ? 'Submit Sign In' : 'Submit Registration'}
            >
              {isSubmitting
                ? 'Authenticating...'
                : tab === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
