import React from 'react';

export const CATEGORIES = [
  { value: 'frustrated', label: 'Frustrated me', emoji: '😤' },
  { value: 'angry', label: 'Made me angry', emoji: '😡' },
  { value: 'upset', label: 'Upset me', emoji: '😞' },
  { value: 'tired', label: 'Wore me out', emoji: '🥱' },
  { value: 'funny', label: 'Actually funny', emoji: '😂' },
];

export default function CategoryChips({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          className={value === c.value ? 'chip-active' : 'chip-inactive'}
        >
          <span className="mr-1">{c.emoji}</span>
          {c.label}
        </button>
      ))}
    </div>
  );
}
