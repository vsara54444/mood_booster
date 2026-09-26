// Per-category color identity so the app visually reacts to what the user
// picked instead of everything - chips, background, mood scale - staying one
// flat blue regardless of whether they're "calm" or "angry". Tailwind's
// default palette already ships every color used here, so no theme config
// changes are needed - the full class strings just need to appear literally
// somewhere in scanned source (they do, right here) for the JIT compiler to
// generate them.
// One step more saturated than the first pass (100->200, not 50->100) so the
// shift actually reads as a color change at a glance, not a faint tint you
// have to look for. "angry" specifically uses Tailwind's `red` family, not
// `rose` (rose reads as pink, not the vivid red people actually associate
// with anger).
//
// Every gradient below carries a /60 opacity so it's a translucent wash, not
// a solid fill - App.jsx paints a background illustration behind every page,
// and the whole point is for that image to stay vividly visible everywhere
// while the mood color still visibly shifts on top of it.
export const CATEGORY_THEME = {
  calm: { bg: 'from-sky-100/60 to-sky-200/60', chip: 'bg-sky-500 border-sky-500', text: 'text-sky-700' },
  frustrated: { bg: 'from-orange-100/60 to-orange-200/60', chip: 'bg-orange-500 border-orange-500', text: 'text-orange-700' },
  angry: { bg: 'from-red-200/60 to-red-300/60', chip: 'bg-red-600 border-red-600', text: 'text-red-700' },
  anxious: { bg: 'from-violet-100/60 to-violet-200/60', chip: 'bg-violet-500 border-violet-500', text: 'text-violet-700' },
  upset: { bg: 'from-indigo-100/60 to-indigo-200/60', chip: 'bg-indigo-500 border-indigo-500', text: 'text-indigo-700' },
  stressed: { bg: 'from-amber-100/60 to-amber-200/60', chip: 'bg-amber-500 border-amber-500', text: 'text-amber-700' },
  sad: { bg: 'from-blue-100/60 to-blue-200/60', chip: 'bg-blue-500 border-blue-500', text: 'text-blue-700' },
  tired: { bg: 'from-stone-100/60 to-stone-200/60', chip: 'bg-stone-500 border-stone-500', text: 'text-stone-700' },
  grateful: { bg: 'from-pink-100/60 to-pink-200/60', chip: 'bg-pink-500 border-pink-500', text: 'text-pink-700' },
  funny: { bg: 'from-yellow-100/60 to-yellow-200/60', chip: 'bg-yellow-500 border-yellow-500', text: 'text-yellow-700' },
};

export const DEFAULT_CATEGORY_THEME = CATEGORY_THEME.calm;

// Separate sentiment gradient (rough -> great) for the 1-5 mood scale, which
// tracks a different axis (how the day felt overall) than the category above.
export const MOOD_THEME = {
  1: { active: 'bg-rose-100 border-rose-400', text: 'text-rose-700' },
  2: { active: 'bg-orange-100 border-orange-400', text: 'text-orange-700' },
  3: { active: 'bg-amber-100 border-amber-400', text: 'text-amber-700' },
  4: { active: 'bg-lime-100 border-lime-400', text: 'text-lime-700' },
  5: { active: 'bg-emerald-100 border-emerald-400', text: 'text-emerald-700' },
};

// Story page theme, keyed by the most recently logged Tiny Win. Deliberately
// more restrained than CATEGORY_THEME above (50->100, not 100->200) - the
// Story page is a stats/report view ("professional" per product ask), so the
// color should read as a refined accent tying the page to what you just
// logged, not a mood-swing wash. bar/accent drive the progress bars and
// stat numbers; bg is the page gradient (also translucent, see note above).
export const TINY_WIN_THEME = {
  break: { bg: 'from-amber-200 via-amber-100 to-pink-100', accent: 'text-amber-700', bar: 'bg-amber-500', chipActive: 'bg-amber-100 border-amber-400' },
  learned: { bg: 'from-indigo-200 via-indigo-100 to-pink-100', accent: 'text-indigo-700', bar: 'bg-indigo-500', chipActive: 'bg-indigo-100 border-indigo-400' },
  laughed: { bg: 'from-yellow-200 via-yellow-100 to-pink-100', accent: 'text-yellow-700', bar: 'bg-yellow-500', chipActive: 'bg-yellow-100 border-yellow-400' },
  done: { bg: 'from-emerald-200 via-emerald-100 to-pink-100', accent: 'text-emerald-700', bar: 'bg-emerald-500', chipActive: 'bg-emerald-100 border-emerald-400' },
  helped: { bg: 'from-rose-200 via-rose-100 to-pink-100', accent: 'text-rose-700', bar: 'bg-rose-500', chipActive: 'bg-rose-100 border-rose-400' },
  self_care: { bg: 'from-teal-200 via-teal-100 to-pink-100', accent: 'text-teal-700', bar: 'bg-teal-500', chipActive: 'bg-teal-100 border-teal-400' },
  other: { bg: 'from-violet-200 via-violet-100 to-pink-100', accent: 'text-violet-700', bar: 'bg-violet-500', chipActive: 'bg-violet-100 border-violet-400' },
};

// Neutral baseline before any Tiny Win has ever been logged.
export const DEFAULT_STORY_THEME = { bg: 'from-amber-200 via-orange-100 to-pink-100', accent: 'text-slate-dark', bar: 'bg-slate', chipActive: 'bg-slate-light border-slate' };

// Boost page theme, keyed by the emotion picked on "How are you feeling right
// now?". Same intensity as CATEGORY_THEME (100->200) since this is the same
// kind of "reactive to what you just tapped" surface as Home, not the
// Story page's more restrained report-style accent. Shares color language
// with CATEGORY_THEME for the emotions both pages have (angry/sad/anxious/
// stressed/tired) so the same feeling reads as the same color app-wide.
export const BOOST_THEME = {
  stressed: { bg: 'from-amber-300 via-orange-100 to-yellow-100', card: 'border-amber-300', accent: 'text-amber-700' },
  sad: { bg: 'from-sky-300 via-blue-100 to-indigo-100', card: 'border-blue-300', accent: 'text-blue-700' },
  angry: { bg: 'from-red-300 via-rose-100 to-orange-100', card: 'border-red-400', accent: 'text-red-700' },
  anxious: { bg: 'from-violet-300 via-purple-100 to-pink-100', card: 'border-violet-300', accent: 'text-violet-700' },
  tired: { bg: 'from-cyan-300 via-sky-100 to-indigo-100', card: 'border-stone-300', accent: 'text-stone-700' },
  bored: { bg: 'from-fuchsia-300 via-pink-100 to-orange-100', card: 'border-gray-300', accent: 'text-gray-700' },
  happy: { bg: 'from-emerald-300 via-lime-100 to-yellow-100', card: 'border-emerald-300', accent: 'text-emerald-700' },
};

export const DEFAULT_BOOST_THEME = { bg: 'from-fuchsia-300 via-pink-100 to-amber-100', card: 'border-lavender', accent: 'text-ink' };
