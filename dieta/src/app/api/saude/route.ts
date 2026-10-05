import { NextResponse } from "next/server";
import { bd } from "@/lib/bd";

/**
 * Só para saber se o app está de pé — não pede sessão. Com `?bd=1`, mede
 * também quanto o banco demora a responder um `SELECT 1` (duas vezes: a
 * primeira inclui abrir a conexão e, se ele estiver dormindo, acordá-lo).
 * É o que diz se a lentidão é do servidor, do banco ou da distância entre eles.
 */
export async function GET(req: Request) {
  const resposta: Record<string, unknown> = { ok: true, agora: new Date().toISOString(), regiao: process.env.VERCEL_REGION ?? "local" };
  if (new URL(req.url).searchParams.get("bd")) {
    const medir = async () => {
      const t = performance.now();
      await bd.$queryRaw`SELECT 1`;
      return Math.round(performance.now() - t);
    };
    try {
      resposta.bdPrimeiraMs = await medir();
      resposta.bdDepoisMs = await medir();
    } catch {
      resposta.bd = "sem resposta";
    }
  }
  return NextResponse.json(resposta, { headers: { "Cache-Control": "no-store" } });
}
