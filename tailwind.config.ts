import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0b0f19",
        glass: "rgba(255,255,255,0.06)",
        edge: "rgba(255,255,255,0.18)",
        neon: {
          cyan: "#22d3ee",
          magenta: "#f472b6",
          violet: "#8b5cf6",
          ion: "#34d399"
        }
      },
      backdropBlur: { xs: "2px" }
    }
  },
  plugins: []
} satisfies Config;
