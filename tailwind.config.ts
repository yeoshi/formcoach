import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0D0D0D",
        surface: "#1A1A1A",
        "surface-hover": "#222222",
        "surface-elevated": "#242424",
        border: "rgba(255,255,255,0.08)",
        "border-accent": "rgba(255,107,44,0.3)",
        "text-primary": "#FFFFFF",
        "text-secondary": "#9CA3AF",
        "text-muted": "#6B7280",
        "accent-green": "#2DD881",
        "accent-red": "#FF3B3B",
        "accent-amber": "#FFB800",
        "accent-blue": "#0A84FF",
        "accent-orange": "#FF6B2C",
        "accent-orange-hover": "#FF8A50",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "16px",
        button: "14px",
        pill: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
