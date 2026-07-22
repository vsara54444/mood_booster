import React from 'react';

const MOODS = [
  { value: 1, emoji: '😩', label: 'Rough' },
  { value: 2, emoji: '😕', label: 'Meh' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
];

export default function MoodSelector({ value, onChange }) {
  return (
    <div className="flex justify-between gap-1">
      {MOODS.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl border transition-all
            ${value === m.value ? 'bg-teal-light border-teal scale-105' : 'bg-white border-lavender'}`}
        >
          <span className="text-2xl leading-none">{m.emoji}</span>
          <span className={`text-[10px] font-medium ${value === m.value ? 'text-teal-dark' : 'text-inkSoft'}`}>
            {m.label}
          </span>
        </button>
      ))}
    </div>
  );
}
