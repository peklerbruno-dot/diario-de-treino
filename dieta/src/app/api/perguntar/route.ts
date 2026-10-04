import { NextResponse } from "next/server";
import { temSessao } from "@/lib/auth";
import { planoAtivo, planoEmTexto } from "@/lib/consultas";
import { ErroDeLeitura, perguntarTroca } from "@/lib/leitor";

/** "Posso trocar isso?" — responde com base no plano em uso. */

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await temSessao())) return NextResponse.json({ erro: "A sessão venceu. Entre de novo." }, { status: 401 });
  const corpo = (await req.json().catch(() => null)) as { pergunta?: string; refeicaoId?: string } | null;
  const pergunta = (corpo?.pergunta ?? "").trim();
  if (pergunta.length < 3) return NextResponse.json({ erro: "Escreva a pergunta." }, { status: 400 });

  const plano = await planoAtivo();
  if (!plano) return NextResponse.json({ erro: "Ainda não há plano para comparar. Cadastre o plano primeiro." }, { status: 400 });
  const refeicao = plano.refeicoes.find((r) => r.id === corpo?.refeicaoId);

  try {
    const resposta = await perguntarTroca(pergunta, planoEmTexto(plano), refeicao ? `${refeicao.nome} (${refeicao.horario})` : undefined);
    return NextResponse.json({ resposta });
  } catch (e) {
    const erro = e instanceof ErroDeLeitura ? e.message : "Não consegui responder agora.";
    return NextResponse.json({ erro }, { status: 422 });
  }
}
