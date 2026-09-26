/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F8FAFC',
        paperDim: '#EEF2F7',
        ink: '#0F172A',
        inkSoft: '#64748B',
        blue: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          light: '#DBEAFE',
        },
        slate: {
          DEFAULT: '#475569',
          dark: '#334155',
          light: '#E2E8F0',
        },
        danger: {
          DEFAULT: '#DC2626',
          dark: '#B91C1C',
          light: '#FEE2E2',
        },
        butter: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
        },
        lavender: {
          DEFAULT: '#E2E8F0',
          light: '#F1F5F9',
        },
      },
      fontFamily: {
        display: [
          '"Baloo 2"',
          '"Noto Sans Tamil"',
          '"Noto Sans Telugu"',
          '"Noto Sans Kannada"',
          '"Noto Sans Malayalam"',
          '"Noto Sans Devanagari"',
          'sans-serif',
        ],
        body: [
          'Inter',
          '"Noto Sans Tamil"',
          '"Noto Sans Telugu"',
          '"Noto Sans Kannada"',
          '"Noto Sans Malayalam"',
          '"Noto Sans Devanagari"',
          'sans-serif',
        ],
        mono: ['"Space Mono"', 'monospace'],
        fun: ['Fredoka', '"Baloo 2"', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.05), 0 12px 24px -16px rgba(15, 23, 42, 0.25)',
        pop: '0 4px 10px -2px rgba(15, 23, 42, 0.2)',
        popTeal: '0 4px 10px -2px rgba(15, 23, 42, 0.2)',
      },
      keyframes: {
        popIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceTap: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(2px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1deg)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.35)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(var(--float-rot, 0deg))' },
          '50%': { transform: 'translateY(-10px) rotate(var(--float-rot, 0deg))' },
        },
        // Cat leaning in from the screen edge and back out a little.
        peek: {
          '0%, 100%': { transform: 'translateX(-55%) rotate(32deg)' },
          '50%': { transform: 'translateX(-38%) rotate(22deg)' },
        },
        // Wandering 2D drift with a little wobble, for the emoji stickers.
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(var(--drift-rot, 0deg)) scale(1)' },
          '25%': { transform: 'translate(var(--drift-x), calc(var(--drift-y) * 0.4)) rotate(calc(var(--drift-rot, 0deg) + 6deg)) scale(1.04)' },
          '50%': { transform: 'translate(calc(var(--drift-x) * 0.3), var(--drift-y)) rotate(var(--drift-rot, 0deg)) scale(1)' },
          '75%': { transform: 'translate(calc(var(--drift-x) * -0.5), calc(var(--drift-y) * 0.5)) rotate(calc(var(--drift-rot, 0deg) - 6deg)) scale(0.97)' },
        },
      },
      animation: {
        popIn: 'popIn 0.25s ease-out',
        bounceTap: 'bounceTap 0.15s ease-in-out',
        wiggle: 'wiggle 4s ease-in-out infinite',
        breathe: 'breathe 4s ease-in-out infinite',
        float: 'float 5s ease-in-out infinite',
        drift: 'drift 8s ease-in-out infinite',
        peek: 'peek 4.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
