import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Central",
  description: "As suas caixas de e-mail num lugar só, triadas, com rascunhos de resposta.",
  icons: {
    icon: [{ url: "/icone-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Central", statusBarStyle: "default" },
  // O Next 15 só emite o nome padronizado, que o iOS não conhece: sem esta
  // linha o app da tela de início abre com a barra do Safari por cima.
  other: { "apple-mobile-web-app-capable": "yes" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
