/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        playerAttack: {
          '0%':   { transform: 'translateX(0)    scale(1)'   },
          '35%':  { transform: 'translateX(38px) scale(1.25)' },
          '100%': { transform: 'translateX(0)    scale(1)'   },
        },
        enemyAttack: {
          '0%':   { transform: 'translateX(0)     scale(1)'   },
          '35%':  { transform: 'translateX(-38px) scale(1.25)' },
          '100%': { transform: 'translateX(0)     scale(1)'   },
        },
        hurtShake: {
          '0%,100%': { transform: 'translateX(0)' },
          '15%': { transform: 'translateX(-9px)' },
          '30%': { transform: 'translateX(9px)'  },
          '50%': { transform: 'translateX(-7px)' },
          '70%': { transform: 'translateX(7px)'  },
          '85%': { transform: 'translateX(-4px)' },
        },
        floatUp: {
          '0%':   { transform: 'translateY(0)',     opacity: '1' },
          '80%':  { transform: 'translateY(-44px)', opacity: '1' },
          '100%': { transform: 'translateY(-54px)', opacity: '0' },
        },
        hurtFlash: {
          '0%,100%': { opacity: '0' },
          '20%':     { opacity: '0.35' },
          '60%':     { opacity: '0.2' },
        },
      },
      animation: {
        'slide-down':    'slideDown 0.15s ease-out',
        'player-attack': 'playerAttack 0.35s ease-in-out',
        'enemy-attack':  'enemyAttack 0.35s ease-in-out',
        'hurt-shake':    'hurtShake 0.35s ease-in-out',
        'float-up':      'floatUp 1s ease-out forwards',
        'hurt-flash':    'hurtFlash 0.5s ease-out forwards',
      },
    },
  },
  plugins: [],
}