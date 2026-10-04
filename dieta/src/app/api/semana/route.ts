import { NextResponse } from "next/server";
import { temSessao } from "@/lib/auth";
import { bd } from "@/lib/bd";
import { planoAtivo, planoEmTexto } from "@/lib/consultas";
import { hoje } from "@/lib/datas";
import { novoId } from "@/lib/ids";
import { ErroDeLeitura, planejarSemana } from "@/lib/leitor";

/** Gera o planejamento da semana (cardápio, preparo, compras) e guarda. */

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await temSessao())) return NextResponse.json({ erro: "A sessão venceu. Entre de novo." }, { status: 401 });
  const corpo = (await req.json().catch(() => null)) as { preferencias?: string } | null;
  const plano = await planoAtivo();
  if (!plano || plano.refeicoes.length === 0) {
    return NextResponse.json({ erro: "Cadastre o plano da nutricionista primeiro: é dele que sai a semana." }, { status: 400 });
  }
  const preferencias = (corpo?.preferencias ?? "").slice(0, 600);
  try {
    const dados = await planejarSemana(planoEmTexto(plano), preferencias);
    await bd.semana.create({ data: { id: novoId(), inicio: hoje(), dados } });
    // Lembra das preferências para a próxima vez.
    await bd.ajuste.upsert({ where: { chave: "preferenciasDaSemana" }, create: { chave: "preferenciasDaSemana", valor: preferencias }, update: { valor: preferencias } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const erro = e instanceof ErroDeLeitura ? e.message : "Não consegui planejar agora.";
    if (!(e instanceof ErroDeLeitura)) console.error("[semana]", e);
    return NextResponse.json({ erro }, { status: 422 });
  }
}
