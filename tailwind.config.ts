import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        surface: "#f7f7f2",
        line: "#dedbd2",
        mint: "#0f766e",
        saffron: "#b7791f",
        berry: "#9f1239"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(31, 41, 51, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
