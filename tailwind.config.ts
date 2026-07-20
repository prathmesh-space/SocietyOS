import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        alabaster: '#F9F8F4',
        forest: '#2D3A31',
        sage: {
          DEFAULT: '#8C9A84',
          text: '#6B7564',
        },
        clay: {
          DEFAULT: '#DCCFC2',
          light: '#F2F0EB',
        },
        stone: '#E6E2DA',
        terracotta: {
          DEFAULT: '#C27B66',
          text: '#9C6251',
        },
        // Kept for legacy compatibility during transition
        brand: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#5c7cfa',
          600: '#4c6ef5',
          700: '#4263eb',
          800: '#3b5bdb',
          900: '#364fc7',
          950: '#2b3ea0',
        },
        surface: {
          50: '#f8f9fc',
          100: '#f1f3f9',
          200: '#e4e8f2',
          300: '#d1d7e6',
          400: '#9ca5bd',
          500: '#6b7694',
          600: '#4a5568',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#0b0f1a',
        },
        accent: {
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
          cyan: '#06b6d4',
        },
      },
      fontFamily: {
        playfair: ['var(--font-playfair)', 'serif'],
        source: ['var(--font-source)', 'sans-serif'],
        sans: ['var(--font-source)', 'system-ui', 'sans-serif'], // Set default sans to Source Sans 3
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '3xl': '1.5rem', // 24px
        '4xl': '2rem',
        'arch': '40px',
      },
      boxShadow: {
        'soft-default': '0 4px 6px -1px rgba(45, 58, 49, 0.05)',
        'soft-md': '0 10px 15px -3px rgba(45, 58, 49, 0.05)',
        'soft-lg': '0 20px 40px -10px rgba(45, 58, 49, 0.05)',
        'soft-xl': '0 25px 50px -12px rgba(45, 58, 49, 0.15)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.1)',
        'glow': '0 0 20px rgba(92, 124, 250, 0.3)',
        'glow-lg': '0 0 40px rgba(92, 124, 250, 0.4)',
      },
      transitionDuration: {
        '150': '150ms', // For toned-down variants
        '300': '300ms', // Fast interactions (button hovers, links)
        '500': '500ms', // Standard (card lifts, transforms)
        '700': '700ms', // Slow, dramatic (image scales)
        '1000': '1000ms', // Slowest
      },
      transitionTimingFunction: {
        'organic': 'cubic-bezier(0.25, 1, 0.5, 1)', // Fluid ease-out
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
        'pulse-soft': 'pulseSoft 2s infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
