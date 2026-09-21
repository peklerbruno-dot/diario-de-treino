import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Centro de Estudos Judaicos — USP",
  description: "Atividades, reuniões e encaminhamentos do Centro de Estudos Judaicos da USP.",
  // É o sistema interno de uma equipe, não o site do Centro: não vai para
  // buscador nenhum.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#121215" },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-texto antialiased">{children}</body>
    </html>
  );
}
