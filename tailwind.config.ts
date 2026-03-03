/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--brand-primary)',
          light:   'var(--brand-light)',
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: 'var(--brand-light)',
          500: 'var(--brand-primary)',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        pitch: {
          dark:   'var(--bg-base)',
          card:   'var(--bg-card)',
          border: 'var(--bg-border)',
          muted:  'var(--bg-muted)',
        },
        score: {
          four:   'var(--score-four)',
          six:    'var(--score-six)',
          wicket: 'var(--score-wicket)',
          wide:   'var(--score-wide)',
          noball: 'var(--score-noball)',
          dot:    '#6b7280',
        },
      },

      fontFamily: {
        display: ['var(--font-rajdhani)', 'sans-serif'],
        body:    ['var(--font-inter)', 'sans-serif'],
        mono:    ['var(--font-jetbrains)', 'monospace'],
      },

      backgroundImage: {
        'pitch-gradient':
          'linear-gradient(135deg, #0a1628 0%, #0f2744 50%, #0a1628 100%)',
        'card-gradient':
          'linear-gradient(145deg, #0f1f3d 0%, #0a1628 100%)',
        'live-pulse':
          'radial-gradient(circle at center, rgba(34,197,94,0.15) 0%, transparent 70%)',
      },

      animation: {
        'pulse-live': 'pulse-live 2s ease-in-out infinite',
        'slide-up':   'slide-up 0.3s ease-out',
        'fade-in':    'fade-in 0.4s ease-out',
        'score-pop':  'score-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },

      keyframes: {
        'pulse-live': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.5', transform: 'scale(0.95)' },
        },
        'slide-up': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to:   { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'score-pop': {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(1.4)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};