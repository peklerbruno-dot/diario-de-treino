import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        borda: "hsl(var(--borda))",
        fundo: "hsl(var(--fundo))",
        papel: "hsl(var(--papel))",
        texto: "hsl(var(--texto))",
        suave: "hsl(var(--suave))",
        acento: "hsl(var(--acento))",
        acentoTexto: "hsl(var(--acento-texto))",
        atencao: "hsl(var(--atencao))",
        atencaoFundo: "hsl(var(--atencao-fundo))",
        erro: "hsl(var(--erro))",
        erroFundo: "hsl(var(--erro-fundo))",
        ok: "hsl(var(--ok))",
        okFundo: "hsl(var(--ok-fundo))",
      },
      borderRadius: { lg: "0.6rem", md: "0.45rem", sm: "0.3rem" },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
