import React from 'react';

// Calm static background: a few large autumn leaves resting at the page
// edges, partly off-screen. Parent needs `relative overflow-hidden`.
const MAPLE = 'M50 4 L57 22 L68 14 L66 32 L84 26 L76 42 L94 46 L78 56 L84 66 L64 64 L60 80 L53 70 L51 96 L49 96 L47 70 L40 80 L36 64 L16 66 L22 56 L6 46 L24 42 L16 26 L34 32 L32 14 L43 22 Z';
const MAPLE_VEINS = 'M50 94 V14 M50 60 L20 44 M50 60 L80 44 M50 48 L28 28 M50 48 L72 28 M50 70 L30 64 M50 70 L70 64';
const OAK = 'M50 4 C62 10 60 20 70 22 C78 26 70 36 78 42 C86 50 74 56 76 64 C78 74 64 74 58 82 C54 88 52 94 50 96 C48 94 46 88 42 82 C36 74 22 74 24 64 C26 56 14 50 22 42 C30 36 22 26 30 22 C40 20 38 10 50 4 Z';
const OAK_VEINS = 'M50 96 V10 M50 36 L32 28 M50 36 L68 28 M50 54 L28 48 M50 54 L72 48 M50 70 L34 68 M50 70 L66 68';

const LEAVES = [
  { shape: MAPLE, veins: MAPLE_VEINS, from: '#FB923C', to: '#DC2626', w: 170, top: '4%', left: '-14%', rot: -28, opacity: 0.55 },
  { shape: OAK, veins: OAK_VEINS, from: '#FCD34D', to: '#D97706', w: 140, top: '30%', right: '-12%', rot: 36, opacity: 0.5 },
  { shape: MAPLE, veins: MAPLE_VEINS, from: '#F59E0B', to: '#B45309', w: 150, top: '58%', left: '-12%', rot: 18, opacity: 0.45 },
  { shape: MAPLE, veins: MAPLE_VEINS, from: '#F87171', to: '#9A3412', w: 180, top: '80%', right: '-16%', rot: -40, opacity: 0.5 },
  { shape: OAK, veins: OAK_VEINS, from: '#FDBA74', to: '#C2410C', w: 90, top: '46%', left: '62%', rot: -12, opacity: 0.25 },
];

export default function AutumnBreeze() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {LEAVES.map((l, i) => (
        <svg
          key={i}
          viewBox="0 0 100 100"
          className="absolute drop-shadow-md"
          style={{ top: l.top, left: l.left, right: l.right, width: l.w, height: l.w, opacity: l.opacity, transform: `rotate(${l.rot}deg)` }}
        >
          <defs>
            <linearGradient id={`leaf-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={l.from} />
              <stop offset="100%" stopColor={l.to} />
            </linearGradient>
          </defs>
          <path d={l.shape} fill={`url(#leaf-grad-${i})`} strokeLinejoin="round" />
          <path d={l.veins} stroke="#7C2D12" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.45" />
        </svg>
      ))}
    </div>
  );
}
