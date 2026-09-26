import React from 'react';
import { MOOD_THEME } from '../constants/moodColors.js';

const MOODS = [
  { value: 1, emoji: '😩', label: 'Rough' },
  { value: 2, emoji: '😕', label: 'Meh' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
];

// Every circle carries its own pastel color all the time (matching the
// reference's always-colored mood avatars), not just on selection -
// selection shows as a white ring + scale instead of a color swap.
export default function MoodSelector({ value, onChange }) {
  return (
    <div className="flex justify-between gap-2">
      {MOODS.map((m) => {
        const theme = MOOD_THEME[m.value];
        const isActive = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            className="flex-1 flex flex-col items-center gap-1.5"
          >
            <span
              className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 transition-all duration-200 ${theme.active} ${
                isActive ? 'ring-4 ring-white scale-110 shadow-pop border-transparent' : 'opacity-90'
              }`}
            >
              {m.emoji}
            </span>
            <span className={`text-[10px] font-semibold ${theme.text}`}>
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
