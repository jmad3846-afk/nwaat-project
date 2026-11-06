import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#080C14',
        panel: '#101725',
        gold: '#F59E0B',
        admin: '#F59E0B',
        cyan: '#06B6D4',
        reception: '#06B6D4',
        diagnosis: '#A855F7',
        emerald: '#10B981',
        deskBlue: '#3B82F6',
        deskPink: '#EC4899',
        crimson: '#FF3366',
      },
      fontFamily: {
        sans: ['Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
