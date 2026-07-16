import type { Config } from 'tailwindcss';

const config = {
  darkMode: 'class',
  content: ['./web/pages/**/*.{ts,tsx}', './web/src/**/*.{ts,tsx}'],
  prefix: '',
  theme: {
    extend: {
      letterSpacing: {
        wide: '0.024em',
      },
      fontSize: {
        base: ['15px', '22px'],
        button: ['17px', '24px'],
        textarea: ['20px', '28px'],
      },
      fontWeight: {
        semibold: '500',
        bold: '600',
        extrabold: '700',
      },
      boxShadow: {
        glow: '0 0 15px 5px rgba(0, 153, 255, 0.5)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        hover: {
          DEFAULT: 'hsl(var(--hover))',
          minimal: 'hsl(var(--hover-minimal))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
