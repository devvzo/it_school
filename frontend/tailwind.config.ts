import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', 'BlinkMacSystemFont', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        tg: {
          bg: 'var(--tg-bg)',
          bgLight: 'var(--tg-bg-light)',
          bgSecondary: 'var(--tg-bg-secondary)',
          accent: 'var(--tg-accent)',
          accentSoft: 'var(--tg-accent-soft)',
          text: 'var(--tg-text)',
          muted: 'var(--tg-muted)',
          border: 'var(--tg-border)',
          hover: 'var(--tg-hover)',
        },
      },
      boxShadow: {
        'tg-sm': 'var(--tg-shadow-sm)',
        'tg-md': 'var(--tg-shadow-md)',
        'tg-lg': 'var(--tg-shadow-lg)',
      },
      borderRadius: {
        'xl': '24px',
      },
      backgroundImage: {
        'tg-gradient': 'var(--tg-gradient)',
      },
    },
  },
  plugins: [],
};

export default config;


