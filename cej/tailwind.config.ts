import type { Config } from "tailwindcss";

/**
 * As cores moram em variáveis CSS (src/app/globals.css); o Tailwind só lhes dá
 * nome. É o que faz o modo escuro trocar tudo num lugar só.
 *
 * Duas famílias, com papéis separados: a serifa titula, a sans conta. Num
 * sistema de trabalho a serifa nos títulos faz a tela parecer um documento e
 * não um painel de controle — que é o que ela é.
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
        linha: "var(--linha)",
        heroi: "var(--heroi)",
        "heroi-tinta": "var(--heroi-tinta)",
        realce: "var(--realce)",
        "realce-fraco": "var(--realce-fraco)",
        azul: "var(--tinta-azul)",
        ambar: "var(--tinta-ambar)",
        roxo: "var(--tinta-roxo)",
        verde: "var(--tinta-verde)",
        vermelho: "var(--tinta-vermelha)",
      },
      fontFamily: {
        texto: [
          "-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif",
        ],
        titulo: ["ui-serif", "New York", "Charter", "Georgia", "serif"],
      },
      borderRadius: { cartao: "16px", folha: "12px", pilula: "999px" },
      boxShadow: { cartao: "var(--sombra)", baixa: "var(--sombra-baixa)" },
      maxWidth: { leitura: "72ch" },
    },
  },
  plugins: [],
} satisfies Config;
