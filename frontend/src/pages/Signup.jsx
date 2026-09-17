import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { USER_TYPES, MOTHER_TONGUES } from '../constants/userOptions.js';

export default function Signup() {
  const { signup, loading, error } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', displayName: '', userType: 'professional', motherTongue: 'other' });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await signup(form);
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
        <h1 className="font-display text-3xl font-semibold">Join MoodBooster</h1>
        <p className="text-sm text-inkSoft mt-1">Turn today's chaos into tomorrow's punchline.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-inkSoft uppercase tracking-wide">Name</label>
          <input
            value={form.displayName}
            onChange={(e) => update('displayName', e.target.value)}
            className="mt-1 w-full rounded-2xl border border-lavender bg-white px-4 py-3 text-sm focus:border-slate outline-none"
            placeholder="What should we call you?"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-inkSoft uppercase tracking-wide">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="mt-1 w-full rounded-2xl border border-lavender bg-white px-4 py-3 text-sm focus:border-slate outline-none"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-inkSoft uppercase tracking-wide">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className="mt-1 w-full rounded-2xl border border-lavender bg-white px-4 py-3 text-sm focus:border-slate outline-none"
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-inkSoft uppercase tracking-wide">You're mostly...</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {USER_TYPES.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => update('userType', t.value)}
                className={form.userType === t.value ? 'chip-active' : 'chip-inactive'}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-inkSoft uppercase tracking-wide">Mother tongue</label>
          <select
            value={form.motherTongue}
            onChange={(e) => update('motherTongue', e.target.value)}
            className="mt-2 w-full rounded-2xl border border-lavender bg-white px-4 py-3 text-sm font-medium focus:border-slate outline-none"
          >
            {MOTHER_TONGUES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-inkSoft mt-1">
            Pick language to get your humor reframe.
          </p>
        </div>

        {error && <p className="text-sm text-danger-dark font-medium">{error}</p>}

        <button type="submit" disabled={loading} className="btn-pop w-full py-3.5 mt-2">
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-[11px] text-inkSoft text-center leading-relaxed">
          By signing up you agree to our{' '}
          <Link to="/terms" className="underline">Terms</Link> and{' '}
          <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </form>

      <p className="text-center text-sm text-inkSoft mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-dark font-semibold">
          Log in
        </Link>
      </p>
    </div>
  );
}
