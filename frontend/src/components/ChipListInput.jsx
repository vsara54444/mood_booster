import React, { useState } from 'react';

export default function ChipListInput({ items, onChange, placeholder }) {
  const [value, setValue] = useState('');

  function add() {
    const trimmed = value.trim();
    if (!trimmed || items.includes(trimmed)) {
      setValue('');
      return;
    }
    onChange([...items, trimmed]);
    setValue('');
  }

  function remove(name) {
    onChange(items.filter((n) => n !== name));
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {items.map((name) => (
            <span key={name} className="chip-active inline-flex items-center gap-1.5">
              {name}
              <button
                type="button"
                onClick={() => remove(name)}
                className="text-white/80 hover:text-white leading-none"
                aria-label={`Remove ${name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-2xl border border-lavender bg-paperDim px-4 py-2 text-sm focus:border-slate outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="px-4 py-2 rounded-2xl bg-blue text-white text-sm font-semibold"
        >
          Add
        </button>
      </div>
    </div>
  );
}
