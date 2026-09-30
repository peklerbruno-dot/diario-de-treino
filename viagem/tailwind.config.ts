import type { Config } from "tailwindcss";

/** As cores moram em variáveis CSS (src/app/globals.css); o Tailwind só lhes dá nome. */
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
        realce: "var(--realce)",
        "realce-tinta": "var(--realce-tinta)",
        "realce-fraco": "var(--realce-fraco)",
        verde: "var(--verde)",
        "verde-fraco": "var(--verde-fraco)",
        vermelho: "var(--vermelho)",
        "vermelho-fraco": "var(--vermelho-fraco)",
        ambar: "var(--ambar)",
        "ambar-fraco": "var(--ambar-fraco)",
        azul: "var(--azul)",
      },
      fontFamily: {
        texto: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"],
        titulo: ["ui-rounded", "SF Pro Rounded", "-apple-system", "system-ui", "sans-serif"],
      },
      borderRadius: { cartao: "18px", folha: "12px", pilula: "999px" },
      boxShadow: { cartao: "var(--sombra)" },
    },
  },
  plugins: [],
} satisfies Config;
