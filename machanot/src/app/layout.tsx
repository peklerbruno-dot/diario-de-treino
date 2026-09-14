import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Precificação de machanot — Chazit Hanoar",
  description: "Orçamento, rateio e grade de preços das machanot.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
