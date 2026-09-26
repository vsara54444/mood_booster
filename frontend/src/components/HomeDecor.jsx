import React from 'react';

// Original, simple flat-shape decorations for the Home page - not a copy of
// any reference art, just basic geometric SVG (circles/paths) in the same
// warm, playful spirit: a sun, clouds, a cat silhouette, a leaf sprig.

export function SunDecor({ className = '' }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {[...Array(8)].map((_, i) => (
        <rect
          key={i}
          x="47"
          y="2"
          width="6"
          height="16"
          rx="3"
          fill="#FBBF24"
          transform={`rotate(${i * 45} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="26" fill="#FCD34D" />
      <circle cx="42" cy="46" r="3" fill="#78350F" />
      <circle cx="58" cy="46" r="3" fill="#78350F" />
      <path d="M40 58 Q50 66 60 58" stroke="#78350F" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="34" cy="54" r="4" fill="#FDBA74" opacity="0.6" />
      <circle cx="66" cy="54" r="4" fill="#FDBA74" opacity="0.6" />
    </svg>
  );
}

export function CloudDecor({ className = '', color = '#FFFFFF' }) {
  return (
    <svg viewBox="0 0 120 60" className={className} aria-hidden="true">
      <ellipse cx="30" cy="38" rx="22" ry="16" fill={color} />
      <ellipse cx="58" cy="28" rx="28" ry="20" fill={color} />
      <ellipse cx="88" cy="38" rx="20" ry="15" fill={color} />
      <rect x="20" y="34" width="80" height="20" rx="10" fill={color} />
    </svg>
  );
}

export function CatDecor({ className = '' }) {
  return (
    // Full-body sitting cat, front view, with a gently swaying tail.
    <svg viewBox="0 0 120 132" className={className} aria-hidden="true">
      <style>{`
        .cat-tail { transform-box: view-box; transform-origin: 86px 112px; animation: cat-tail 2.6s ease-in-out infinite; }
        @keyframes cat-tail { 0%, 100% { transform: rotate(-7deg); } 50% { transform: rotate(9deg); } }
        @media (prefers-reduced-motion: reduce) { .cat-tail { animation: none; } }
      `}</style>

      {/* Tail */}
      <g className="cat-tail">
        <path d="M84 114 C110 114 118 90 106 74 C101 67 94 70 98 77" stroke="#FBBF24" strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d="M108 86 L100 88 M111 97 L103 97" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Haunches + body */}
      <ellipse cx="36" cy="112" rx="14" ry="15" fill="#FDE68A" />
      <ellipse cx="84" cy="112" rx="14" ry="15" fill="#FDE68A" />
      <ellipse cx="60" cy="94" rx="30" ry="32" fill="#FDE68A" />
      <ellipse cx="60" cy="100" rx="17" ry="21" fill="#FEF3C7" />
      <path d="M33 88 Q40 90 37 97 M87 88 Q80 90 83 97 M31 100 Q38 101 36 107 M89 100 Q82 101 84 107" stroke="#F59E0B" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Front paws */}
      <ellipse cx="48" cy="123" rx="10" ry="7" fill="#FDE68A" />
      <ellipse cx="72" cy="123" rx="10" ry="7" fill="#FDE68A" />
      <path d="M45 121 L45 126 M51 121 L51 126 M69 121 L69 126 M75 121 L75 126" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />

      {/* Collar + bell */}
      <path d="M38 70 Q60 82 82 70" stroke="#F43F5E" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="60" cy="80" r="4.5" fill="#FACC15" stroke="#CA8A04" strokeWidth="1.2" />

      {/* Ears */}
      <path d="M34 36 L37 8 L56 26 Z" fill="#FDE68A" />
      <path d="M86 36 L83 8 L64 26 Z" fill="#FDE68A" />
      <path d="M38 30 L40 16 L50 26 Z" fill="#FCA5A5" />
      <path d="M82 30 L80 16 L70 26 Z" fill="#FCA5A5" />

      {/* Head */}
      <ellipse cx="60" cy="48" rx="31" ry="26" fill="#FDE68A" />
      <path d="M54 25 L55 32 M60 23 L60 31 M66 25 L65 32" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />

      {/* Face */}
      <circle cx="48" cy="47" r="4.8" fill="#78350F" />
      <circle cx="72" cy="47" r="4.8" fill="#78350F" />
      <circle cx="49.6" cy="45.4" r="1.6" fill="#fff" />
      <circle cx="73.6" cy="45.4" r="1.6" fill="#fff" />
      <circle cx="41" cy="57" r="5" fill="#FCA5A5" opacity="0.6" />
      <circle cx="79" cy="57" r="5" fill="#FCA5A5" opacity="0.6" />
      <path d="M57 55 L63 55 L60 58.5 Z" fill="#F472B6" />
      <path d="M54 60 Q57 64 60 60 Q63 64 66 60" stroke="#78350F" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M17 52 L38 55 M17 61 L38 59 M103 52 L82 55 M103 61 L82 59" stroke="#78350F" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function LeafDecor({ className = '', color = '#86EFAC' }) {
  return (
    <svg viewBox="0 0 80 100" className={className} aria-hidden="true">
      <path d="M40 100 C40 70 20 55 15 30 C40 35 55 55 50 85 Z" fill={color} />
      <path d="M40 100 C40 75 55 60 65 40 C50 42 38 58 40 85 Z" fill={color} opacity="0.85" />
      <path d="M40 95 L40 55" stroke="#16A34A" strokeWidth="2" opacity="0.5" />
    </svg>
  );
}

// Simple 4-point "sparkle" star - two crossed diamonds, the classic flat
// decorative star shape, drawn as a single original path.
export function StarDecor({ className = '', color = '#FBBF24' }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path
        d="M20 2 C20 12 12 20 2 20 C12 20 20 28 20 38 C20 28 28 20 38 20 C28 20 20 12 20 2 Z"
        fill={color}
      />
    </svg>
  );
}

// Bigger, more polished centerpiece face for the header - happy closed eyes,
// blush cheeks, a few soft radiating sparkle lines. An original design,
// built to carry more visual weight than the small corner sun.
export function HeroSmileyDecor({ className = '' }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      {[...Array(12)].map((_, i) => (
        <rect
          key={i}
          x="58"
          y="0"
          width="4"
          height={i % 3 === 0 ? 12 : 7}
          rx="2"
          fill="#FCD34D"
          opacity={i % 3 === 0 ? 0.9 : 0.55}
          transform={`rotate(${i * 30} 60 60)`}
        />
      ))}
      <circle cx="60" cy="60" r="38" fill="#FDE047" />
      <circle cx="60" cy="60" r="38" fill="url(#heroSmileyShine)" />
      <defs>
        <radialGradient id="heroSmileyShine" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M40 52 Q45 44 50 52" stroke="#78350F" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M70 52 Q75 44 80 52" stroke="#78350F" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="38" cy="66" r="7" fill="#FCA5A5" opacity="0.7" />
      <circle cx="82" cy="66" r="7" fill="#FCA5A5" opacity="0.7" />
      <path d="M42 68 Q60 86 78 68" stroke="#78350F" strokeWidth="4.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function HeartDecor({ className = '', color = '#F472B6' }) {
  return (
    <svg viewBox="0 0 40 36" className={className} aria-hidden="true">
      <path
        d="M20 34 C20 34 2 22 2 10.5 C2 3.5 8 -0.5 13.5 1.5 C17 3 20 7 20 7 C20 7 23 3 26.5 1.5 C32 -0.5 38 3.5 38 10.5 C38 22 20 34 20 34 Z"
        fill={color}
      />
    </svg>
  );
}
