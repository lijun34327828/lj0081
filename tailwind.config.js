/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        pottery: {
          50: '#FAF7F2',
          100: '#F5F0E8',
          200: '#E8DFD0',
          300: '#D4C4A8',
          400: '#B89B6F',
          500: '#8B6F47',
          600: '#6D573A',
          700: '#53412D',
          800: '#3A2E20',
          900: '#231A12',
        },
        kiln: {
          50: '#FEF2EE',
          100: '#FDE5DB',
          200: '#FBC8B3',
          300: '#F5A282',
          400: '#E8764F',
          500: '#C85A36',
          600: '#A84828',
          700: '#883A20',
          800: '#682C18',
          900: '#481E10',
        },
        glaze: {
          50: '#F0F3F6',
          100: '#D9DFE6',
          200: '#B3C1CF',
          300: '#8DA3B8',
          400: '#6B7B8D',
          500: '#4F6174',
          600: '#3E4E5E',
          700: '#2E3B48',
          800: '#1F2932',
          900: '#10171C',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Source Han Sans"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
