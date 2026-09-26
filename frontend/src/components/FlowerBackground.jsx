import React from 'react';

// Calm static background: a few large blossoms resting at the page edges,
// partly off-screen. Parent needs `relative overflow-hidden`.
const FLOWERS = [
  { petals: 6, from: '#F9A8D4', to: '#DB2777', center: '#FDE68A', w: 180, top: '3%', left: '-16%', rot: 10, opacity: 0.55 },
  { petals: 8, from: '#C4B5FD', to: '#7C3AED', center: '#FEF3C7', w: 150, top: '27%', right: '-14%', rot: -8, opacity: 0.5 },
  { petals: 5, from: '#FDBA74', to: '#EA580C', center: '#FEF08A', w: 160, top: '55%', left: '-14%', rot: 24, opacity: 0.45 },
  { petals: 6, from: '#FDA4AF', to: '#E11D48', center: '#FDE68A', w: 190, top: '79%', right: '-18%', rot: -18, opacity: 0.5 },
  { petals: 8, from: '#FDE68A', to: '#F59E0B', center: '#FB923C', w: 90, top: '44%', left: '64%', rot: 0, opacity: 0.25 },
];

export default function FlowerBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {FLOWERS.map((f, i) => (
        <svg
          key={i}
          viewBox="0 0 100 100"
          className="absolute drop-shadow-md"
          style={{ top: f.top, left: f.left, right: f.right, width: f.w, height: f.w, opacity: f.opacity, transform: `rotate(${f.rot}deg)` }}
        >
          <defs>
            <radialGradient id={`petal-grad-${i}`} cx="50%" cy="85%" r="80%">
              <stop offset="0%" stopColor={f.to} />
              <stop offset="100%" stopColor={f.from} />
            </radialGradient>
          </defs>
          {Array.from({ length: f.petals }, (_, p) => (
            <ellipse
              key={p}
              cx="50"
              cy="27"
              rx={f.petals > 6 ? 11 : 14}
              ry="24"
              fill={`url(#petal-grad-${i})`}
              transform={`rotate(${(360 / f.petals) * p} 50 50)`}
            />
          ))}
          <circle cx="50" cy="50" r="12" fill={f.center} />
          <circle cx="50" cy="50" r="12" fill="none" stroke={f.to} strokeWidth="1.5" opacity="0.4" />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx="50" cy="44" r="1.6" fill={f.to} opacity="0.55" transform={`rotate(${a} 50 50)`} />
          ))}
        </svg>
      ))}
    </div>
  );
}
