import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TopBar from '../components/TopBar.jsx';
import { checkAnswer, isJunkGuess } from '../utils/answerMatch.js';
import { BOOST_THEME, DEFAULT_BOOST_THEME } from '../constants/moodColors.js';
import AutumnBreeze from '../components/AutumnBreeze.jsx';

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
  const [hovered, setHovered] = useState(null);

  // Background reacts to the emotion once picked; while still choosing, a
  // hover/tap preview lets the color respond even before committing - the
  // whole picker feels alive rather than just the end state.
  const previewKey = emotion?.key || hovered;
  const theme = BOOST_THEME[previewKey] || DEFAULT_BOOST_THEME;

  return (
    <div className={`boost-page relative min-h-screen overflow-hidden bg-gradient-to-b ${theme.bg} transition-colors duration-700 ease-in-out`}>
      <AutumnBreeze />
      <div className="relative max-w-md mx-auto pb-28">
        <TopBar
          className="bg-orange-100/80 border-orange-200/70 shadow-sm"
          title={<span>Mood <span className={theme.accent}>Boost</span></span>}
          subtitle={
            <span className="inline-flex whitespace-nowrap rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-400 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
              A quick reset when you need it
            </span>
          }
        />

        <main className="px-5 pt-6 space-y-6">
          {!emotion ? (
            <>
              <p className="font-display text-lg font-semibold text-center">How are you feeling right now?</p>
              <div className="grid grid-cols-2 gap-3">
                {EMOTIONS.map((e) => {
                  const optTheme = BOOST_THEME[e.key];
                  return (
                    <button
                      key={e.key}
                      type="button"
                      onClick={() => setEmotion(e)}
                      onMouseEnter={() => setHovered(e.key)}
                      onMouseLeave={() => setHovered((h) => (h === e.key ? null : h))}
                      onTouchStart={() => setHovered(e.key)}
                      className={`journal-card text-center py-5 active:scale-95 transition-all duration-300 ease-out border-2 ${
                        hovered === e.key ? optTheme.card : 'border-transparent'
                      }`}
                    >
                      <p className="text-3xl mb-1">{e.emoji}</p>
                      <p className={`text-sm font-semibold transition-colors duration-300 ease-out ${hovered === e.key ? optTheme.accent : ''}`}>{e.label}</p>
                    </button>
                  );
                })}
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
                onClick={() => { setEmotion(null); setHovered(null); }}
                className="w-full text-center text-xs font-semibold text-inkSoft py-2"
              >
                Choose a different feeling
              </button>
            </>
          )}
        </main>
      </div>
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
    if (!userAnswer.trim() || isJunkGuess(userAnswer) || !puzzle) return;
    try {
      const data = await api.getPuzzleAnswer(accessToken, puzzle.id);
      setAnswer({ ...data, isCorrect: checkAnswer(userAnswer, data.answer) });
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
              <div className={`rounded-2xl px-4 py-3 ${answer.isCorrect ? 'bg-lime-100' : 'bg-lavender-light'}`}>
                <p className="text-xs font-semibold text-inkSoft mb-1">
                  {answer.isCorrect ? '✅ Correct! Your answer' : 'Your answer'}
                </p>
                <p className="text-sm text-ink leading-relaxed">{userAnswer}</p>
              </div>
              <div className="rounded-2xl bg-paperDim px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-ink">Answer: {answer.answer}</p>
                <p className="text-xs text-inkSoft leading-relaxed">{answer.explain}</p>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={reveal}
                disabled={!userAnswer.trim() || isJunkGuess(userAnswer)}
                className="btn-pop w-full py-2 text-sm disabled:opacity-50"
              >
                Reveal answer
              </button>
              {userAnswer.trim() && isJunkGuess(userAnswer) && (
                <p className="text-xs text-inkSoft mt-1.5">Give it a real guess first - even a rough one is fine.</p>
              )}
            </>
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
    if (!guess.trim() || isJunkGuess(guess) || !song) return;
    try {
      const data = await api.getSongAnswer(accessToken, song.id);
      setAnswer({ ...data, isCorrect: checkAnswer(guess, data.songName) });
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
            <div className={`rounded-2xl px-4 py-3 space-y-1 mb-3 ${answer.isCorrect ? 'bg-lime-100' : 'bg-paperDim'}`}>
              {answer.isCorrect && <p className="text-xs font-semibold text-lime-700">✅ Correct!</p>}
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
            <>
              <button
                type="button"
                onClick={reveal}
                disabled={!guess.trim() || isJunkGuess(guess)}
                className="btn-pop w-full py-2 text-sm disabled:opacity-50"
              >
                Reveal answer
              </button>
              <p className="text-xs text-inkSoft mt-1.5 mb-3 min-h-[1em]">
                {guess.trim() && isJunkGuess(guess) ? 'Give it a real guess first - even a rough one is fine.' : ''}
              </p>
            </>
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

// Soft singing-bowl "ting", synthesized with Web Audio so there's no audio
// file to ship: a few inharmonic partials with long exponential decays.
let audioCtx = null;
function playTing() {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const master = audioCtx.createGain();
    master.gain.value = 0.35;
    master.connect(audioCtx.destination);
    [[528, 1, 4.5], [528 * 2.76, 0.35, 2.5], [528 * 5.4, 0.12, 1.2]].forEach(([freq, level, decay]) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(level, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      osc.connect(gain).connect(master);
      osc.start(now);
      osc.stop(now + decay + 0.1);
    });
  } catch {
    // Audio unavailable (old browser / blocked) - the exercise works silently.
  }
}

// Calm dusk scene - sky, sun, layered hills and a still lake - shown behind
// the breathing circle while the exercise runs.
function PeacefulScene() {
  return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="calm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="55%" stopColor="#FBCFE8" />
          <stop offset="100%" stopColor="#FED7AA" />
        </linearGradient>
        <linearGradient id="calm-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A5B4FC" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#calm-sky)" />
      <circle cx="160" cy="118" r="34" fill="#FFF7ED" opacity="0.9" />
      <circle cx="160" cy="118" r="52" fill="#FFF7ED" opacity="0.25" />
      <path d="M0 128 Q60 88 120 118 T240 108 T320 116 V200 H0 Z" fill="#A78BFA" opacity="0.55" />
      <path d="M0 138 Q80 108 160 132 T320 126 V200 H0 Z" fill="#8B5CF6" opacity="0.55" />
      <rect y="140" width="320" height="60" fill="url(#calm-lake)" />
      <ellipse cx="160" cy="150" rx="30" ry="3" fill="#FFF7ED" opacity="0.6" />
      <ellipse cx="160" cy="160" rx="20" ry="2" fill="#FFF7ED" opacity="0.4" />
      <ellipse cx="160" cy="169" rx="11" ry="1.5" fill="#FFF7ED" opacity="0.3" />
      <path d="M58 58 q6 -5 12 0 q6 -5 12 0 M228 44 q5 -4 10 0 q5 -4 10 0" stroke="#6D28D9" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
    </svg>
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
          playTing();
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

  if (active) {
    return (
      <div className="journal-card relative overflow-hidden !p-0 text-center animate-popIn">
        <div className="relative h-60">
          <PeacefulScene />
          <div className="relative flex h-full flex-col items-center justify-center gap-2">
            <div className="w-20 h-20 rounded-full bg-amber-100/40 border-2 border-amber-100/80 backdrop-blur-sm shadow-lg animate-breathe" />
            <p className="mt-3 font-display text-lg font-semibold text-white drop-shadow">{phase}…</p>
            <p className="text-xs font-mono text-white/90 drop-shadow">{secondsLeft}s left</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="journal-card text-center">
      <p className="section-label mb-3">30-second breathing</p>
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="w-20 h-20 rounded-full bg-slate-light border-2 border-slate" />
        <button
          type="button"
          onClick={() => {
            playTing();
            setSecondsLeft(30);
            setPhase('Breathe in');
            setActive(true);
          }}
          className="btn-pop px-5 py-2 text-sm"
        >
          Start
        </button>
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
