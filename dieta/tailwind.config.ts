import type { Config } from "tailwindcss";

/**
 * As cores vivem em variáveis CSS (src/app/globals.css) e o Tailwind só lhes dá
 * nome. É o que faz o modo escuro trocar tudo num lugar só.
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
        folha: "var(--folha)",
        "folha-clara": "var(--folha-clara)",
        agua: "var(--agua)",
        "agua-clara": "var(--agua-clara)",
        troca: "var(--troca)",
        "troca-clara": "var(--troca-clara)",
        pulou: "var(--pulou)",
        "pulou-clara": "var(--pulou-clara)",
        "sobre-cor": "var(--sobre-cor)",
      },
      fontFamily: {
        texto: ["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Segoe UI", "system-ui", "sans-serif"],
        titulo: ["ui-serif", "New York", "Charter", "Georgia", "serif"],
      },
      borderRadius: { cartao: "22px", folha: "16px" },
      boxShadow: { cartao: "var(--sombra)" },
    },
  },
  plugins: [],
} satisfies Config;
