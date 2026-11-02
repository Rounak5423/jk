/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F4F3EF',
        sidebar: '#14161A',
        brand: {
          yellow: '#FFD52A',
          gold: '#F7C928',
          'warm-gold': '#D99B16',
          'dark-gold': '#B8860B',
          orange: '#E8770E',
          dark: '#14161A',
        },
        dark: {
          primary: '#101114',
          sidebar: '#101010',
          surface: '#1C1D20',
          panel: '#17191D',
          card: '#292318',
        },
        cream: {
          DEFAULT: '#FFFDF5',
          50: '#FFFDF5',
          100: '#FFF5D9',
          200: '#FFF3D5',
          300: '#FFEDB8',
        },
        gold: {
          border: '#E9D9A5',
          light: '#E9E0CE',
          subtle: '#FFF0B8',
        },
        fleet: {
          yellow: '#FFC800',
          DEFAULT: '#FFC800',
        },
        graphite: {
          DEFAULT: '#14161A',
          dark: '#0F1012',
          light: '#262A30',
        },
        secondary: '#5B6068',
        bordergray: '#E2E0D8',
        softgrey: '#F4F3EF',
        jk: {
          red: '#D9232D',
          yellow: '#FFC800',
          orange: '#E8770E',
          dark: '#14161A',
          gray: '#5B6068',
          soft: '#F4F3EF',
          border: '#E2E0D8',
        }
      }
    },
  },
  plugins: [],
}
