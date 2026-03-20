import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0A0A0F",
          secondary: "#12121A",
          card: "#1A1A26",
          elevated: "#22223A",
        },
        accent: {
          gold: "#C9A84C",
          "gold-light": "#E8C97A",
          "gold-dim": "#8A6F2E",
          blue: "#4A90D9",
          "blue-dim": "#2A5A9A",
          red: "#E05252",
          green: "#4CAF78",
        },
        text: {
          primary: "#F0EDE8",
          secondary: "#9A9AB0",
          muted: "#5A5A72",
        },
        border: {
          subtle: "#2A2A3E",
          DEFAULT: "#3A3A52",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease forwards",
        "fade-in": "fadeIn 0.3s ease forwards",
        "slide-in": "slideIn 0.4s ease forwards",
        pulse_slow: "pulse 3s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #C9A84C, #E8C97A, #C9A84C)",
        "card-gradient": "linear-gradient(135deg, #1A1A26, #22223A)",
        "hero-gradient": "radial-gradient(ellipse at top, #1E1A2E 0%, #0A0A0F 70%)",
      },
      boxShadow: {
        gold: "0 0 20px rgba(201, 168, 76, 0.15)",
        "gold-strong": "0 0 40px rgba(201, 168, 76, 0.3)",
        card: "0 4px 24px rgba(0, 0, 0, 0.4)",
        elevated: "0 8px 40px rgba(0, 0, 0, 0.6)",
      },
    },
  },
  plugins: [],
};
export default config;
