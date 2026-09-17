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
  calm: "What's on your mind today?",
  frustrated: "What's making today feel a little challenging?",
  angry: 'What made you angry today?',
  upset: 'What upset you today?',
  anxious: "What's making you anxious today?",
  stressed: "What's stressing you out today?",
  sad: 'What made you sad today?',
  tired: 'What wore you out today?',
  grateful: 'What are you grateful for today?',
  funny: 'What happened that was actually funny?',
};

export default function Home() {
  const { accessToken } = useAuth();
  const [checking, setChecking] = useState(true);
  const [todayEntry, setTodayEntry] = useState(null);
  const [todayCount, setTodayCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(3);

  const [category, setCategory] = useState('calm');
  const [text, setText] = useState('');
  const [mood, setMood] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [composing, setComposing] = useState(false);
  const [stickerImage, setStickerImage] = useState(null);
  const [stickerLoading, setStickerLoading] = useState(false);
  const [humorLoading, setHumorLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const todayRes = await api.getTodayEntry(accessToken);
        setTodayEntry(todayRes.entry);
        setStickerImage(todayRes.entry?.sticker_image || null);
        setTodayCount(todayRes.count || 0);
        setDailyLimit(todayRes.limit || 3);
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
      setStickerImage(null);
      setTodayCount(data.count || todayCount + 1);
      setDailyLimit(data.limit || dailyLimit);
      setComposing(false);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleAnother() {
    setResult(null);
    setText('');
    setMood(3);
    setErrorMsg('');
    setStickerImage(null);
    setComposing(true);
  }

  async function handleRegenerateHumor(entryId) {
    setErrorMsg('');
    setHumorLoading(true);
    try {
      const data = await api.regenerateHumor(accessToken, entryId);
      setResult({ ...displayResult, ...data });
      setStickerImage(null);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setHumorLoading(false);
    }
  }

  async function handleGenerateSticker(entryId, regenerate = false) {
    setStickerLoading(true);
    try {
      const data = await api.generateSticker(accessToken, entryId, regenerate);
      setStickerImage(data.stickerImage);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setStickerLoading(false);
    }
  }

  const remaining = Math.max(dailyLimit - todayCount, 0);
  const atLimit = remaining <= 0;
  const displayResult = result || (todayEntry
    ? {
        entryId: todayEntry.entry_id,
        humor: todayEntry.humor_text,
        perspective: todayEntry.perspective_text,
        action: todayEntry.action_text,
        song: todayEntry.song_text,
        provider: todayEntry.humor_provider,
      }
    : null);
  const showForm = composing || !displayResult;

  return (
    <div className="max-w-md mx-auto pb-28">
      <TopBar
        title="MoodBooster"
        subtitle={<span className="text-blue-900 font-semibold">Your smile is just 3 minutes away.</span>}
        right={<StreakBadge count={todayCount} />}
      />

      <main className="px-5 pt-6 space-y-6">
        {checking ? (
          <LoadingDots label="Loading today" />
        ) : !showForm && displayResult ? (
          <>
            {atLimit ? (
              <div className="journal-card !shadow-none border-dashed text-center">
                <p className="text-2xl mb-1">✅</p>
                <p className="font-display text-lg font-semibold">You've used today's {dailyLimit} attempts</p>
                <p className="text-sm text-inkSoft mt-1">Come back tomorrow for a fresh reframe. Here's your latest:</p>
              </div>
            ) : (
              <p className="text-sm text-inkSoft text-center">{todayCount} of {dailyLimit} attempts used today</p>
            )}
            <ResultCard
              result={displayResult}
              stickerImage={stickerImage}
              stickerLoading={stickerLoading}
              onGenerateSticker={() => handleGenerateSticker(displayResult.entryId)}
              onRegenerateSticker={() => handleGenerateSticker(displayResult.entryId, true)}
              humorLoading={humorLoading}
              onRegenerateHumor={() => handleRegenerateHumor(displayResult.entryId)}
            />
            {!atLimit && (
              <button
                type="button"
                onClick={handleAnother}
                className="btn-pop w-full py-3 text-base"
              >
                Do another attempt ({remaining} left)
              </button>
            )}
          </>
        ) : (
          <>
            <div className="journal-card space-y-6">
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
                className="w-full rounded-2xl border border-lavender bg-paperDim px-4 py-3 text-sm leading-relaxed focus:border-slate outline-none resize-none"
              />

              <div>
                <p className="text-xs font-semibold text-inkSoft uppercase tracking-wide mb-2">
                  How are you feeling today? ⭐
                </p>
                <MoodSelector value={mood} onChange={setMood} />
              </div>

              {errorMsg && <p className="text-sm text-danger-dark font-medium">{errorMsg}</p>}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-pop w-full py-4 text-lg flex items-center justify-center gap-2"
              >
                {submitting ? 'Working on it…' : 'Get my boost'}
              </button>
            </div>

            {submitting && <LoadingDots label="Finding the funny side" />}
          </>
        )}
      </main>
    </div>
  );
}
