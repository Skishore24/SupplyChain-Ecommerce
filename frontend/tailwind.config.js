/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F8FA",
        surface: "#FFFFFF",
        primary: {
          DEFAULT: "#0F172A",
          hover: "#1E293B",
          dark: "#020617",
          light: "#334155"
        },
        accent: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          subtle: "#EFF6FF",
          border: "#BFDBFE"
        },
        ink: {
          primary: "#111827",
          secondary: "#64748B",
          muted: "#94A3B8"
        },
        line: "#E5E7EB",
        success: {
          DEFAULT: "#16A34A",
          subtle: "#F0FDF4",
          border: "#BBF7D0"
        },
        warning: {
          DEFAULT: "#F59E0B",
          subtle: "#FFFBEB",
          border: "#FDE68A"
        },
        danger: {
          DEFAULT: "#DC2626",
          subtle: "#FEF2F2",
          border: "#FECACA"
        }
      },
      borderRadius: {
        'card': '20px',
        'card-lg': '24px',
        'card-sm': '16px',
        'btn': '12px',
        'input': '12px',
        'badge': '9999px'
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'premium': '0 4px 20px -2px rgb(15 23 42 / 0.06), 0 2px 6px -1px rgb(15 23 42 / 0.03)',
        'float': '0 10px 30px -4px rgb(15 23 42 / 0.08), 0 4px 12px -2px rgb(15 23 42 / 0.04)',
        'drawer': '0 20px 40px -8px rgb(15 23 42 / 0.16)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
