import type { Config } from 'tailwindcss'
const config: Config = { content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'], theme: { extend: { colors: { ink: '#12181F', panel: '#1E2640', gold: '#FFB800', cyan: '#00E5FF', emerald: '#00E676', crimson: '#FF3366' }, fontFamily: { sans: ['Arial', 'sans-serif'] } } }, plugins: [] }
export default config
