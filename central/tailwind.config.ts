import type { Config } from "tailwindcss";

/** As cores vivem em variáveis CSS (src/app/globals.css), para o modo escuro trocar tudo num lugar só. */
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
        destaque: "var(--destaque)",
        "destaque-tinta": "var(--destaque-tinta)",
        atencao: "var(--atencao)",
        alerta: "var(--alerta)",
        ok: "var(--ok)",
      },
      fontFamily: {
        texto: ["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Segoe UI", "system-ui", "sans-serif"],
        titulo: ["ui-serif", "New York", "Charter", "Georgia", "serif"],
      },
      borderRadius: { cartao: "18px" },
      boxShadow: { cartao: "var(--sombra)" },
    },
  },
  plugins: [],
} satisfies Config;
