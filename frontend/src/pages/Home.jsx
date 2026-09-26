import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TopBar from '../components/TopBar.jsx';
import StreakBadge from '../components/StreakBadge.jsx';
import CategoryChips, { CATEGORIES } from '../components/CategoryChips.jsx';
import MoodSelector from '../components/MoodSelector.jsx';
import ResultCard from '../components/ResultCard.jsx';
import LoadingDots from '../components/LoadingDots.jsx';
import { CATEGORY_THEME, DEFAULT_CATEGORY_THEME } from '../constants/moodColors.js';
import { SunDecor, CloudDecor, CatDecor, LeafDecor, HeartDecor, HeroSmileyDecor } from '../components/HomeDecor.jsx';
import starSticker from '../assets/star-sticker.png';
import laughSticker from '../assets/sticker-laugh.png';
import sillySticker from '../assets/sticker-silly.png';
import coolSticker from '../assets/sticker-cool.png';
import heartSticker from '../assets/sticker-heart.png';

// Emoji stickers drifting around the page edges - each gets its own drift
// path, tilt and timing so the four never move in sync.
const EMOJI_STICKERS = [
  { src: laughSticker, top: '11%', left: '3%', w: 64, rot: '-10deg', dx: '14px', dy: '-18px', dur: '7.3s', delay: '0s' },
  { src: sillySticker, top: '31%', right: '2%', w: 58, rot: '12deg', dx: '-16px', dy: '-12px', dur: '8.6s', delay: '1.4s' },
  { src: heartSticker, top: '83%', right: '4%', w: 60, rot: '-14deg', dx: '-12px', dy: '-20px', dur: '7.9s', delay: '2.1s' },
];

// The sunglasses sticker is anchored below the "Get my boost" button instead
// of a page percentage, so it never ends up hidden behind the form cards.
const COOL_STICKER = { src: coolSticker, top: 'calc(100% + 28px)', right: '30%', w: 56, rot: '8deg', dx: '-14px', dy: '-8px', dur: '9.2s', delay: '0.7s' };

function FloatingSticker({ s }) {
  return (
    <img
      src={s.src}
      alt=""
      className="pointer-events-none absolute select-none drop-shadow-md animate-drift motion-reduce:animate-none"
      style={{
        top: s.top,
        bottom: s.bottom,
        left: s.left,
        right: s.right,
        width: `${s.w}px`,
        '--drift-rot': s.rot,
        '--drift-x': s.dx,
        '--drift-y': s.dy,
        transform: `rotate(${s.rot})`,
        animationDuration: s.dur,
        animationDelay: s.delay,
      }}
    />
  );
}

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
  const activeCategory = showForm ? category : (todayEntry?.category || category);
  const theme = CATEGORY_THEME[activeCategory] || DEFAULT_CATEGORY_THEME;

  // Cat peeking in from the left screen edge (-20px cancels the page's side
  // padding; the rest of its body is clipped off-screen) plus the sunglasses
  // sticker - placed just below whichever button ends the current view.
  const bottomDecor = (
    <>
      <div className="pointer-events-none absolute top-full mt-3 -left-5 w-28 overflow-visible">
        <CatDecor className="w-28 -translate-x-[45%] rotate-[28deg] animate-peek motion-reduce:animate-none" />
      </div>
      <FloatingSticker s={COOL_STICKER} />
    </>
  );

  return (
    <div className={`relative min-h-screen overflow-hidden bg-gradient-to-b ${theme.bg} transition-colors duration-700`}>
      <CloudDecor className="pointer-events-none absolute top-2 left-[-10%] w-40 opacity-70" />
      <CloudDecor className="pointer-events-none absolute top-16 right-[-15%] w-48 opacity-50" />
      <SunDecor className="pointer-events-none absolute top-24 right-[-8%] w-24 opacity-90" />
      <LeafDecor className="pointer-events-none absolute bottom-0 right-[-4%] w-20 opacity-80" />

      {/* Loosely floating stars, using the real star sticker asset - sizes,
          rotations, timing and positions are all deliberately un-round
          numbers so nothing reads as a measured grid. */}
      {[
        { top: '5.3%', left: '9.7%', w: 61, rot: '-11deg', delay: '0.4s', dur: '4.6s' },
        { top: '19.1%', right: '21.4%', w: 34, rot: '17deg', delay: '1.7s', dur: '5.8s' },
        { top: '38.6%', left: '2.1%', w: 45, rot: '-24deg', delay: '0.1s', dur: '5.1s' },
        { top: '52.8%', right: '6.3%', w: 52, rot: '9deg', delay: '2.4s', dur: '4.3s' },
        { top: '67.4%', left: '16.8%', w: 30, rot: '28deg', delay: '1.2s', dur: '6.2s' },
        { top: '76.9%', right: '13.9%', w: 40, rot: '-16deg', delay: '0.8s', dur: '5.4s' },
      ].map((s, i) => (
        <img
          key={i}
          src={starSticker}
          alt=""
          className="pointer-events-none absolute select-none"
          style={{
            top: s.top,
            left: s.left,
            right: s.right,
            width: `${s.w}px`,
            opacity: 0.85,
            transform: `rotate(${s.rot})`,
            animation: `float ${s.dur} ease-in-out infinite`,
            animationDelay: s.delay,
            '--float-rot': s.rot,
          }}
        />
      ))}

      {EMOJI_STICKERS.map((s, i) => (
        <FloatingSticker key={`emoji-${i}`} s={s} />
      ))}

      {/* Small floating quote tags near the bottom, same loose style as
          "Good Vibes Only" below. */}
      {[
        { text: 'Laugh it off', bottom: '176px', left: '27%', rot: '6deg', delay: '0.6s' },
        { text: "You've got this", bottom: '104px', right: '26%', rot: '-5deg', delay: '1.8s' },
        { text: 'Stay awesome', bottom: '84px', left: '30%', rot: '4deg', delay: '1.1s' },
      ].map((q) => (
        <div
          key={q.text}
          className="pointer-events-none absolute flex items-center gap-1 whitespace-nowrap text-[10px] font-bold text-ink/40 animate-float motion-reduce:animate-none"
          style={{ bottom: q.bottom, left: q.left, right: q.right, '--float-rot': q.rot, animationDelay: q.delay }}
        >
          <span>{q.text}</span>
          <HeartDecor className="w-3 shrink-0" />
        </div>
      ))}

      {/* "Good Vibes Only" - a loose floating sticker tag, not aligned text
          pinned to an edge. Sits off to the side, tilted, gently bobbing. */}
      <div
        className="pointer-events-none absolute top-[15%] right-[6%] flex items-center gap-1 whitespace-nowrap text-[10px] font-bold text-ink/40 animate-float"
        style={{ '--float-rot': '-8deg' }}
      >
        <span>Good Vibes Only</span>
        <HeartDecor className="w-3 shrink-0" />
      </div>

      <div className="relative max-w-md mx-auto pb-52">
        <TopBar
          className={`bg-white bg-gradient-to-r ${theme.bg} border-white/70 shadow-sm`}
          icon={
            <img
              src={starSticker}
              alt=""
              className="w-7 h-7 min-[360px]:w-9 min-[360px]:h-9 shrink-0 object-contain drop-shadow-md animate-wiggle motion-reduce:animate-none"
            />
          }
          title={
            <span className={`flex items-center gap-1.5 ${theme.text}`}>
              Mood Booster
              <img src={heartSticker} alt="" className="w-5 h-5 min-[360px]:w-6 min-[360px]:h-6 drop-shadow-sm" />
            </span>
          }
          subtitle={
            <span className={`inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold ${theme.text}`}>
              Small moments. Big smiles! ✨
            </span>
          }
          right={<StreakBadge count={todayCount} />}
        />

        <main className="relative px-5 pt-6 space-y-6">
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
              <div className="relative !mt-0">{bottomDecor}</div>
            </>
          ) : (
            <>
              <div className="space-y-6">
                <div>
                  <div className="relative flex items-center justify-center mb-2">
                    <span className="absolute -translate-x-16 text-base opacity-70" aria-hidden="true">✨</span>
                    <HeroSmileyDecor className="w-20 h-20" />
                    <span className="absolute translate-x-16 text-base opacity-70" aria-hidden="true">⭐</span>
                  </div>
                  <p className="font-display text-xl font-semibold text-center mb-4 text-ink">{PROMPTS[category]}</p>
                  <CategoryChips value={category} onChange={setCategory} />
                </div>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Tell it like it happened. We'll clean it up and find the funny side."
                  className="w-full rounded-2xl border-2 border-white/60 bg-white/85 backdrop-blur-sm px-4 py-3 text-sm leading-relaxed focus:border-blue outline-none resize-none shadow-pop"
                />

                <div className="rounded-2xl bg-white/60 backdrop-blur-sm px-4 py-3.5 shadow-pop">
                  <p className="font-display text-base font-bold text-ink text-center mb-3">
                    ✨ Choose Your Mood ✨
                  </p>
                  <MoodSelector value={mood} onChange={setMood} />
                </div>

                {errorMsg && <p className="text-sm text-danger-dark font-medium text-center">{errorMsg}</p>}

                <div className="relative">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn-pop w-full py-4 text-lg flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Working on it…' : 'Get my boost'}
                  </button>
                  {bottomDecor}
                </div>
              </div>

              {submitting && <LoadingDots label="Finding the funny side" />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
