import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1280px',
      },
    },
    extend: {
      colors: {
        // Brand Colors
        primary: {
          DEFAULT: '#4F46E5', // Indigo 600
          foreground: '#FFFFFF',
          hover: '#4338CA',
        },
        secondary: {
          DEFAULT: '#10B981', // Emerald 500
          foreground: '#FFFFFF',
        },
        // Neutral Colors
        neutral: {
          ink: '#0F172A', // Main text
          sub: '#475569', // Secondary text
          border: '#E2E8F0', // Borders
          bg: '#F8FAFC', // Background
          surface: '#FFFFFF', // Cards/Surfaces
        },
        // Semantic Colors
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#2563EB',
        // State Colors
        disabled: {
          text: '#94A3B8',
          bg: '#F1F5F9',
        },
        focus: '#A5B4FC',
        // Alias for compatibility
        background: '#F8FAFC',
        foreground: '#0F172A',
        border: '#E2E8F0',
        muted: {
          DEFAULT: '#F1F5F9',
          foreground: '#64748B',
        },
      },
      fontFamily: {
        sans: ['var(--font-plus-jakarta-sans)', 'var(--font-noto-sans-jp)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'Consolas', 'Monaco', 'monospace'],
      },
      fontSize: {
        'display': ['2.25rem', { lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.02em' }], // 36px
        'h1': ['1.875rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.015em' }], // 30px
        'h2': ['1.5rem', { lineHeight: '1.25', fontWeight: '700', letterSpacing: '-0.01em' }], // 24px
        'h3': ['1.25rem', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '-0.005em' }], // 20px
        'body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }], // 16px
        'small': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }], // 14px
        'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }], // 12px
      },
      borderRadius: {
        xs: '6px',
        sm: '10px',
        md: '14px',
        lg: '20px',
        DEFAULT: '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 0, 0, 0.06)',
        modal: '0 4px 12px rgba(0, 0, 0, 0.10)',
      },
      transitionDuration: {
        micro: '120ms',
        ui: '200ms',
        modal: '240ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'pulse-slow': 'pulse-slow 8s ease-in-out infinite',
        'pulse-slow-delayed': 'pulse-slow 8s ease-in-out infinite 2s',
      },
      keyframes: {
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'pulse-slow': {
          '0%, 100%': {
            opacity: '0.3',
            transform: 'scale(1)',
          },
          '50%': {
            opacity: '0.5',
            transform: 'scale(1.05)',
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
