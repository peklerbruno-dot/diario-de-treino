import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

import { fileURLToPath } from "node:url";

const semUso = fileURLToPath(new URL("./scripts/sem-html2canvas.js", import.meta.url));

export default defineConfig({
  resolve: {
    // O jsPDF só usa estes dois no método .html(); sem isso eles entrariam no cache à toa.
    alias: { html2canvas: semUso, dompurify: semUso, canvg: semUso },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifestFilename: "manifest.json",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "Diário de treino",
        short_name: "Treino",
        description: "Diário pessoal de musculação, pilates e natação.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#F6F3EC",
        theme_color: "#F6F3EC",
        icons: [
          { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icone-mascara-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Tudo que o app precisa vai para o cache na instalação: funciona offline.
        globPatterns: ["**/*.{js,css,html,png,svg,woff,woff2,json}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
});
