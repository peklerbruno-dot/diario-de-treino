import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegistrarServiceWorker } from "@/componentes/fila";

export const metadata: Metadata = {
  title: "Viagem",
  description: "Lugares, roteiro e contas da viagem em grupo.",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Viagem", statusBarStyle: "default" },
  icons: { icon: "/icone-192.png", apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }] },
  other: {
    // Sem esta etiqueta o ícone da tela de início abre com as barras do
    // Safari em cima e embaixo. O `appleWebApp.capable` acima deveria bastar,
    // mas do Next 15 em diante ele emite só `mobile-web-app-capable`, que o
    // iOS não conhece — o mesmo tropeço que o Termômetro já tinha resolvido.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6f0" },
    { media: "(prefers-color-scheme: dark)", color: "#141211" },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-texto antialiased">
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
