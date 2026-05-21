import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fly: {
          navy: "#15253d",
          navy2: "#20324f",
          slate: "#64748b",
          mist: "#eef2f6",
          paper: "#f7f9fc",
          ink: "#182230",
          line: "#d7dee8",
          blue: "#2f6ea6",
          blueSoft: "#7d95b3",
          green: "#1f7a4d",
          yellow: "#b38b1e",
          red: "#a23a3a",
          gray: "#60708a",
        },
      },
      boxShadow: {
        panel: "0 18px 50px rgba(17, 27, 44, 0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
