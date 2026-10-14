import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#05070a',
        brand: {
          cyan: '#22d3ee',
          green: '#30d158',
          amber: '#f5a524',
          red: '#e5484d',
          violet: '#8b5cf6',
        },
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.45)',
        glowCyan: '0 0 24px rgba(34, 211, 238, 0.30)',
        glowRed: '0 0 24px rgba(229, 72, 77, 0.35)',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(0.82)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-120%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pulseSoft: 'pulseSoft 1.8s ease-in-out infinite',
        slideDown: 'slideDown 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
        fadeUp: 'fadeUp 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
