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
        soft: '0 4px 24px -4px rgba(16, 27, 53, 0.08)',
        glow: '0 8px 30px -6px rgba(54, 123, 245, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
