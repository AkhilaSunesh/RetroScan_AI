/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: '#0f0a0d',
        surface: '#1c151a',
        primary: '#e11d48',
        primaryHover: '#be123c',
        accent: '#f43f5e',
      }
    },
  },
  plugins: [],
}