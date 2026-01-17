/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./public/**/*.html",
    "./src/**/*.{svelte,js}"
  ],
  theme: {
    extend: {
      colors: {
        'timer-purple': '#8B5CF6',
        'timer-purple-hover': '#7C3AED',
      }
    },
  },
  plugins: [],
}
