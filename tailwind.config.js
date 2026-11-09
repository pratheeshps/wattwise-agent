/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/app/**/*.{js,jsx}', './src/components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        wattwise: {
          canvas: '#f4f7f3',
          text: '#1c2923',
          heading: '#1e3027',
          dark: '#24352c',
          muted: '#69776e',
          sage: '#e9efe6',
          lime: '#d7f36b',
          green: '#73914b',
          border: '#e2e9e1',
        },
      },
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      maxWidth: {
        content: '1060px',
      },
      borderRadius: {
        panel: '18px',
      },
    },
  },
  plugins: [],
};
