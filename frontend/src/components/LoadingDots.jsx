import React from 'react';

export default function LoadingDots({ label = 'Cooking up your reframe' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-inkSoft">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-blue animate-bounce"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
      <p className="text-sm font-medium">{label}…</p>
    </div>
  );
}
