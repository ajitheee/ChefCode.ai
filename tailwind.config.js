/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './MainApp.tsx',
    './constants.ts',
    './types.ts',
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
    './utils/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // The authenticated app (MainApp.tsx / components) was written with
        // `cyan-*` classes. Remap `cyan` to the ChefCode brand green so those
        // 170+ legacy classes render green through the compiled build — no
        // per-file churn. (This replaces the old Tailwind-CDN shim.)
        cyan: {
          50:  '#eef6f1',
          100: '#d6ebe0',
          200: '#aed7c2',
          300: '#7cbda0',
          400: '#4a9d7c',
          500: '#1e7d5c',
          600: '#157559',
          700: '#115e48',
          800: '#0e4a39',
          900: '#0c3d30',
        },
        // Deep-green brand (from the ChefCode "C" logo).
        brand: {
          50:  '#eef6f1',
          100: '#d6ebe0',
          200: '#aed7c2',
          300: '#7cbda0',
          400: '#4a9d7c',
          500: '#1e7d5c',
          600: '#157559',
          700: '#115e48',
          800: '#0e4a39',
          900: '#0c3d30',
        },
        // Warm cream surfaces
        cream: {
          DEFAULT: '#faf6e8',
          50:  '#fbf8ee',
          100: '#f6efce',
          200: '#ece4c9',
          300: '#e0d5b0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in':       'fadeIn 0.6s ease-out forwards',
        'fade-in-up':    'fadeInUp 0.6s ease-out forwards',
        'fade-in-down':  'fadeInDown 0.5s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.6s ease-out forwards',
        'slide-in-right':'slideInRight 0.6s ease-out forwards',
        'scale-in':      'scaleIn 0.5s ease-out forwards',
        'pulse-slow':    'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'float':         'float 6s ease-in-out infinite',
        'scan':          'scan 2s ease-in-out infinite',
        'typewriter':    'typewriter 0.8s steps(20) forwards',
      },
      keyframes: {
        fadeIn:       { from: { opacity: '0' },                                    to: { opacity: '1' } },
        fadeInUp:     { from: { opacity: '0', transform: 'translateY(24px)' },     to: { opacity: '1', transform: 'translateY(0)' } },
        fadeInDown:   { from: { opacity: '0', transform: 'translateY(-16px)' },    to: { opacity: '1', transform: 'translateY(0)' } },
        slideInLeft:  { from: { opacity: '0', transform: 'translateX(-32px)' },    to: { opacity: '1', transform: 'translateX(0)' } },
        slideInRight: { from: { opacity: '0', transform: 'translateX(32px)' },     to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:      { from: { opacity: '0', transform: 'scale(0.9)' },           to: { opacity: '1', transform: 'scale(1)' } },
        float:        { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        scan:         { '0%,100%': { transform: 'translateY(0)', opacity: '0.5' }, '50%': { transform: 'translateY(100%)', opacity: '1' } },
        typewriter:   { from: { width: '0' }, to: { width: '100%' } },
      },
    },
  },
  plugins: [],
};
