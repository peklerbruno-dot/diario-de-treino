import type { MetadataRoute } from "next";

/**
 * O que faz o app virar app ao ser adicionado à tela de início.
 *
 * `scope` é o que faltava: sem ele o iPhone trata como "fora do app" qualquer
 * endereço que não seja exatamente o `start_url`, e abre a barra do navegador
 * por cima — foi isso que apareceu ao entrar em Mês, Ano ou Ajustes. Com o
 * escopo na raiz, o app inteiro é o app.
 *
 * `id` prende essa instalação a um endereço fixo. Sem ele o navegador usa o
 * `start_url` como identidade, e mudar o `start_url` um dia criaria um segundo
 * app em vez de atualizar este.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Termômetro",
    short_name: "Termômetro",
    description: "Entradas, saídas e o saldo de cada dia.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f2f2f6",
    theme_color: "#f2f2f6",
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
