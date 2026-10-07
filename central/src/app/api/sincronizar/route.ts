import { iguais, temSessao } from "@/lib/auth";
import { sincronizarTudo } from "@/lib/sincronizar";

export const dynamic = "force-dynamic";
// Três contas e algumas dezenas de conversas para triar levam tempo.
export const maxDuration = 300;

/** O agendador diário da Vercel chega com "Bearer <CRON_SECRET>". */
function ehOAgendador(req: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  const veio = req.headers.get("authorization") ?? "";
  return Boolean(segredo) && iguais(veio, `Bearer ${segredo}`);
}

async function rodar(req: Request) {
  if (!ehOAgendador(req) && !(await temSessao())) {
    return Response.json({ erro: "Sem sessão." }, { status: 401 });
  }
  return Response.json(await sincronizarTudo());
}

export const GET = rodar;
export const POST = rodar;
