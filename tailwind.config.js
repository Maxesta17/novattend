/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        burgundy: '#800000',
        'burgundy-dark': '#5C0000',
        'burgundy-light': '#9A1515',
        'burgundy-soft': '#FDF2F2',
        gold: '#C5A059',
        'gold-light': '#D4B572',
        'gold-dark': '#A8863D',
        'gold-soft': '#FBF6EC',
        white: '#FFFFFF',
        'off-white': '#FAFAF8',
        cream: '#F9F7F3',
        'text-dark': '#1A1A1A',
        'text-body': '#3D3D3D',
        'text-muted': '#7A7A7A',
        'text-light': '#ABABAB',
        border: '#E8E4DF',
        'border-light': '#F0ECE7',
        success: '#2E7D32',
        'success-soft': '#E8F5E9',
        warning: '#E65100',
        'warning-soft': '#FFF3E0',
        error: '#C62828',
        'error-soft': '#FFEBEE',
        'dark-bg': '#111111',
        disabled: '#CCCCCC',
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        montserrat: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
