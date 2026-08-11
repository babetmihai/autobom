/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      opacity: {
        55: "0.55",
      },
      colors: {
        brand: {
          DEFAULT: "#0696d7",
          dark: "#0580b8",
        },
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
        },
        red: {
          50: "#fef2f2",
          200: "#fecaca",
          300: "#fca5a5",
          800: "#991b1b",
          900: "#7f1d1d",
        },
        orange: {
          50: "#fff7ed",
          300: "#fdba74",
          800: "#9a3412",
        },
        blue: {
          50: "#eff6ff",
          300: "#93c5fd",
          900: "#1e3a8a",
        },
        green: {
          50: "#f0fdf4",
          300: "#86efac",
          800: "#166534",
        },
      },
    },
  },
  plugins: [],
  safelist: [
    "ab-btn-brand",
  ],
}
