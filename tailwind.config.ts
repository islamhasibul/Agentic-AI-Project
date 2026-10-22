import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        // Proofly palette: warm ink + ember accent.
        ink: {
          50: "#f6f6f7",
          100: "#e8e9ec",
          200: "#cfd2d9",
          300: "#a7acba",
          400: "#7c8294",
          500: "#5a6173",
          600: "#454b5b",
          700: "#363b48",
          800: "#22262f",
          900: "#14171d",
          950: "#0a0c11",
        },
        ember: {
          50: "#fff5ed",
          100: "#ffe8d3",
          200: "#ffcfa6",
          300: "#ffae6e",
          400: "#ff8531",
          500: "#ff6a0a",
          600: "#f04e05",
          700: "#c73a08",
          800: "#9c2f0f",
          900: "#7d2a10",
          950: "#451304",
        },
        sage: {
          50: "#f2f7f3",
          100: "#dfece1",
          200: "#bfd9c4",
          300: "#94be9e",
          400: "#6a9f76",
          500: "#4d8459",
          600: "#3b6946",
          700: "#305339",
          800: "#284330",
          900: "#22382a",
        },
        sand: {
          50: "#faf8f5",
          100: "#f1ece1",
          200: "#e2d8c4",
          300: "#cdbd9d",
          400: "#b89d75",
          500: "#a4845a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(20, 23, 29, 0.04), 0 8px 24px -8px rgba(20, 23, 29, 0.08)",
        ring: "0 0 0 1px rgba(20, 23, 29, 0.06), 0 8px 24px -8px rgba(20, 23, 29, 0.10)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
