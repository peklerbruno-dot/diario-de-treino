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
  // `classeDoSaldo` monta o nome em tempo de execução, então o Tailwind não o
  // encontra varrendo o código. Sem esta lista as dez cores da escala seriam
  // podadas do CSS e a coluna do saldo sairia sem cor nenhuma.
  safelist: [
    ...[1, 2, 3, 4, 5].map((n) => `bg-sobrou-${n}`),
    ...[1, 2, 3, 4, 5].map((n) => `bg-faltou-${n}`),
  ],
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
        // A escala do saldo. Os nomes são escritos por extenso, e não montados
        // com template, porque o Tailwind lê o código como texto: uma classe
        // que só existe concatenada em tempo de execução nunca chega ao CSS.
        sobrou: {
          1: "var(--sobrou-1)",
          2: "var(--sobrou-2)",
          3: "var(--sobrou-3)",
          4: "var(--sobrou-4)",
          5: "var(--sobrou-5)",
        },
        faltou: {
          1: "var(--faltou-1)",
          2: "var(--faltou-2)",
          3: "var(--faltou-3)",
          4: "var(--faltou-4)",
          5: "var(--faltou-5)",
        },
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
