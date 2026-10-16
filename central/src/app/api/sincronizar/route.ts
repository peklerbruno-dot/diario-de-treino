import { iguais, temSessao } from "@/lib/auth";
import { sincronizarTudo } from "@/lib/sincronizar";

export const dynamic = "force-dynamic";
// Três contas e algumas dezenas de conversas para triar levam tempo.
export const maxDuration = 300;

/**
 * Quem pode rodar sem sessão: o agendador diário da Vercel, que chega com
 * "Bearer <CRON_SECRET>", e um agendador de fora (cron-job.org, a cada meia
 * hora), que pode mandar o mesmo segredo no endereço: ?chave=<CRON_SECRET>.
 */
function ehOAgendador(req: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  const cabecalho = req.headers.get("authorization") ?? "";
  const naUrl = new URL(req.url).searchParams.get("chave") ?? "";
  return iguais(cabecalho, `Bearer ${segredo}`) || iguais(naUrl, segredo);
}

async function rodar(req: Request) {
  if (!ehOAgendador(req) && !(await temSessao())) {
    return Response.json({ erro: "Sem sessão." }, { status: 401 });
  }
  return Response.json(await sincronizarTudo());
}

export const GET = rodar;
export const POST = rodar;
