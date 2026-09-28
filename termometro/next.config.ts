import type { NextConfig } from "next";

/**
 * A versão deste build, carimbada no código do servidor E do aparelho.
 *
 * Um app da tela de início no iPhone fica congelado em segundo plano e, ao
 * voltar, retoma a página antiga sem recarregar — pode ficar dias numa versão
 * velha depois de uma atualização. Com a mesma etiqueta nos dois lados, o
 * aparelho percebe na primeira sincronização que o servidor mudou e se
 * recarrega sozinho (ver `loja.ts`). Na Vercel é o commit; na máquina local,
 * "local", e aí nunca há diferença para detectar.
 */
const VERSAO =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || process.env.VERCEL_DEPLOYMENT_ID || "local";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  env: { NEXT_PUBLIC_VERSAO: VERSAO },
};

export default nextConfig;
