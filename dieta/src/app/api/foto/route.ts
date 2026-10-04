import { NextResponse } from "next/server";
import { sugestaoDeMarca } from "@/lib/analise";
import { temSessao } from "@/lib/auth";
import { bd } from "@/lib/bd";
import { escreverTexto, normalizarConteudo } from "@/lib/conteudo";
import { agoraNoFuso, paraHora } from "@/lib/datas";
import { novoId } from "@/lib/ids";
import { analisarPrato } from "@/lib/leitor";

/**
 * Recebe a foto do prato (já reduzida pelo aparelho), guarda, e pede ao Gemini
 * para dizer o que há nela e se bate com a refeição do plano.
 *
 * A foto é salva mesmo quando a leitura falha: ela vale como registro do que
 * se comeu, e a análise é um bônus.
 */

export const maxDuration = 60;
const MAXIMO = 3_000_000;

export async function POST(req: Request) {
  if (!(await temSessao())) return NextResponse.json({ erro: "A sessão venceu. Entre de novo." }, { status: 401 });

  const dados = await req.formData().catch(() => null);
  const arquivo = dados?.get("imagem");
  if (!(arquivo instanceof File) || !arquivo.type.startsWith("image/")) {
    return NextResponse.json({ erro: "Não chegou nenhuma foto." }, { status: 400 });
  }
  if (arquivo.size > MAXIMO) return NextResponse.json({ erro: "Foto grande demais." }, { status: 413 });

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const refeicaoId = String(dados?.get("refeicaoId") ?? "") || null;
  const refeicao = refeicaoId ? await bd.refeicao.findUnique({ where: { id: refeicaoId } }) : null;

  const analise = await analisarPrato(
    { tipo: arquivo.type, base64: bytes.toString("base64") },
    refeicao ? { nome: refeicao.nome, texto: escreverTexto(normalizarConteudo(refeicao.conteudo)), nota: refeicao.nota } : undefined,
  );

  const agora = agoraNoFuso();
  const id = novoId();
  await bd.foto.create({
    data: {
      id,
      dia: agora.dia,
      hora: paraHora(agora.minutos),
      refeicaoId: refeicao?.id ?? null,
      nome: refeicao?.nome ?? "",
      tipo: arquivo.type,
      imagem: bytes,
      analise: analise ?? undefined,
    },
  });

  return NextResponse.json({ id, analise, sugestao: sugestaoDeMarca(analise), dia: agora.dia });
}
