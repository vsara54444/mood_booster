import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TopBar from '../components/TopBar.jsx';
import LoadingDots from '../components/LoadingDots.jsx';

const MOOD_LABELS = { 1: '😩', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };
const CATEGORY_LABELS = {
  frustrated: 'Frustration',
  angry: 'Anger',
  upset: 'Upset',
  tired: 'Tiredness',
  funny: 'Funny moments',
};

export default function StorySoFar() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [history, setHistory] = useState([]);
  const [view, setView] = useState('weekly'); // 'weekly' | 'monthly'

  useEffect(() => {
    (async () => {
      try {
        const [s, w, m, h] = await Promise.all([
          api.getDashboardSummary(accessToken),
          api.getWeeklyReport(accessToken),
          api.getMonthlyReport(accessToken),
          api.getHistory(accessToken),
        ]);
        setSummary(s);
        setWeekly(w);
        setMonthly(m);
        setHistory(h.entries);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto pb-28">
        <TopBar title="The Story So Far" subtitle="Your patterns, minus the judgment" />
        <LoadingDots label="Pulling your story together" />
      </div>
    );
  }

  const maxMood = 5;
  const report = view === 'weekly' ? weekly : monthly;

  return (
    <div className="max-w-md mx-auto pb-28">
      <TopBar title="The Story So Far" subtitle="Your patterns, minus the judgment" />

      <main className="px-5 pt-5 space-y-5">
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

        {/* Mood trend */}
        <div className="journal-card">
          <p className="font-display font-semibold mb-3">Mood, last 14 check-ins</p>
          {summary.moodTrend.length === 0 ? (
            <EmptyState text="No check-ins yet. Your trend line starts the day you do." />
          ) : (
            <div className="flex items-end gap-1.5 h-28">
              {summary.moodTrend.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div
                    className="w-full rounded-t-md bg-teal-light border border-teal/40"
                    style={{ height: `${(d.Mood / maxMood) * 100}%` }}
                  />
                  <span className="text-[10px]">{MOOD_LABELS[d.Mood]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top categories */}
        <div className="journal-card">
          <p className="font-display font-semibold mb-3">Most common frustration categories</p>
          {summary.topCategories.length === 0 ? (
            <EmptyState text="Categories will show up after a few check-ins." />
          ) : (
            <div className="space-y-2">
              {summary.topCategories.map((c) => (
                <div key={c.Category} className="flex items-center gap-3">
                  <span className="text-xs w-28 text-inkSoft shrink-0">{CATEGORY_LABELS[c.Category] || c.Category}</span>
                  <div className="flex-1 h-2.5 bg-paperDim rounded-full overflow-hidden">
                    <div
                      className="h-full bg-coral rounded-full"
                      style={{ width: `${(c.Count / summary.topCategories[0].Count) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs">{c.Count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly / Monthly toggle report */}
        <div className="journal-card">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-semibold">{view === 'weekly' ? 'Weekly summary' : 'Monthly growth report'}</p>
            <div className="flex gap-1 bg-paperDim rounded-full p-1">
              {['weekly', 'monthly'].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    view === v ? 'bg-coral text-white' : 'text-inkSoft'
                  }`}
                >
                  {v === 'weekly' ? 'Week' : 'Month'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center mb-1">
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
          </div>

          {view === 'monthly' && report.moodDelta !== null && (
            <p className="text-sm text-center mt-3 font-medium">
              {report.moodDelta > 0 && `📈 Mood trending up by ${report.moodDelta} this month - nice.`}
              {report.moodDelta < 0 && `📉 Mood dipped ${Math.abs(report.moodDelta)} this month. Be gentle with yourself.`}
              {report.moodDelta === 0 && `➡️ Mood's been steady this month.`}
            </p>
          )}
        </div>

        {/* Journal history */}
        <div>
          <p className="font-display font-semibold mb-3 px-1">Your journal pages</p>
          {history.length === 0 ? (
            <div className="journal-card">
              <EmptyState text="Your first entry will show up here right after you ReLOL it." />
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((e) => (
                <div key={e.EntryId} className="journal-card">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[11px] text-inkSoft">
                      {new Date(e.CreatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-lg">{MOOD_LABELS[e.Mood]}</span>
                  </div>
                  <p className="text-sm text-ink mb-2">{e.CleanedText}</p>
                  <p className="text-sm font-display font-semibold text-coral-dark">"{e.HumorText}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="text-sm text-inkSoft text-center py-4">{text}</p>;
}
