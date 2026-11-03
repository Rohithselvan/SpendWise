import type { Config } from 'tailwindcss';

/**
 * SpendWise design tokens.
 * Base: graphite greens (not pure black) so the emerald accent reads as part of the same family.
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Manrope Variable"', 'Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        ink: {
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          850: 'rgb(var(--ink-850) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
        },
        fg: {
          DEFAULT: 'rgb(var(--fg) / <alpha-value>)',
          muted: 'rgb(var(--fg-muted) / <alpha-value>)',
          subtle: 'rgb(var(--fg-subtle) / <alpha-value>)',
        },
        line: 'rgb(var(--line) / <alpha-value>)',
        emerald: {
          DEFAULT: '#2fd08a',
          50: '#e9fbf2',
          300: '#7ce8b6',
          400: '#46da99',
          500: '#2fd08a',
          600: '#1fae70',
          700: '#178a59',
          900: '#0b3a27',
        },
        // Transaction-type hues: chosen to be distinguishable for common colour-vision deficiencies
        tx: {
          expense: '#f2706b',
          income: '#2fd08a',
          transfer: '#7aa7ff',
          savings: '#e8c25a',
          investment: '#c08cf5',
        },
      },
      borderRadius: { xl: '14px', '2xl': '20px', '3xl': '28px' },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      keyframes: {
        'sheet-in': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop': { '0%': { transform: 'scale(.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
      animation: {
        'sheet-in': 'sheet-in 260ms cubic-bezier(.2,.8,.2,1)',
        'fade-in': 'fade-in 180ms ease-out',
        pop: 'pop 220ms cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
