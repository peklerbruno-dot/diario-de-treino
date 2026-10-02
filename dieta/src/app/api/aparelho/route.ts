import { NextResponse } from "next/server";
import { temSessao } from "@/lib/auth";
import { bd } from "@/lib/bd";

/**
 * Cadastra (POST) ou retira (DELETE) o aparelho que vai receber os avisos.
 * O corpo é a "inscrição" que o navegador entrega ao aceitar notificações.
 */

type Inscricao = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

export async function POST(req: Request) {
  if (!(await temSessao())) return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });
  const corpo = (await req.json().catch(() => null)) as { inscricao?: Inscricao; nome?: string } | null;
  const i = corpo?.inscricao;
  if (!i?.endpoint || !i.keys?.p256dh || !i.keys?.auth || !/^https:\/\//.test(i.endpoint)) {
    return NextResponse.json({ erro: "Inscrição inválida." }, { status: 400 });
  }
  const dados = { p256dh: i.keys.p256dh, auth: i.keys.auth, nome: (corpo?.nome ?? "").slice(0, 60) };
  await bd.aparelho.upsert({ where: { endpoint: i.endpoint }, create: { endpoint: i.endpoint, ...dados }, update: dados });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await temSessao())) return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });
  const corpo = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (corpo?.endpoint) await bd.aparelho.deleteMany({ where: { endpoint: corpo.endpoint } });
  return NextResponse.json({ ok: true });
}
