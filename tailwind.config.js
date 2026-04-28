/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void: {
          50: '#f6f6fb',
          100: '#e9e9f3',
          200: '#cfcfe3',
          300: '#aaaacd',
          400: '#7f7fb2',
          500: '#606096',
          600: '#4b4b78',
          700: '#37375a',
          800: '#1a1a2e',
          900: '#0a0a0f',
        },
        morph: {
          50: '#effdf7',
          100: '#d9fbec',
          200: '#b8f5dc',
          300: '#86ecc4',
          400: '#22c55e',
          500: '#00d4aa',
          600: '#0f9f83',
          700: '#0d7664',
          800: '#115e52',
          900: '#134e46',
        },
      },
      boxShadow: {
        morph: '0 0 20px rgba(0, 212, 170, 0.25)',
        void: '0 20px 70px rgba(0, 0, 0, 0.35)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'morph-blob': 'morph-blob 8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
