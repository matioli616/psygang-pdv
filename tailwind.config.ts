import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0a',
          elevated: '#141414',
          overlay: '#1c1c1c',
        },
        neon: {
          purple: '#B026FF',
          green: '#39FF14',
          pink: '#FF10F0',
        },
        text: {
          primary: '#FAFAFA',
          secondary: '#A1A1A1',
          muted: '#666666',
        },
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon-purple': '0 0 20px rgba(176,38,255,0.4)',
        'neon-green': '0 0 20px rgba(57,255,20,0.4)',
      },
    },
  },
  plugins: [],
}

export default config
