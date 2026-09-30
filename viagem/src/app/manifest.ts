import type { MetadataRoute } from "next";

/**
 * O app instalável. `share_target` põe o app na folha de compartilhar do
 * Android: mandar um reel "para o Viagem" abre a tela de adicionar já com o
 * link. No iPhone o Safari não suporta isso — lá o caminho é o atalho (ver
 * docs/ATALHO-IPHONE.md).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Viagem em grupo",
    short_name: "Viagem",
    description: "Lugares, roteiro e contas da viagem.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf6f0",
    theme_color: "#faf6f0",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    share_target: {
      action: "/compartilhar",
      method: "GET",
      params: { title: "titulo", text: "texto", url: "link" },
    },
  } as MetadataRoute.Manifest;
}
