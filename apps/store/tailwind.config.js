/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'hitam': '#0a0a0a',
        'emas': '#d4a849',
        'emas-terang': '#e8c84c',
        'hitam-gelap': '#111111',
        'abu-abu': '#333333',
      },
      fontFamily: {
        playfair: ['"Playfair Display"', 'serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
