import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-semibold">Reset your password</h1>
        <p className="text-sm text-inkSoft mt-1">We'll email you a link to set a new one.</p>
      </div>

      {sent ? (
        <p className="text-sm text-ink text-center leading-relaxed">
          If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way.
          Check your inbox (and spam folder).
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-inkSoft uppercase tracking-wide">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-lavender bg-white px-4 py-3 text-sm focus:border-slate outline-none"
              placeholder="you@example.com"
            />
          </div>

          {error && <p className="text-sm text-danger-dark font-medium">{error}</p>}

          <button type="submit" disabled={loading} className="btn-pop w-full py-3.5 mt-2">
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-inkSoft mt-6">
        <Link to="/login" className="text-blue-dark font-semibold">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
