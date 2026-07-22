/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FFF8F2',
        paperDim: '#F7EEE3',
        ink: '#2B2438',
        inkSoft: '#5B5468',
        coral: {
          DEFAULT: '#FF6B4A',
          dark: '#E2502F',
          light: '#FFE3DA',
        },
        teal: {
          DEFAULT: '#2D9B8F',
          dark: '#1F6F66',
          light: '#DCF2EF',
        },
        butter: {
          DEFAULT: '#FFC857',
          light: '#FFF1D2',
        },
        lavender: {
          DEFAULT: '#C9C2D9',
          light: '#EFEBF6',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      borderRadius: {
        card: '20px',
      },
      boxShadow: {
        card: '0 2px 0 rgba(43, 36, 56, 0.06), 0 12px 24px -16px rgba(43, 36, 56, 0.25)',
        pop: '0 4px 0 #E2502F',
        popTeal: '0 4px 0 #1F6F66',
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
      },
      animation: {
        popIn: 'popIn 0.25s ease-out',
        bounceTap: 'bounceTap 0.15s ease-in-out',
        wiggle: 'wiggle 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
