/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3f9',
          100: '#ebe7f4',
          200: '#d7d0e9',
          300: '#c3b8de',
          400: '#af9fd3',
          500: '#6750a4',
          600: '#5c4894',
          700: '#4e3d7d',
          800: '#403267',
          900: '#322750',
        },
      },
    },
  },
  plugins: [],
} 