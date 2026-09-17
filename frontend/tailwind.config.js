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
          'Inter',
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
      },
      animation: {
        popIn: 'popIn 0.25s ease-out',
        bounceTap: 'bounceTap 0.15s ease-in-out',
        wiggle: 'wiggle 4s ease-in-out infinite',
        breathe: 'breathe 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
