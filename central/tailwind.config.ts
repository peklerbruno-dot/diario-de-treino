import type { Config } from "tailwindcss";

/**
 * As cores vivem em variáveis CSS (src/app/globals.css) e o Tailwind só lhes dá
 * nome: o modo escuro troca tudo num lugar só.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  safelist: ["bg-atencao", "bg-alerta", "bg-azul", "bg-ok", "bg-regua"],
  theme: {
    extend: {
      colors: {
        fundo: "var(--fundo)",
        lateral: "var(--lateral)",
        superficie: "var(--superficie)",
        tinta: "var(--tinta)",
        grafite: "var(--grafite)",
        fosco: "var(--fosco)",
        linha: "var(--linha)",
        regua: "var(--regua)",
        realce: "var(--realce)",
        destaque: "var(--destaque)",
        "destaque-tinta": "var(--destaque-tinta)",
        atencao: "var(--atencao)",
        alerta: "var(--alerta)",
        azul: "var(--azul)",
        ok: "var(--ok)",
      },
      fontFamily: {
        texto: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI Variable Text",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        mini: ["11px", "15px"],
      },
    },
  },
  plugins: [],
} satisfies Config;
