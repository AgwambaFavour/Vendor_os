/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        wa: {
          dark: '#075E54',   // header / nav
          teal: '#128C7E',   // secondary actions, links
          green: '#25D366',  // primary CTA
          bg: '#ECE5DD',     // page background
          bubble: '#D9FDD3', // accent / success surfaces
          ink: '#111B21',    // primary text
          muted: '#667781',  // secondary text
          tick: '#53BDEB',   // "read" blue tick
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};