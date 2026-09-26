import React, { useState } from 'react';

// Eye toggle that reveals the raw password as plain text - purely a client-side
// UI convenience (see Login.jsx for why the actual "remember my password" is
// left to the browser's own password manager instead).
export default function PasswordInput({ id, name, autoComplete, required, minLength, value, onChange, placeholder, className = '' }) {
  const [visible, setVisible] = useState(false);
  const labelId = id ? `${id}-toggle` : undefined;

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        id={labelId}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className={`absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${
          visible ? 'text-blue' : 'text-inkSoft hover:text-ink'
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        </svg>
        {visible && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            className="absolute -bottom-0.5 -right-0.5 rounded-full bg-blue text-white p-0.5"
            style={{ boxSizing: 'content-box' }}
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
