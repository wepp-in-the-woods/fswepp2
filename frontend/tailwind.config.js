/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {},
  variants: {
    extend: {},
  },
  plugins: [],
};

// Use the index.css file to extend or customize theme variables. 
// Refer to Tailwind CSS v4.1 documentation: https://tailwindcss.com/docs/theme