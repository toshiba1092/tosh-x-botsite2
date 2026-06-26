/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        dark: {
          50: '#1f1f1f',
          100: '#181818',
          200: '#141414',
          300: '#0f0f0f',
          400: '#0a0a0a',
          500: '#050505',
          600: '#030303',
          700: '#020202',
          800: '#010101',
          900: '#000000',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 2s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'gold': '0 4px 20px -4px rgba(245, 158, 11, 0.25)',
        'gold-lg': '0 10px 40px -10px rgba(245, 158, 11, 0.35)',
        'gold-xl': '0 20px 60px -15px rgba(245, 158, 11, 0.4)',
        'inner-gold': 'inset 0 2px 8px 0 rgba(245, 158, 11, 0.1)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
        'gold-shimmer': 'linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.05) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
};
