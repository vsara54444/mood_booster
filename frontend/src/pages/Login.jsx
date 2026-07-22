import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate('/');
    } catch {
      // error already surfaced via context
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-md mx-auto">
      <div className="text-center mb-8">
        <p className="text-5xl mb-2">😅</p>
        <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
        <p className="text-sm text-inkSoft mt-1">Your daily mood booster is waiting.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-inkSoft uppercase tracking-wide">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-lavender bg-white px-4 py-3 text-sm focus:border-teal outline-none"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-inkSoft uppercase tracking-wide">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-lavender bg-white px-4 py-3 text-sm focus:border-teal outline-none"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-coral-dark font-medium">{error}</p>}

        <button type="submit" disabled={loading} className="btn-pop w-full py-3.5 mt-2">
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="text-center text-sm text-inkSoft mt-6">
        New here?{' '}
        <Link to="/signup" className="text-coral-dark font-semibold">
          Create an account
        </Link>
      </p>
    </div>
  );
}
