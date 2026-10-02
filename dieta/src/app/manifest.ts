import type { MetadataRoute } from "next";

/**
 * O que faz o app virar app ao ser adicionado à tela de início — e, no iPhone,
 * a condição para poder mandar notificação: o iOS só oferece push para site
 * instalado na Tela de Início, com `display: standalone`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Dieta",
    short_name: "Dieta",
    description: "O plano da nutricionista, os avisos das refeições e a água do dia.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3f3ef",
    theme_color: "#f3f3ef",
    lang: "pt-BR",
    dir: "ltr",
    orientation: "portrait",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
