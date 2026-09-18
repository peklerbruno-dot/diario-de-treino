import { bd } from "@/lib/bd";

export const dynamic = "force-dynamic";

/**
 * "O sistema está de pé e alcança o banco?"
 *
 * Serve para responder isso sem precisar entrar. O banco do Neon adormece
 * sozinho, e a primeira visita do dia é quem o acorda: quando alguém disser que
 * "está travando", abrir este endereço separa banco dormindo de problema de
 * verdade.
 */
export async function GET() {
  try {
    const pessoas = await bd.pessoa.count();
    return Response.json({ ok: true, pessoas });
  } catch (erro) {
    return Response.json(
      { ok: false, erro: erro instanceof Error ? erro.message : "desconhecido" },
      { status: 503 },
    );
  }
}
