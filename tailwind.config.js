module.exports = {
  content: ["./assets/src/js/**/*.{js,jsx}", "./assets/public/**/*.html"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6d28d9',
          hover: '#7c3aed',
          light: '#a78bfa',
          muted: '#8b5cf6',
        },
        surface: {
          base: '#0d0d1a',
          card: '#16162a',
          body: '#1a1a2e',
          landing: '#0a0a12',
        },
        border: {
          DEFAULT: '#2d2d44',
          light: '#3d3d5c',
          muted: '#4d4d6a',
        },
      },
      spacing: {
        'fluid-1': 'clamp(0.375rem, 0.5vmin + 0.25rem, 0.5rem)',
        'fluid-2': 'clamp(0.625rem, 0.6vmin + 0.4rem, 0.875rem)',
        'fluid-3': 'clamp(0.875rem, 0.7vmin + 0.6rem, 1.125rem)',
        'fluid-4': 'clamp(1.125rem, 0.8vmin + 0.8rem, 1.5rem)',
        'fluid-6': 'clamp(1.625rem, 1vmin + 1.2rem, 2.25rem)',
        'fluid-8': 'clamp(2.125rem, 1.2vmin + 1.6rem, 3rem)',
      },
      maxWidth: {
        'modal-sm': 'clamp(20rem, 28vw, 28rem)',
        'modal-md': 'clamp(26rem, 38vw, 42rem)',
        'modal-lg': 'clamp(32rem, 50vw, 56rem)',
        'modal-xl': 'clamp(38rem, 65vw, 72rem)',
      },
      fontSize: {
        'fluid-xs': 'clamp(0.75rem, 0.3vmin + 0.65rem, 0.875rem)',
        'fluid-sm': 'clamp(0.8125rem, 0.35vmin + 0.7rem, 0.9375rem)',
        'fluid-base': 'clamp(0.9375rem, 0.4vmin + 0.8rem, 1.0625rem)',
        'fluid-lg': 'clamp(1.0625rem, 0.5vmin + 0.9rem, 1.25rem)',
        'fluid-xl': 'clamp(1.25rem, 0.6vmin + 1.05rem, 1.5rem)',
        'fluid-2xl': 'clamp(1.5rem, 0.8vmin + 1.25rem, 1.875rem)',
        'fluid-3xl': 'clamp(1.875rem, 1vmin + 1.5rem, 2.5rem)',
      },
      width: {
        'fluid-icon-xs': 'clamp(0.8rem, 0.25vmin + 0.7rem, 0.9375rem)',
        'fluid-icon-sm': 'clamp(1rem, 0.35vmin + 0.85rem, 1.25rem)',
        'fluid-icon-md': 'clamp(1.375rem, 0.5vmin + 1.1rem, 1.75rem)',
        'fluid-icon-lg': 'clamp(1.875rem, 0.7vmin + 1.5rem, 2.5rem)',
        'fluid-icon-xl': 'clamp(2.75rem, 1vmin + 2.2rem, 4rem)',
      },
      height: {
        'fluid-icon-xs': 'clamp(0.8rem, 0.25vmin + 0.7rem, 0.9375rem)',
        'fluid-icon-sm': 'clamp(1rem, 0.35vmin + 0.85rem, 1.25rem)',
        'fluid-icon-md': 'clamp(1.375rem, 0.5vmin + 1.1rem, 1.75rem)',
        'fluid-icon-lg': 'clamp(1.875rem, 0.7vmin + 1.5rem, 2.5rem)',
        'fluid-icon-xl': 'clamp(2.75rem, 1vmin + 2.2rem, 4rem)',
      },
      borderRadius: {
        'fluid-2': 'clamp(0.5rem, 1vmin, 0.75rem)',
        'fluid-3': 'clamp(0.75rem, 1.5vmin, 1.25rem)',
        'fluid-4': 'clamp(1rem, 2vmin, 1.5rem)',
      },
    },
  },
  plugins: [],
}