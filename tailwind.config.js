/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        display: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      colors: {
        // Dark mode design tokens
        'screen-bg': '#090D16',
        'screen-card': '#131C2E',
        'screen-text': '#F8FAFC',
        'screen-muted': '#94A3B8',
        // Light mode
        'screen-bg-light': '#FFFFFF',
        'screen-card-light': '#F1F5F9',
        'screen-text-light': '#0F172A',
      },
      animation: {
        'heartbeat': 'heartbeat 1s ease-in-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        }
      },
      gridTemplateRows: {
        'display': '8% 52% 32% 8%',
      }
    },
  },
  plugins: [],
}
