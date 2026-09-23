import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Fotos e PDFs chegam pelas ações do servidor; o padrão de 1 MB barraria um PDF.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
