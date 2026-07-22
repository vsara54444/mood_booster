import React from 'react';

export default function StreakBadge({ count = 0 }) {
  return (
    <div className="flex items-center gap-1.5 bg-butter-light border border-butter rounded-full pl-2 pr-3 py-1.5">
      <span className="text-base leading-none">🔥</span>
      <span className="font-mono text-sm font-bold text-ink">{count}</span>
    </div>
  );
}
