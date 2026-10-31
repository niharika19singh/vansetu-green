/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          950: '#022c22',
        },
        slate: {
          950: '#020617',
        },
      },
    },
  },
  plugins: [],
};
