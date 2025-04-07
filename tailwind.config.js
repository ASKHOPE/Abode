// tailwind.config.ts

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#857763',
          DEFAULT: '#857763', //This changes color of everything
          dark: '#C2410C',
        },
        secondary: {
          light: '#F5F5F4',
          DEFAULT: '#A8A29E',
          dark: '#57534E',
        },
        accent: {
          light: '#BBF7D0',
          DEFAULT: '#857763',
          dark: '#15803D',
        },
        background: '#faebd7',
        surface: '#FFFFFF',
        foreground: {
          DEFAULT: '#1C1917',
          muted: '#78716C',
          inverted: '#FFFFFF',
        },
        danger: {
          light: '#FECACA',
          DEFAULT: '#EF4444',
          dark: '#991B1B',
        },
        warning: {
          light: '#FEF3C7',
          DEFAULT: '#F59E0B',
          dark: '#92400E',
        },
        success: {
          light: '#DCFCE7',
          DEFAULT: '#16A34A',
          dark: '#14532D',
        },
      },
      fontFamily: {
        kaushan: ['"Kaushan Script"', 'system-ui'],
        oregano: ['"Oregano"', 'cursive'],
        rubik: ['"Rubik Dirt"', 'system-ui'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}

export default config
