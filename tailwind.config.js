/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        espresso: {
          950: '#120d0a',
          900: '#1b130e',
          850: '#241a13',
          800: '#32231b',
          700: '#463227',
        },
        crema: {
          50: '#fdfaf4',
          100: '#f5ecdc',
          200: '#e6d6c3',
          300: '#c5b29c',
        },
        amber: {
          400: '#f2a65a',
          500: '#e59546',
          600: '#c9782e',
        },
        matcha: {
          500: '#6e9b5f',
          600: '#5a824e',
        },
        terracotta: {
          500: '#d95d39',
          600: '#bf4c2a',
        },
        copper: {
          400: '#f2a65a',
          500: '#e59546',
          600: '#c9782e',
        },
        moss: {
          500: '#6e9b5f',
          600: '#5a824e',
        },
        brick: {
          500: '#d95d39',
          600: '#bf4c2a',
        },
      },
    },
  },
  plugins: [],
};
