import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TopBar from '../components/TopBar.jsx';
import Toggle from '../components/Toggle.jsx';
import LoadingDots from '../components/LoadingDots.jsx';

export default function Profile() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getProfile(accessToken);
        setUser(data.user);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  async function save(patch) {
    const next = { ...user, ...patch };
    setUser(next);
    setSaving(true);
    try {
      await api.updateProfile(accessToken, {
        displayName: next.DisplayName,
        userType: next.UserType,
        reminderTime: next.ReminderTime,
        notificationsOn: next.NotificationsOn,
        shareDefault: next.ShareDefault,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteAccount(accessToken);
      logout();
      navigate('/login');
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto pb-28">
        <TopBar title="Profile" subtitle="Just for you - private by default" />
        <LoadingDots label="Loading your profile" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-28">
      <TopBar title="Profile" subtitle="Just for you - private by default" />

      <main className="px-5 pt-5 space-y-5">
        <div className="journal-card">
          <p className="font-display font-semibold mb-3">About you</p>
          <label className="text-xs font-semibold text-inkSoft uppercase tracking-wide">Display name</label>
          <input
            value={user.DisplayName || ''}
            onChange={(e) => setUser({ ...user, DisplayName: e.target.value })}
            onBlur={() => save({ DisplayName: user.DisplayName })}
            className="mt-1 mb-3 w-full rounded-2xl border border-lavender bg-paperDim px-4 py-2.5 text-sm focus:border-teal outline-none"
          />
          <p className="text-xs text-inkSoft">{user.Email}</p>
        </div>

        <div className="journal-card">
          <p className="font-display font-semibold mb-1">3-Minute Mood Booster reminders</p>
          <Toggle
            checked={!!user.NotificationsOn}
            onChange={(v) => save({ NotificationsOn: v })}
            label="Daily nudge"
            description="A friendly poke if you haven't checked in yet today."
          />
        </div>

        <div className="journal-card">
          <p className="font-display font-semibold mb-1">Privacy</p>
          <Toggle
            checked={!!user.ShareDefault}
            onChange={(v) => save({ ShareDefault: v })}
            label="Default to sharing anonymously"
            description="Pre-check the share box on new entries. You can always change it per entry. Names and companies are always stripped first."
          />
          <div className="flex gap-4 mt-2 text-xs">
            <Link to="/privacy" className="text-teal-dark font-semibold underline">Privacy Policy</Link>
            <Link to="/terms" className="text-teal-dark font-semibold underline">Terms of Service</Link>
          </div>
        </div>

        {saving && <p className="text-xs text-inkSoft text-center">Saving…</p>}
        {savedFlash && <p className="text-xs text-teal-dark text-center font-semibold">Saved ✓</p>}

        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-full py-3 rounded-2xl border border-lavender text-sm font-semibold text-inkSoft"
        >
          Log out
        </button>

        <div className="journal-card border-coral/40">
          <p className="font-display font-semibold text-coral-dark mb-1">Delete account</p>
          <p className="text-xs text-inkSoft mb-3">
            Permanently deletes your entries, streak, and account. This can't be undone. Anything you already shared
            anonymously stays in the feed, since it never contained identifying info to begin with.
          </p>
          {!confirmingDelete ? (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="w-full py-2.5 rounded-2xl bg-coral-light text-coral-dark text-sm font-semibold"
            >
              Delete my account
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold">Are you sure? This is permanent.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 py-2.5 rounded-2xl border border-lavender text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-2xl bg-coral text-white text-sm font-semibold"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
