import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Central",
    short_name: "Central",
    description: "As suas caixas de e-mail num lugar só.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f2f2f6",
    theme_color: "#f2f2f6",
    lang: "pt-BR",
    orientation: "portrait",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
