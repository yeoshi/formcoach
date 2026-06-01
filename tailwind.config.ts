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
        bg: "#0A0A0B",
        surface: "#141416",
        "surface-hover": "#1C1C1F",
        border: "#2A2A2E",
        "text-primary": "#F5F5F7",
        "text-secondary": "#8E8E93",
        "accent-green": "#30D158",
        "accent-red": "#FF453A",
        "accent-amber": "#FFD60A",
        "accent-blue": "#0A84FF",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "12px",
        button: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
