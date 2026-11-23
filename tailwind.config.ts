import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens — driven by CSS variables so light/dark both work.
        accent: 'rgb(var(--accent-text) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
        faint: 'rgb(var(--text-faint) / <alpha-value>)',
        ink: '#090D16',
        panel: '#101725',
        gold: 'rgb(var(--accent-text) / <alpha-value>)',
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
        sans: ['var(--font-cairo)', 'Tahoma', 'sans-serif'],
        mono: ['var(--font-mono)', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
