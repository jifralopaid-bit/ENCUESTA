/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        peca: {
          green: '#2e7d32', // Nature/landscape
          lightGreen: '#4caf50',
          darkGreen: '#1b5e20',
          coffee: '#5d4037', // Earth/Coffee tone
          earth: '#8d6e63',
          sand: '#efebe9'
        }
      }
    },
  },
  plugins: [],
}
