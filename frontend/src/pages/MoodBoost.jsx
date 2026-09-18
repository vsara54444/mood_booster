import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TopBar from '../components/TopBar.jsx';

const EMOTIONS = [
  { key: 'stressed', label: 'Stressed', emoji: '😣' },
  { key: 'sad', label: 'Sad', emoji: '😢' },
  { key: 'angry', label: 'Angry', emoji: '😠' },
  { key: 'anxious', label: 'Anxious', emoji: '😰' },
  { key: 'tired', label: 'Tired', emoji: '😴' },
  { key: 'bored', label: 'Bored', emoji: '🥱' },
  { key: 'happy', label: 'Happy', emoji: '😊' },
];


function ytSearch(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}


const CHALLENGES = [
  'Stretch for 1 minute.',
  'Drink a full glass of water.',
  'Step outside and take 5 deep breaths of fresh air.',
  'Send a quick thank-you text to someone.',
  'Tidy one small area near you for 60 seconds.',
  'Write down one thing that went okay today.',
];

// Remembers the last item shown per card across days, so the first thing shown
// on a new day skips whatever was shown last on the previous day. Repeats
// within the same day are fine and untouched.
const LAST_SHOWN_PREFIX = 'relol_boost_last_';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayIndex(id) {
  try {
    const raw = localStorage.getItem(LAST_SHOWN_PREFIX + id);
    if (!raw) return null;
    const { date, index } = JSON.parse(raw);
    return date === todayKey() ? null : index;
  } catch {
    return null;
  }
}

function recordShownIndex(id, index) {
  try {
    localStorage.setItem(LAST_SHOWN_PREFIX + id, JSON.stringify({ date: todayKey(), index }));
  } catch {
    // localStorage unavailable (private browsing, quota) - not worth failing the page over
  }
}

export default function MoodBoost() {
  const { accessToken } = useAuth();
  const [emotion, setEmotion] = useState(null);

  return (
    <div className="max-w-md mx-auto pb-28">
      <TopBar title="Boost" subtitle="A quick reset when you need it" />

      <main className="px-5 pt-6 space-y-6">
        {!emotion ? (
          <>
            <p className="font-display text-lg font-semibold text-center">How are you feeling right now?</p>
            <div className="grid grid-cols-2 gap-3">
              {EMOTIONS.map((e) => (
                <button
                  key={e.key}
                  type="button"
                  onClick={() => setEmotion(e)}
                  className="journal-card text-center py-5 active:scale-95 transition-transform"
                >
                  <p className="text-3xl mb-1">{e.emoji}</p>
                  <p className="text-sm font-semibold">{e.label}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <BreathingCard />

            <PuzzleCard />

            <QuoteCard />

            <SongRiddleCard />

            <ShuffleCard id="challenge" title="Tiny challenge" items={CHALLENGES}>
              {(c) => <p className="text-sm text-ink leading-relaxed">{c}</p>}
            </ShuffleCard>

            <MoodCheck />

            <button
              type="button"
              onClick={() => setEmotion(null)}
              className="w-full text-center text-xs font-semibold text-inkSoft py-2"
            >
              Choose a different feeling
            </button>
          </>
        )}
      </main>
    </div>
  );
}

function ShuffleCard({ id, title, items, children }) {
  const [index, setIndex] = useState(() => {
    const yesterday = getYesterdayIndex(id);
    const candidates = items.map((_, i) => i).filter((i) => i !== yesterday || items.length === 1);
    return candidates[Math.floor(Math.random() * candidates.length)];
  });
  const safeIndex = items.length ? index % items.length : 0;

  useEffect(() => {
    recordShownIndex(id, safeIndex);
  }, [id, safeIndex]);

  function shuffle() {
    if (items.length <= 1) return;
    let next;
    do {
      next = Math.floor(Math.random() * items.length);
    } while (next === safeIndex);
    setIndex(next);
  }

  return (
    <div className="journal-card">
      <p className="section-label mb-2">{title}</p>
      {children(items[safeIndex])}
      <button type="button" onClick={shuffle} className="mt-3 text-xs font-semibold text-slate-dark">
        Try another ↻
      </button>
    </div>
  );
}

const PUZZLE_CATEGORIES = [
  { key: 'trivia', label: 'Trivia', emoji: '🧠' },
  { key: 'math', label: 'Math', emoji: '🔢' },
];

function PuzzleCard() {
  const { accessToken } = useAuth();
  const [category, setCategory] = useState(null);
  const [puzzle, setPuzzle] = useState(null); // { id, question }
  const [answer, setAnswer] = useState(null); // { answer, explain }, fetched only on reveal
  const [userAnswer, setUserAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Fetched in the background before the user even picks a category, so
  // tapping "Trivia"/"Math" feels instant instead of waiting on a network
  // round trip at that moment.
  const [prefetched, setPrefetched] = useState({});

  useEffect(() => {
    let cancelled = false;
    PUZZLE_CATEGORIES.forEach(({ key }) => {
      api.getRandomPuzzle(accessToken, key).then((data) => {
        if (!cancelled) setPrefetched((prev) => ({ ...prev, [key]: data }));
      }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [accessToken]);

  async function loadPuzzle(cat, excludeId) {
    setLoading(true);
    setLoadError(false);
    setAnswer(null);
    setUserAnswer('');
    try {
      const data = await api.getRandomPuzzle(accessToken, cat, excludeId);
      setPuzzle(data);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  function startPuzzle(cat) {
    setCategory(cat);
    setAnswer(null);
    setUserAnswer('');
    setLoadError(false);
    if (prefetched[cat]) {
      setPuzzle(prefetched[cat]);
      setPrefetched((prev) => ({ ...prev, [cat]: null }));
      api.getRandomPuzzle(accessToken, cat, prefetched[cat].id)
        .then((data) => setPrefetched((prev) => ({ ...prev, [cat]: data })))
        .catch(() => {});
    } else {
      loadPuzzle(cat, null);
    }
  }

  function tryAnother() {
    loadPuzzle(category, puzzle?.id);
  }

  function reset() {
    setCategory(null);
    setPuzzle(null);
    setAnswer(null);
    setUserAnswer('');
  }

  async function reveal() {
    if (!userAnswer.trim() || !puzzle) return;
    try {
      const data = await api.getPuzzleAnswer(accessToken, puzzle.id);
      setAnswer(data);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="journal-card">
      <p className="section-label mb-2">Brain puzzle</p>

      {!category ? (
        <>
          <p className="text-sm text-inkSoft mb-3">Pick a category to warm up your brain.</p>
          <div className="grid grid-cols-2 gap-2">
            {PUZZLE_CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => startPuzzle(c.key)}
                className="journal-card !shadow-none text-center py-3 active:scale-95 transition-transform"
              >
                <p className="text-2xl mb-1">{c.emoji}</p>
                <p className="text-xs font-semibold">{c.label}</p>
              </button>
            ))}
          </div>
        </>
      ) : loadError ? (
        <>
          <p className="text-sm text-inkSoft mb-3">Couldn't load a puzzle. Check your connection and try again.</p>
          <button type="button" onClick={() => loadPuzzle(category, null)} className="btn-pop w-full py-2 text-sm">
            Retry
          </button>
        </>
      ) : loading || !puzzle ? (
        <p className="text-sm text-inkSoft">Loading…</p>
      ) : (
        <>
          <p className="text-sm text-ink leading-relaxed mb-3">{puzzle.question}</p>

          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            disabled={!!answer}
            rows={2}
            placeholder="Type your answer here…"
            className="w-full rounded-2xl border border-lavender bg-paperDim px-4 py-3 text-sm leading-relaxed focus:border-slate outline-none resize-none mb-3 disabled:opacity-70"
          />

          {answer ? (
            <div className="space-y-2">
              <div className="rounded-2xl bg-lavender-light px-4 py-3">
                <p className="text-xs font-semibold text-inkSoft mb-1">Your answer</p>
                <p className="text-sm text-ink leading-relaxed">{userAnswer}</p>
              </div>
              <div className="rounded-2xl bg-paperDim px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-ink">Answer: {answer.answer}</p>
                <p className="text-xs text-inkSoft leading-relaxed">{answer.explain}</p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={reveal}
              disabled={!userAnswer.trim()}
              className="btn-pop w-full py-2 text-sm disabled:opacity-50"
            >
              Reveal answer
            </button>
          )}

          <div className="flex gap-4 mt-3">
            <button type="button" onClick={tryAnother} className="text-xs font-semibold text-slate-dark">
              Try another ↻
            </button>
            <button type="button" onClick={reset} className="text-xs font-semibold text-inkSoft">
              Change category
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Emoji clues + answers are pre-authored and stored in song_riddles (see
// scripts/seedSongs.js) - playing never triggers an AI call, same as PuzzleCard.
const SONG_LANGUAGES = [
  { key: 'tamil', label: 'Tamil' },
  { key: 'telugu', label: 'Telugu' },
];

function SongRiddleCard() {
  const { accessToken } = useAuth();
  const [motherTongue, setMotherTongue] = useState('tamil');
  const [song, setSong] = useState(null); // { id, emojiClue }
  const [answer, setAnswer] = useState(null); // { songName, movieName, singer }, fetched only on reveal
  const [guess, setGuess] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [prefetch, setPrefetch] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { user } = await api.getProfile(accessToken);
        setMotherTongue(SONG_LANGUAGES.some((l) => l.key === user.mother_tongue) ? user.mother_tongue : 'tamil');
      } catch (err) {
        console.error(err);
      }
    })();
  }, [accessToken]);

  async function load(language, excludeId) {
    setLoadError(false);
    setAnswer(null);
    setGuess('');
    try {
      const data = await api.getRandomSong(accessToken, language, excludeId);
      setSong(data);
      api.getRandomSong(accessToken, language, data.id).then(setPrefetch).catch(() => {});
    } catch (err) {
      console.error(err);
      setLoadError(true);
    }
  }

  useEffect(() => {
    setPrefetch(null);
    load(motherTongue, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, motherTongue]);

  function tryAnother() {
    if (prefetch) {
      setSong(prefetch);
      setPrefetch(null);
      setAnswer(null);
      setGuess('');
      api.getRandomSong(accessToken, motherTongue, prefetch.id).then(setPrefetch).catch(() => {});
    } else {
      load(motherTongue, song?.id);
    }
  }

  async function reveal() {
    if (!guess.trim() || !song) return;
    try {
      const data = await api.getSongAnswer(accessToken, song.id);
      setAnswer(data);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="journal-card">
      <div className="flex items-center justify-between mb-2">
        <p className="section-label">Guess the song</p>
        <div className="flex gap-1">
          {SONG_LANGUAGES.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setMotherTongue(l.key)}
              className={l.key === motherTongue ? 'chip-active' : 'chip-inactive'}
              style={{ padding: '2px 10px', fontSize: '11px' }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {loadError ? (
        <>
          <p className="text-sm text-inkSoft mb-3">Couldn't load a clue. Check your connection and try again.</p>
          <button type="button" onClick={() => load(motherTongue, null)} className="btn-pop w-full py-2 text-sm">
            Retry
          </button>
        </>
      ) : !song ? (
        <p className="text-sm text-inkSoft">Loading…</p>
      ) : (
        <>
          <p className="text-3xl tracking-wide mb-3">{song.emojiClue}</p>

          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            disabled={!!answer}
            placeholder="Your guess…"
            className="w-full rounded-2xl border border-lavender bg-paperDim px-4 py-3 text-sm leading-relaxed focus:border-slate outline-none mb-3 disabled:opacity-70"
          />

          {answer ? (
            <div className="rounded-2xl bg-paperDim px-4 py-3 space-y-1 mb-3">
              <p className="text-sm font-semibold text-ink">{answer.songName}</p>
              <p className="text-xs text-inkSoft leading-relaxed">
                {[answer.movieName, answer.singer].filter(Boolean).join(' — ')}
              </p>
              <a
                href={ytSearch([answer.songName, answer.movieName].filter(Boolean).join(' '))}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-blue-dark pt-1"
              >
                <span>▶</span> Listen on YouTube
              </a>
            </div>
          ) : (
            <button
              type="button"
              onClick={reveal}
              disabled={!guess.trim()}
              className="btn-pop w-full py-2 text-sm disabled:opacity-50 mb-3"
            >
              Reveal answer
            </button>
          )}

          <button type="button" onClick={tryAnother} className="text-xs font-semibold text-slate-dark">
            Try another ↻
          </button>
        </>
      )}
    </div>
  );
}

// Quotes are pre-authored and stored in the `quotes` table (see
// scripts/seedQuotes.js) - "Try another" is a plain DB read, no AI call.
function QuoteCard() {
  const { accessToken } = useAuth();
  const [quote, setQuote] = useState(null); // { id, text, author }
  const [prefetch, setPrefetch] = useState(null);

  async function load(excludeId) {
    try {
      const data = await api.getRandomQuote(accessToken, excludeId);
      setQuote(data);
      api.getRandomQuote(accessToken, data.id).then(setPrefetch).catch(() => {});
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  function tryAnother() {
    if (prefetch) {
      setQuote(prefetch);
      setPrefetch(null);
      api.getRandomQuote(accessToken, prefetch.id).then(setPrefetch).catch(() => {});
    } else {
      load(quote?.id);
    }
  }

  return (
    <div className="journal-card">
      <p className="section-label mb-2">Motivational quote</p>
      {quote ? (
        <p className="text-sm text-ink italic leading-relaxed">
          "{quote.text}"{quote.author ? <span className="not-italic text-inkSoft"> — {quote.author}</span> : null}
        </p>
      ) : (
        <p className="text-sm text-inkSoft">Loading…</p>
      )}
      <button type="button" onClick={tryAnother} className="mt-3 text-xs font-semibold text-slate-dark">
        Try another ↻
      </button>
    </div>
  );
}

function BreathingCard() {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState('Breathe in');
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    if (!active) return undefined;
    const phaseTimer = setInterval(() => {
      setPhase((p) => (p === 'Breathe in' ? 'Breathe out' : 'Breathe in'));
    }, 4000);
    const countdown = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setActive(false);
          return 30;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      clearInterval(phaseTimer);
      clearInterval(countdown);
    };
  }, [active]);

  return (
    <div className="journal-card text-center">
      <p className="section-label mb-3">30-second breathing</p>
      <div className="flex flex-col items-center gap-3 py-2">
        <div className={`w-20 h-20 rounded-full bg-slate-light border-2 border-slate ${active ? 'animate-breathe' : ''}`} />
        {active ? (
          <>
            <p className="text-sm font-medium text-slate-dark">{phase}…</p>
            <p className="text-xs text-inkSoft font-mono">{secondsLeft}s left</p>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setSecondsLeft(30);
              setPhase('Breathe in');
              setActive(true);
            }}
            className="btn-pop px-5 py-2 text-sm"
          >
            Start
          </button>
        )}
      </div>
    </div>
  );
}

function MoodCheck() {
  const [answer, setAnswer] = useState(null);

  return (
    <div className="journal-card text-center">
      <p className="section-label mb-3">Mood check: "Feeling any better?"</p>
      {answer ? (
        <p className="text-sm text-slate-dark font-medium">
          {answer === 'yes'
            ? 'Glad to hear it. Come back anytime you need a boost. 🎉'
            : "That's okay — take your time, or try another activity above. 💛"}
        </p>
      ) : (
        <div className="flex gap-3 justify-center">
          <button type="button" onClick={() => setAnswer('yes')} className="btn-pop px-5 py-2 text-sm">
            Yes 🎉
          </button>
          <button type="button" onClick={() => setAnswer('no')} className="chip-inactive">
            Not yet
          </button>
        </div>
      )}
    </div>
  );
}
