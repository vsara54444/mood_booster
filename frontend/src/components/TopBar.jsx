import React from 'react';

export default function TopBar({ title, subtitle, right }) {
  return (
    <header className="pt-safe sticky top-0 z-20 bg-paper/95 backdrop-blur border-b border-lavender/60">
      <div className="max-w-md mx-auto px-5 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-inkSoft mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}
