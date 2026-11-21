import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'Plus Jakarta Sans',
          'ui-sans-serif',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      colors: {
        navy: {
          DEFAULT: '#101B35',
          50: '#EEF2FA',
          100: '#D6E0F3',
          200: '#ADC1E7',
          300: '#84A2DB',
          400: '#5B83CF',
          500: '#2E4A85',
          600: '#223766',
          700: '#18284D',
          800: '#101B35',
          900: '#0A1124',
          950: '#060A16',
        },
        electric: {
          DEFAULT: '#367BF5',
          50: '#EBF2FE',
          100: '#D7E5FD',
          200: '#AFCBFB',
          300: '#87B1F9',
          400: '#5F97F7',
          500: '#367BF5',
          600: '#1A62E6',
          700: '#144DB8',
          800: '#0E398A',
          900: '#09255C',
        },
        cyan: {
          DEFAULT: '#28C5D8',
          50: '#E9FAFC',
          100: '#CFF4F8',
          200: '#9FE8F1',
          300: '#6FDDEA',
          400: '#3FD1E3',
          500: '#28C5D8',
          600: '#1EA0B0',
          700: '#177884',
          800: '#105058',
          900: '#09282C',
        },
      },
      boxShadow: {
        soft: '0 2px 12px -2px rgba(16, 27, 53, 0.05), 0 8px 28px -6px rgba(16, 27, 53, 0.06)',
        elevated:
          '0 10px 32px -6px rgba(16, 27, 53, 0.12), 0 4px 14px -4px rgba(54, 123, 245, 0.08)',
        glow: '0 8px 30px -4px rgba(54, 123, 245, 0.42)',
        'glow-cyan': '0 8px 30px -4px rgba(40, 197, 216, 0.38)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(14px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.32s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-right': 'slide-in-right 0.26s cubic-bezier(0.16, 1, 0.3, 1) both',
        'float-slow': 'float-slow 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
