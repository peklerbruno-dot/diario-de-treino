import type { Config } from "tailwindcss";

/**
 * As cores vivem em variáveis CSS (src/app/globals.css) e o Tailwind só lhes dá
 * nome. É o que faz o modo escuro trocar tudo num lugar só.
 *
 * Duas famílias de letra, com papéis separados: a serifa titula, a sans conta.
 * Número de dinheiro em serifa fica bonito e atrapalha — numa coluna, a gente
 * compara valores pela forma dos dígitos, e a serifa tira a regularidade que
 * essa comparação usa.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        papel: "var(--papel)",
        cartao: "var(--cartao)",
        heroi: "var(--heroi)",
        "heroi-tinta": "var(--heroi-tinta)",
        "heroi-fosco": "var(--heroi-fosco)",
        tinta: "var(--tinta)",
        grafite: "var(--grafite)",
        fosco: "var(--fosco)",
        regua: "var(--regua)",
        linha: "var(--linha)",
        entrada: "var(--entrada)",
        saida: "var(--saida)",
        diario: "var(--diario)",
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
        titulo: ["ui-serif", "New York", "Charter", "Georgia", "serif"],
      },
      borderRadius: { cartao: "22px", folha: "18px", tecla: "14px" },
      boxShadow: {
        cartao: "var(--sombra)",
        baixa: "var(--sombra-baixa)",
      },
    },
  },
  plugins: [],
} satisfies Config;
