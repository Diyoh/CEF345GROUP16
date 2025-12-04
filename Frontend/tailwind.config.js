/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#007A5E', // Cameroon Green
        secondary: '#CE1126', // Cameroon Red
        accent: '#FCD116', // Cameroon Yellow
        dark: '#1f2937', // Dark Gray
      }
    },
  },
  plugins: [],
}