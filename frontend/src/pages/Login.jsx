import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

// Only the email is ours to remember (not sensitive). The actual password
// is left to the browser's own password manager - see the autoComplete
// attributes below, which are what trigger its native "Save password?"
// prompt. Never store a raw password in localStorage: unlike the browser's
// encrypted, permission-gated credential store, localStorage is plain text
// readable by any script on the page, so a single XSS bug would leak every
// saved password instantly.
const REMEMBERED_EMAIL_KEY = 'relol_remembered_email';

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(() => {
    try {
      return !!localStorage.getItem(REMEMBERED_EMAIL_KEY);
    } catch {
      return true;
    }
  });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await login({ email, password });
      try {
        if (rememberEmail) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      } catch {
        // localStorage unavailable (private browsing, quota) - not worth failing login over
      }
      navigate('/');
    } catch {
      // error already surfaced via context
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-blue text-white font-display font-bold text-xl flex items-center justify-center mx-auto mb-4">
          M
        </div>
        <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
        <p className="text-sm text-inkSoft mt-1">Your daily mood booster is waiting.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
        <div>
          <label htmlFor="login-email" className="text-xs font-semibold text-inkSoft uppercase tracking-wide">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-lavender bg-white px-4 py-3 text-sm focus:border-slate outline-none"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-xs font-semibold text-inkSoft uppercase tracking-wide">Password</label>
            <Link to="/forgot-password" className="text-xs font-semibold text-blue-dark">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-lavender bg-white px-4 py-3 text-sm focus:border-slate outline-none"
            placeholder="••••••••"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-inkSoft select-none">
          <input
            type="checkbox"
            checked={rememberEmail}
            onChange={(e) => setRememberEmail(e.target.checked)}
            className="rounded border-lavender"
          />
          Remember my email on this device
        </label>

        {error && <p className="text-sm text-danger-dark font-medium">{error}</p>}

        <button type="submit" disabled={loading} className="btn-pop w-full py-3.5 mt-2">
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="text-center text-sm text-inkSoft mt-6">
        New here?{' '}
        <Link to="/signup" className="text-blue-dark font-semibold">
          Create an account
        </Link>
      </p>
    </div>
  );
}
