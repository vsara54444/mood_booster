import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-md mx-auto text-center">
        <p className="text-sm text-danger-dark font-medium">
          This link is missing its reset token. Please request a new one.
        </p>
        <Link to="/forgot-password" className="text-blue-dark font-semibold text-sm mt-4">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-semibold">Set a new password</h1>
      </div>

      {done ? (
        <div className="text-center space-y-4">
          <p className="text-sm text-ink leading-relaxed">Your password has been updated.</p>
          <button type="button" onClick={() => navigate('/login')} className="btn-pop w-full py-3.5">
            Go to log in
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-inkSoft uppercase tracking-wide">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-lavender bg-white px-4 py-3 text-sm focus:border-slate outline-none"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-inkSoft uppercase tracking-wide">Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-lavender bg-white px-4 py-3 text-sm focus:border-slate outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-danger-dark font-medium">{error}</p>}

          <button type="submit" disabled={loading} className="btn-pop w-full py-3.5 mt-2">
            {loading ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      )}
    </div>
  );
}
