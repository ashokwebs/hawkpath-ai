/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        crc: {
          blue: '#002B49',      // Cosumnes River College Navy Blue
          orange: '#E87722',    // CRC Hawk Orange / Accent
          gold: '#F4B223',      // Gold highlight
          slate: '#1E293B',
          light: '#F8FAFC',
          card: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
