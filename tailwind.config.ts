import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        barbu: {
          red: '#C41E3A',
          dark: '#1a0a0a',
          card: '#fdf6e3',
        },
      },
    },
  },
  plugins: [],
}

export default config
