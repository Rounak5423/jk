/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fleet: {
          yellow: '#F5C400',
          DEFAULT: '#F5C400',
        },
        graphite: {
          DEFAULT: '#292D32',
          dark: '#1E2125',
          light: '#3A3F45',
        },
        softgrey: '#F3F4F6',
        jk: {
          red: '#D9232D',
          yellow: '#F5C400',
          dark: '#292D32',
          gray: '#6B7280',
          soft: '#F3F4F6',
          border: '#E5E7EB',
        }
      }
    },
  },
  plugins: [],
}
