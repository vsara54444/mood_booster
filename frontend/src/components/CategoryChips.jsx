import React from 'react';

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
          <span className="mr-0.5 text-xs">{c.emoji}</span>
          {c.label}
        </button>
      ))}
    </div>
  );
}
