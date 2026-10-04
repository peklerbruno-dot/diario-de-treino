import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // O service worker nunca pode ficar preso num cache: é por ele que chega a versão nova.
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }] }];
  },
  experimental: {
    // Os prints chegam já reduzidos pelo navegador (ver `src/componentes/prints.tsx`),
    // mas dez deles passam do 1 MB padrão. A Vercel corta em 4,5 MB de qualquer jeito.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
