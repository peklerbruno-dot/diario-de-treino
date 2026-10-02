import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dieta",
  description: "O plano da nutricionista, um aviso na hora de cada refeição e a água do dia.",
  icons: {
    icon: [{ url: "/icone-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Dieta", statusBarStyle: "default" },
  // O Next 15 só emite `mobile-web-app-capable`, que o iOS não conhece. Sem esta
  // linha o ícone da tela de início abre com a barra do Safari por cima — e,
  // fora do modo app, o iPhone nem oferece notificações.
  other: { "apple-mobile-web-app-capable": "yes" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0f100e" },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-texto antialiased">{children}</body>
    </html>
  );
}
