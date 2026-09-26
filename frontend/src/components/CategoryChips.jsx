import React from 'react';
import { CATEGORY_THEME } from '../constants/moodColors.js';

export const CATEGORIES = [
  { value: 'calm', label: 'Calm', emoji: '😌' },
  { value: 'frustrated', label: 'Frustrated', emoji: '😤' },
  { value: 'angry', label: 'Angry', emoji: '😡' },
  { value: 'anxious', label: 'Anxious', emoji: '😰' },
  { value: 'upset', label: 'Upset', emoji: '😞' },
  { value: 'stressed', label: 'Stressed', emoji: '😖' },
  { value: 'sad', label: 'Sad', emoji: '😢' },
  { value: 'tired', label: 'Tired', emoji: '🥱' },
  { value: 'grateful', label: 'Grateful', emoji: '🙏' },
  { value: 'funny', label: 'Funny', emoji: '😂' },
];

// Every box carries its own theme color ALL the time, selected or not - no
// white/gray "inactive" state. Selection shows as a white ring + slight
// scale instead of a color swap. Pills are sized to their own content
// (flex-wrap, not a stretched grid column) so short labels like "Calm" stay
// short instead of being stretched to match "Frustrated"'s width.
export default function CategoryChips({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((c) => {
        const theme = CATEGORY_THEME[c.value];
        const isActive = value === c.value;
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-white transition-all duration-200 active:scale-95 ${theme.chip} ${
              isActive ? 'ring-4 ring-white scale-[1.03] shadow-pop' : 'opacity-90'
            }`}
          >
            <span className="text-base leading-none">{c.emoji}</span>
            <span className="text-xs font-bold leading-tight whitespace-nowrap">{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
