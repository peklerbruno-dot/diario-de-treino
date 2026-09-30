import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Os prints chegam já reduzidos pelo navegador (ver `src/componentes/prints.tsx`),
    // mas dez deles passam do 1 MB padrão. A Vercel corta em 4,5 MB de qualquer jeito.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
