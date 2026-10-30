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
          yellow: '#FFC800',
          orange: '#E8770E',
          dark: '#14161A',
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
