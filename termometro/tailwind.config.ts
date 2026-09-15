import type { Config } from "tailwindcss";

/**
 * As cores vivem em variáveis CSS (src/app/globals.css), e o Tailwind só dá
 * nome a elas. É o que faz o modo escuro trocar tudo num lugar só.
 *
 * Os valores vêm de uma paleta conferida com validador de daltonismo e de
 * contraste contra estas duas superfícies — a de papel e a escura.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        papel: "var(--papel)",
        cartao: "var(--cartao)",
        tinta: "var(--tinta)",
        grafite: "var(--grafite)",
        fosco: "var(--fosco)",
        regua: "var(--regua)",
        reguafina: "var(--reguafina)",
        entrada: "var(--entrada)",
        saida: "var(--saida)",
        saldo: "var(--saldo)",
        atencao: "var(--atencao)",
      },
      fontFamily: {
        texto: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: { folha: "18px" },
    },
  },
  plugins: [],
} satisfies Config;
