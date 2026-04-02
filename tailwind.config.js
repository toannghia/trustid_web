/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tid-primary': 'var(--tid-primary)',
        'tid-secondary': 'var(--tid-secondary)',
        'tid-success': 'var(--tid-success)',
        'tid-warning': 'var(--tid-warning)',
        'tid-danger': 'var(--tid-danger)',
        'tid-organic': 'var(--tid-organic)',
        'tid-bg': 'var(--tid-bg)',
        'tid-sidebar-bg': 'var(--tid-sidebar-bg)',
        'tid-sidebar-active': 'var(--tid-sidebar-active)',
        'tid-text-primary': 'var(--tid-text-primary)',
        'tid-text-secondary': 'var(--tid-text-secondary)',
      }
    },
  },
  plugins: [],
}