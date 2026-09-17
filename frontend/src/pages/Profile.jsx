import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TopBar from '../components/TopBar.jsx';
import Toggle from '../components/Toggle.jsx';
import LoadingDots from '../components/LoadingDots.jsx';
import ChipListInput from '../components/ChipListInput.jsx';
import { USER_TYPES, MOTHER_TONGUES, FAVORITE_CATEGORIES } from '../constants/userOptions.js';

export default function Profile() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [profileData, interestsData] = await Promise.all([
          api.getProfile(accessToken),
          api.getInterests(accessToken),
        ]);
        setUser(profileData.user);
        const flat = {};
        for (const c of FAVORITE_CATEGORIES) {
          flat[c.key] = (interestsData.interests[c.key] || []).map((it) => it.itemName);
        }
        setFavorites(flat);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  async function saveFavorite(categoryKey, names) {
    setFavorites((f) => ({ ...f, [categoryKey]: names }));
    setSaving(true);
    try {
      await api.saveInterestCategory(accessToken, categoryKey, names.map((itemName) => ({ itemName })));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function save(patch) {
    const next = { ...user, ...patch };
    setUser(next);
    setSaving(true);
    try {
      await api.updateProfile(accessToken, {
        displayName: next.display_name,
        userType: next.user_type,
        motherTongue: next.mother_tongue,
        reminderTime: next.reminder_time,
        notificationsOn: next.notifications_on,
        shareDefault: next.share_default,
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

      <main className="px-5 pt-6 space-y-6">
        <div className="journal-card">
          <p className="section-label mb-3">About you</p>
          <label className="text-xs font-semibold text-inkSoft uppercase tracking-wide">Display name</label>
          <input
            value={user.display_name || ''}
            onChange={(e) => setUser({ ...user, display_name: e.target.value })}
            onBlur={() => save({ display_name: user.display_name })}
            className="mt-1 mb-3 w-full rounded-2xl border border-lavender bg-paperDim px-4 py-2.5 text-sm focus:border-slate outline-none"
          />
          <p className="text-xs text-inkSoft">{user.email}</p>
        </div>

        <div className="journal-card !p-4">
          <p className="section-label mb-2">You're mostly...</p>
          <div className="flex flex-wrap gap-2">
            {USER_TYPES.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => save({ user_type: t.value })}
                className={user.user_type === t.value ? 'chip-active' : 'chip-inactive'}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="journal-card !p-4">
          <p className="section-label mb-2">Mother tongue</p>
          <select
            value={user.mother_tongue || 'other'}
            onChange={(e) => save({ mother_tongue: e.target.value })}
            className="w-full rounded-2xl border border-lavender bg-paperDim px-4 py-2.5 text-sm font-medium focus:border-slate outline-none"
          >
            {MOTHER_TONGUES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-inkSoft mt-1">
            Pick language to get your humor reframe.
          </p>
        </div>

        <div className="journal-card !p-4 space-y-4">
          <div>
            <p className="section-label">Your favorites</p>
            <p className="text-[11px] text-inkSoft mt-0.5">
              We'll weave these into your humor and song picks when they genuinely fit - never forced.
            </p>
          </div>
          {FAVORITE_CATEGORIES.map((c) => (
            <div key={c.key}>
              <label className="text-xs font-semibold text-inkSoft uppercase tracking-wide">{c.label}</label>
              <div className="mt-1">
                <ChipListInput
                  items={favorites[c.key] || []}
                  onChange={(names) => saveFavorite(c.key, names)}
                  placeholder={c.placeholder}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="journal-card">
          <p className="section-label mb-1">3-Minute Mood Booster reminders</p>
          <Toggle
            checked={!!user.notifications_on}
            onChange={(v) => save({ notifications_on: v })}
            label="Daily nudge"
            description="A friendly poke if you haven't checked in yet today."
          />
        </div>

        <div className="journal-card">
          <p className="section-label mb-1">Privacy</p>
          <Toggle
            checked={!!user.share_default}
            onChange={(v) => save({ share_default: v })}
            label="Default to sharing anonymously"
            description="Pre-check the share box on new entries. You can always change it per entry. Names and companies are always stripped first."
          />
          <div className="flex gap-4 mt-2 text-xs">
            <Link to="/privacy" className="text-slate-dark font-semibold underline">Privacy Policy</Link>
            <Link to="/terms" className="text-slate-dark font-semibold underline">Terms of Service</Link>
          </div>
        </div>

        {saving && <p className="text-xs text-inkSoft text-center">Saving…</p>}
        {savedFlash && <p className="text-xs text-slate-dark text-center font-semibold">Saved ✓</p>}

        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-full py-3 rounded-2xl border border-lavender text-sm font-semibold text-inkSoft"
        >
          Log out
        </button>

        <div className="text-center pt-2">
          {!confirmingDelete ? (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="text-[11px] text-inkSoft/50 hover:text-inkSoft underline underline-offset-2"
            >
              Delete account
            </button>
          ) : (
            <div className="space-y-2 max-w-xs mx-auto">
              <p className="text-[11px] text-inkSoft leading-relaxed">
                Permanently deletes your entries, streak, and account. This can't be undone.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="text-[11px] font-semibold text-inkSoft underline underline-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-[11px] font-semibold text-danger-dark underline underline-offset-2"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete permanently'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
