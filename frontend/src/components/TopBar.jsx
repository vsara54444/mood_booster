import React from 'react';

// `className` swaps out the default plain paper background (Home passes its
// mood-colored one); `icon` sits to the left of the title.
export default function TopBar({ title, subtitle, right, icon, className = 'bg-paper/95 border-lavender/50' }) {
  return (
    <header className={`pt-safe sticky top-0 z-20 backdrop-blur border-b transition-colors duration-700 ${className}`}>
      <div className="max-w-md mx-auto px-4 min-[360px]:px-5 pt-4 pb-3 flex items-center justify-between gap-2 min-[360px]:gap-3">
        <div className="flex items-center gap-2 min-[360px]:gap-3 min-w-0">
          {icon}
          <div className="min-w-0">
            <h1 className="font-display text-xl min-[360px]:text-2xl font-semibold text-ink leading-tight">{title}</h1>
            {subtitle && <p className="text-sm text-inkSoft mt-1">{subtitle}</p>}
          </div>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  );
}
