import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TopBar from '../components/TopBar.jsx';
import LoadingDots from '../components/LoadingDots.jsx';
import { TINY_WIN_THEME, DEFAULT_STORY_THEME } from '../constants/moodColors.js';
import FlowerBackground from '../components/FlowerBackground.jsx';

const TINY_WIN_OPTIONS = [
  { key: 'break', emoji: '☕', label: 'Took a break' },
  { key: 'learned', emoji: '📚', label: 'Learned something' },
  { key: 'laughed', emoji: '😂', label: 'Laughed' },
  { key: 'done', emoji: '🏃', label: 'Got something done' },
  { key: 'helped', emoji: '❤️', label: 'Helped someone' },
  { key: 'self_care', emoji: '🌱', label: 'Took care of myself' },
  { key: 'other', emoji: '✨', label: 'Something else' },
];

const MOOD_LABELS = { 1: '😩', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };
const PERSONALIZED_SUMMARY = {
  happy: "You've mostly been in good spirits this week 😊",
  neutral: "This week's been calm and even-keeled 😐",
  stressed: 'This week leaned heavy — be gentle with yourself 😫',
};

export default function StorySoFar() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [view, setView] = useState('weekly'); // 'weekly' | 'monthly'

  const [tinyWinSummary, setTinyWinSummary] = useState(null);
  const [justLogged, setJustLogged] = useState(null);

  async function loadTinyWinSummary() {
    try {
      const data = await api.getTinyWinsSummary(accessToken);
      setTinyWinSummary(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function logTinyWin(key) {
    setJustLogged(key);
    try {
      await api.logTinyWin(accessToken, key);
      loadTinyWinSummary();
    } catch (err) {
      console.error(err);
    }
    setTimeout(() => setJustLogged(null), 1500);
  }

  useEffect(() => {
    (async () => {
      try {
        const [s, w, m] = await Promise.all([
          api.getDashboardSummary(accessToken),
          api.getWeeklyReport(accessToken),
          api.getMonthlyReport(accessToken),
        ]);
        setSummary(s);
        setWeekly(w);
        setMonthly(m);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
    loadTinyWinSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // The page's ambient theme follows whichever Tiny Win is currently "in
  // focus" - the one just tapped, or otherwise the most recently logged one
  // on record, so the page still feels personalized on a fresh page load
  // and not just for the few seconds right after tapping a button.
  const activeWinType = justLogged || tinyWinSummary?.recent?.[0]?.win_type || null;
  const storyTheme = TINY_WIN_THEME[activeWinType] || DEFAULT_STORY_THEME;

  if (loading) {
    return (
      <div className="max-w-md mx-auto pb-28">
        <TopBar
          className={`bg-gradient-to-r ${storyTheme.bg} border-transparent shadow-sm`}
          title={<span className={storyTheme.accent}>The Story So Far</span>}
          subtitle={<span className="font-semibold text-ink/70">Your journey, reflected without judgment</span>}
        />
        <LoadingDots label="Pulling your story together" />
      </div>
    );
  }

  const report = view === 'weekly' ? weekly : monthly;

  const weekEntries = weekly.entries || [];
  const toKey = (d) => new Date(d).toISOString().slice(0, 10);
  const entryByDate = new Map(weekEntries.map((e) => [toKey(e.entry_date), e]));
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const buckets = weekEntries.reduce(
    (acc, e) => {
      if (e.mood >= 4) acc.happy += 1;
      else if (e.mood === 3) acc.neutral += 1;
      else acc.stressed += 1;
      return acc;
    },
    { happy: 0, neutral: 0, stressed: 0 }
  );
  const totalMoods = weekEntries.length;
  const pct = (n) => (totalMoods ? Math.round((n / totalMoods) * 100) : 0);
  const dominantMood = totalMoods
    ? Object.entries(buckets).sort((a, b) => b[1] - a[1])[0][0]
    : null;
  const personalizedSummary =
    PERSONALIZED_SUMMARY[dominantMood] || 'Check in a few times this week to start your mood journey.';

  return (
    <div className={`relative min-h-screen overflow-hidden bg-gradient-to-b ${storyTheme.bg} transition-colors duration-700`}>
      <FlowerBackground />
      <div className="relative max-w-md mx-auto pb-28">
        <TopBar
          className={`bg-gradient-to-r ${storyTheme.bg} border-transparent shadow-sm`}
          title={<span className={storyTheme.accent}>The Story So Far</span>}
          subtitle={<span className="font-semibold text-ink/70">Your journey, reflected without judgment</span>}
        />

        <main className="px-5 pt-6 space-y-6">
          <TinyWinCard summary={tinyWinSummary} justLogged={justLogged} onLog={logTinyWin} theme={storyTheme} />

          {/* Streak + quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="journal-card text-center">
              <p className="text-3xl">🔥</p>
              <p className="font-mono text-2xl font-bold mt-1">{summary.streak.CurrentStreak}</p>
              <p className="text-xs text-inkSoft">Day streak</p>
            </div>
            <div className="journal-card text-center">
              <p className="text-3xl">🏆</p>
              <p className="font-mono text-2xl font-bold mt-1">{summary.streak.LongestStreak}</p>
              <p className="text-xs text-inkSoft">Best streak</p>
            </div>
          </div>

          {/* Your Mood Journey */}
          <div className="journal-card">
            <p className="section-label mb-3">Your Mood Journey</p>

            <div className="flex justify-between gap-1 mb-4">
              {last7Days.map((d, i) => {
                const entry = entryByDate.get(toKey(d));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-lg">{entry ? MOOD_LABELS[entry.mood] : '·'}</span>
                    <span className="text-[10px] text-inkSoft">
                      {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>

            {totalMoods === 0 ? (
              <EmptyState text="No check-ins this week yet." />
            ) : (
              <div className="space-y-2.5 mb-3">
                <MoodBar emoji="😊" label="Happy" percent={pct(buckets.happy)} barClass="bg-emerald-500" />
                <MoodBar emoji="😐" label="Neutral" percent={pct(buckets.neutral)} barClass="bg-amber-500" />
                <MoodBar emoji="😫" label="Stressed" percent={pct(buckets.stressed)} barClass="bg-rose-500" />
              </div>
            )}

            <p className="text-sm text-center font-medium text-blue-dark">{personalizedSummary}</p>
          </div>

          {/* Weekly / Monthly toggle report */}
          <div className="journal-card">
            <div className="flex items-center justify-between mb-3">
              <p className="section-label">{view === 'weekly' ? 'Weekly summary' : 'Monthly growth report'}</p>
              <div className="flex gap-1 bg-paperDim rounded-full p-1">
                {['weekly', 'monthly'].map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      view === v ? 'bg-blue text-white' : 'text-inkSoft'
                    }`}
                  >
                    {v === 'weekly' ? 'Week' : 'Month'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-left mb-1">
              <div>
                <p className="font-mono text-xl font-bold">
                  {view === 'weekly' ? report.checkInsThisWeek : report.checkInsThisMonth}
                </p>
                <p className="text-xs text-inkSoft">Check-ins</p>
              </div>
              <div>
                <p className="font-mono text-xl font-bold">{report.averageMood ?? '—'}</p>
                <p className="text-xs text-inkSoft">Avg. mood (1-5)</p>
              </div>
              <div>
                <p className={`font-mono text-xl font-bold ${storyTheme.accent}`}>
                  {view === 'weekly' ? report.tinyWinsThisWeek : report.tinyWinsThisMonth}
                </p>
                <p className="text-xs text-inkSoft">Tiny wins</p>
              </div>
            </div>

            {view === 'monthly' && report.moodDelta !== null && (
              <p className="text-sm text-center mt-3 font-medium">
                {report.moodDelta > 0 && `📈 Mood trending up by ${report.moodDelta} this month - nice.`}
                {report.moodDelta < 0 && `📉 Mood dipped ${Math.abs(report.moodDelta)} this month. Be gentle with yourself.`}
                {report.moodDelta === 0 && `➡️ Mood's been steady this month.`}
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function MoodBar({ emoji, label, percent, barClass }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span>{emoji} {label}</span>
        <span className="font-mono text-xs text-inkSoft">{percent}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-paperDim overflow-hidden">
        <div
          className={`h-full rounded-full ${barClass} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="text-sm text-inkSoft text-center py-4">{text}</p>;
}

// Deliberately pressure-free: no streak, no daily limit, no "you missed a
// day" framing. One tap logs it and shows a quiet confirmation - the summary
// only ever counts up, never calls out a gap. State lives in the parent
// (StorySoFar) now, since the page's own background theme reacts to
// whichever Tiny Win is currently "in focus" - see storyTheme there.
function TinyWinCard({ summary, justLogged, onLog, theme }) {
  const lastLoggedKey = justLogged || summary?.recent?.[0]?.win_type || null;

  return (
    <div className="journal-card overflow-hidden">
      <div className="relative mb-1 flex items-center justify-between">
        <p className="section-label flex items-center gap-1.5">
          Tiny win
        </p>
      </div>
      <p className="text-sm text-inkSoft mb-3">What was your tiny win?</p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {TINY_WIN_OPTIONS.map((opt) => {
          const optTheme = TINY_WIN_THEME[opt.key];
          const isActive = opt.key === lastLoggedKey;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onLog(opt.key)}
              className={`journal-card !shadow-none text-left py-2.5 px-3 active:scale-95 transition-all flex items-center gap-2 ${
                isActive ? `${optTheme.chipActive} border` : ''
              }`}
            >
              <span className="text-lg">{opt.emoji}</span>
              <span className={`text-xs font-medium leading-tight ${isActive ? optTheme.accent : ''}`}>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {justLogged && (
        <p className={`text-xs font-semibold text-center mb-2 ${theme.accent}`}>Logged ✨ nice one.</p>
      )}

      {summary && summary.total > 0 && (
        <p className="relative mx-auto w-fit rounded-full bg-gradient-to-r from-amber-400 to-pink-500 px-3.5 py-1 text-xs font-bold text-white shadow-pop">
          {summary.thisWeek} tiny win{summary.thisWeek === 1 ? '' : 's'} this week · {summary.total} total
        </p>
      )}
    </div>
  );
}
