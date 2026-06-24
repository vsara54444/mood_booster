import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TopBar from '../components/TopBar.jsx';
import StreakBadge from '../components/StreakBadge.jsx';
import CategoryChips, { CATEGORIES } from '../components/CategoryChips.jsx';
import MoodSelector from '../components/MoodSelector.jsx';
import ResultCard from '../components/ResultCard.jsx';
import LoadingDots from '../components/LoadingDots.jsx';

const PROMPTS = {
  frustrated: 'What frustrated you today?',
  angry: 'What made you angry today?',
  upset: 'What upset you today?',
  tired: 'What wore you out today?',
  funny: 'What happened that was actually funny?',
};

export default function Home() {
  const { accessToken } = useAuth();
  const [streak, setStreak] = useState(0);
  const [checking, setChecking] = useState(true);
  const [todayEntry, setTodayEntry] = useState(null);

  const [category, setCategory] = useState('frustrated');
  const [text, setText] = useState('');
  const [mood, setMood] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [todayRes, summaryRes] = await Promise.all([
          api.getTodayEntry(accessToken),
          api.getDashboardSummary(accessToken),
        ]);
        setTodayEntry(todayRes.entry);
        setStreak(summaryRes.streak?.CurrentStreak || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setChecking(false);
      }
    })();
  }, [accessToken]);

  async function handleSubmit() {
    setErrorMsg('');
    if (text.trim().length < 3) {
      setErrorMsg("Give us just a little more detail - even one sentence works.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.submitEntry(accessToken, { category, text, mood });
      setResult(data);
      setStreak((s) => s + 1);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleShare(entryId) {
    setSharing(true);
    try {
      await api.shareEntry(accessToken, entryId);
      setShared(true);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSharing(false);
    }
  }

  const displayResult = result || (todayEntry
    ? {
        entryId: todayEntry.EntryId,
        humor: todayEntry.HumorText,
        perspective: todayEntry.PerspectiveText,
        action: todayEntry.ActionText,
      }
    : null);
  const alreadyShared = todayEntry?.IsSharedAnonymously || shared;

  return (
    <div className="max-w-md mx-auto pb-28">
      <TopBar
        title="ReLOL"
        subtitle="Your 3-Minute Mood Booster"
        right={<StreakBadge count={streak} />}
      />

      <main className="px-5 pt-5 space-y-5">
        {checking ? (
          <LoadingDots label="Loading today" />
        ) : displayResult ? (
          <>
            {!result && (
              <div className="journal-card !shadow-none border-dashed text-center">
                <p className="text-2xl mb-1">✅</p>
                <p className="font-display text-lg font-semibold">You already did today's booster</p>
                <p className="text-sm text-inkSoft mt-1">Come back tomorrow for a fresh reframe. Here's today's again:</p>
              </div>
            )}
            <ResultCard
              result={displayResult}
              onShare={() => handleShare(displayResult.entryId)}
              sharing={sharing}
              shared={alreadyShared}
            />
          </>
        ) : (
          <>
            <div className="journal-card space-y-5">
              <div>
                <p className="font-display text-lg font-semibold mb-2">{PROMPTS[category]}</p>
                <CategoryChips value={category} onChange={setCategory} />
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Tell it like it happened. We'll clean it up and find the funny side."
                className="w-full rounded-2xl border border-lavender bg-paperDim px-4 py-3 text-sm leading-relaxed focus:border-teal outline-none resize-none"
              />

              <div>
                <p className="text-xs font-semibold text-inkSoft uppercase tracking-wide mb-2">
                  How's your mood right now?
                </p>
                <MoodSelector value={mood} onChange={setMood} />
              </div>

              {errorMsg && <p className="text-sm text-coral-dark font-medium">{errorMsg}</p>}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-pop w-full py-4 text-lg flex items-center justify-center gap-2 animate-wiggle disabled:animate-none"
              >
                {submitting ? 'Working on it…' : 'ReLOL it 😂'}
              </button>
            </div>

            {submitting && <LoadingDots label="Finding the funny side" />}
          </>
        )}
      </main>
    </div>
  );
}
