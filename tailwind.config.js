/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
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
