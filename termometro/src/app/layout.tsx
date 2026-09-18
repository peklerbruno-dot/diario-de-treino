import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Termômetro",
  description: "Entradas, saídas e o saldo de cada dia — o seu, em qualquer aparelho.",
  icons: {
    icon: [{ url: "/icone-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "Termômetro",
    statusBarStyle: "default",
  },
  other: {
    // A etiqueta que faz o ícone da tela de início abrir sem a barra do Safari.
    //
    // `appleWebApp.capable` já deveria bastar, e bastava: o Next emitia
    // `apple-mobile-web-app-capable`. Da versão 15 em diante ele emite só
    // `mobile-web-app-capable`, o nome padronizado — e o iOS não conhece esse
    // nome. O resultado é um app que se instala, ganha ícone, abre em janela
    // própria… com a barra do navegador por cima, que foi exatamente o que
    // apareceu no aparelho.
    //
    // O manifesto declara `display: "standalone"`, que em tese resolveria
    // sozinho; na prática, no iPhone, não resolveu. Esta linha resolve, e é ela
    // que a Apple documenta.
    "apple-mobile-web-app-capable": "yes",
  },
  // Dinheiro não vai para buscador nenhum.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // A faixa do entalhe precisa disso para o app ocupar a tela toda.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e11" },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-texto antialiased">{children}</body>
    </html>
  );
}
