import React from 'react';
import { CloudDecor } from './HomeDecor.jsx';

// Light-sky backdrop for the Profile screen: medium clouds that stay put and
// smiling golden stars gently floating. Parent needs `relative
// overflow-hidden`; content should be `relative`.
const CLOUDS = [
  { top: '5%', left: '-4%', w: 110, opacity: 0.9 },
  { top: '16%', right: '-5%', w: 120, opacity: 0.85 },
  { top: '33%', left: '-6%', w: 100, opacity: 0.8 },
  { top: '49%', right: '-4%', w: 115, opacity: 0.85 },
  { top: '66%', left: '-5%', w: 105, opacity: 0.8 },
  { top: '82%', right: '-6%', w: 120, opacity: 0.85 },
];

const STARS = [
  { top: '3%', left: '42%', size: 26, rot: '10deg', dur: '4.8s', delay: '0s' },
  { top: '11%', left: '70%', size: 20, rot: '-12deg', dur: '5.6s', delay: '1.2s' },
  { top: '14%', left: '8%', size: 22, rot: '14deg', dur: '5.1s', delay: '0.6s' },
  { top: '24%', left: '55%', size: 18, rot: '-6deg', dur: '6.2s', delay: '2s' },
  { top: '28%', left: '84%', size: 24, rot: '8deg', dur: '4.5s', delay: '1.6s' },
  { top: '38%', left: '22%', size: 20, rot: '-18deg', dur: '5.8s', delay: '0.3s' },
  { top: '44%', left: '66%', size: 26, rot: '12deg', dur: '5.3s', delay: '2.4s' },
  { top: '54%', left: '6%', size: 22, rot: '-10deg', dur: '6s', delay: '1s' },
  { top: '60%', left: '44%', size: 18, rot: '16deg', dur: '4.9s', delay: '1.8s' },
  { top: '68%', left: '82%', size: 24, rot: '-14deg', dur: '5.5s', delay: '0.9s' },
  { top: '76%', left: '28%', size: 22, rot: '6deg', dur: '5.9s', delay: '2.2s' },
  { top: '86%', left: '60%', size: 26, rot: '-8deg', dur: '5.2s', delay: '0.4s' },
  { top: '93%', left: '12%', size: 20, rot: '18deg', dur: '4.7s', delay: '1.4s' },
  { top: '95%', left: '86%', size: 18, rot: '-16deg', dur: '6.1s', delay: '2.6s' },
];

// Golden star with a little smiling face.
function Star({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M12 1.8l3 6.1 6.8 1-4.9 4.7 1.2 6.7L12 17.1l-6.1 3.2 1.2-6.7L2.2 8.9l6.8-1z"
        fill="#FACC15"
        stroke="#EAB308"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <circle cx="10.1" cy="11.4" r="0.95" fill="#78350F" />
      <circle cx="13.9" cy="11.4" r="0.95" fill="#78350F" />
      <path d="M10.2 13.6 Q12 15.2 13.8 13.6" stroke="#78350F" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <circle cx="8.9" cy="13.2" r="0.9" fill="#FB923C" opacity="0.55" />
      <circle cx="15.1" cy="13.2" r="0.9" fill="#FB923C" opacity="0.55" />
    </svg>
  );
}

export default function ProfileBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {CLOUDS.map((c, i) => (
        <div key={`c${i}`} className="absolute" style={{ top: c.top, left: c.left, right: c.right, width: c.w, opacity: c.opacity }}>
          <CloudDecor className="w-full drop-shadow-sm" />
        </div>
      ))}
      {STARS.map((s, i) => (
        <span
          key={`s${i}`}
          className="absolute animate-float motion-reduce:animate-none"
          style={{ top: s.top, left: s.left, '--float-rot': s.rot, animationDuration: s.dur, animationDelay: s.delay }}
        >
          <Star size={s.size} />
        </span>
      ))}
    </div>
  );
}
