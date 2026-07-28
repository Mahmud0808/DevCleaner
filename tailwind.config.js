/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: 'rgb(var(--surface-0) / <alpha-value>)',
          1: 'rgb(var(--surface-1) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
          3: 'rgb(var(--surface-3) / <alpha-value>)'
        },
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',
          strong: 'rgb(var(--line-strong) / <alpha-value>)'
        },
        content: {
          DEFAULT: 'rgb(var(--content) / <alpha-value>)',
          muted: 'rgb(var(--content-muted) / <alpha-value>)',
          subtle: 'rgb(var(--content-subtle) / <alpha-value>)'
        },
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          fg: 'rgb(var(--brand-fg) / <alpha-value>)'
        },
        danger: 'rgb(var(--danger) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)'
      },
      borderColor: {
        DEFAULT: 'rgb(var(--line) / <alpha-value>)'
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'Segoe UI Variable Text',
          'Segoe UI',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif'
        ],
        mono: [
          'ui-monospace',
          'Cascadia Mono',
          'SF Mono',
          'Segoe UI Mono',
          'Consolas',
          'monospace'
        ]
      },
      transitionTimingFunction: {
        instrument: 'cubic-bezier(0.16, 1, 0.3, 1)'
      },
      boxShadow: {
        overlay: '0 24px 64px -16px rgb(0 0 0 / 0.55), 0 4px 16px -6px rgb(0 0 0 / 0.35)',
        tip: '0 10px 28px -10px rgb(0 0 0 / 0.5)'
      },
      keyframes: {
        enter: {
          from: { opacity: '0', transform: 'translateY(2px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        fade: {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'dialog-in': {
          from: { opacity: '0', transform: 'translate(-50%, -50%) scale(0.97)' },
          to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' }
        },
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' }
        }
      },
      animation: {
        enter: 'enter 160ms cubic-bezier(0.16, 1, 0.3, 1) both',
        fade: 'fade 140ms ease-out both',
        'dialog-in': 'dialog-in 160ms cubic-bezier(0.16, 1, 0.3, 1) both',
        sweep: 'sweep 1.15s cubic-bezier(0.65, 0, 0.35, 1) infinite'
      }
    }
  },
  plugins: []
}
