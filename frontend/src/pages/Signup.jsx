import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const USER_TYPES = [
  { value: 'professional', label: 'Working professional' },
  { value: 'parent', label: 'Parent' },
  { value: 'student', label: 'Student' },
  { value: 'other', label: 'Just here for the laughs' },
];

export default function Signup() {
  const { signup, loading, error } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', displayName: '', userType: 'professional' });

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
        <p className="text-5xl mb-2">🎉</p>
        <h1 className="font-display text-3xl font-semibold">Join ReLOL</h1>
        <p className="text-sm text-inkSoft mt-1">Turn today's chaos into tomorrow's punchline.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-inkSoft uppercase tracking-wide">Name</label>
          <input
            value={form.displayName}
            onChange={(e) => update('displayName', e.target.value)}
            className="mt-1 w-full rounded-2xl border border-lavender bg-white px-4 py-3 text-sm focus:border-teal outline-none"
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
            className="mt-1 w-full rounded-2xl border border-lavender bg-white px-4 py-3 text-sm focus:border-teal outline-none"
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
            className="mt-1 w-full rounded-2xl border border-lavender bg-white px-4 py-3 text-sm focus:border-teal outline-none"
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

        {error && <p className="text-sm text-coral-dark font-medium">{error}</p>}

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
        <Link to="/login" className="text-coral-dark font-semibold">
          Log in
        </Link>
      </p>
    </div>
  );
}
