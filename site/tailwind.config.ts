import type { Config } from "tailwindcss";

/** A identidade visual da Chazit Hanoar SP: as cores e as fontes do manual. */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        marinho: "#2B3278",
        azul: "#3C91E6",
        amarelo: "#F5FFC6",
        rosa: "#FFACE4",
        verde: "#C1FF9B",
        turquesa: "#75DDDD",
        celeste: "#87C8FD",
        edicao: "#FFD23F",
      },
      fontFamily: {
        titulo: ["Montserrat", "ui-sans-serif", "system-ui", "sans-serif"],
        corpo: ["Lato", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
