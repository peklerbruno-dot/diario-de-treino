import type { MetadataRoute } from "next";

/** O que faz o app virar app ao ser adicionado à tela de início. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Termômetro",
    short_name: "Termômetro",
    description: "Entradas, saídas e o saldo de cada dia.",
    start_url: "/",
    display: "standalone",
    background_color: "#121211",
    theme_color: "#f7f5f0",
    lang: "pt-BR",
    orientation: "portrait",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
