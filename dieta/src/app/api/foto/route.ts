import { NextResponse } from "next/server";
import { sugestaoDeMarca } from "@/lib/analise";
import { temSessao } from "@/lib/auth";
import { bd } from "@/lib/bd";
import { escreverTexto, normalizarConteudo } from "@/lib/conteudo";
import { agoraNoFuso, normalizarHora, paraHora, somarDias } from "@/lib/datas";
import { novoId } from "@/lib/ids";
import { analisarPrato } from "@/lib/leitor";

/**
 * Recebe a foto do prato (já reduzida pelo aparelho) — ou, quando não deu
 * tempo de fotografar, o texto do que se comeu —, guarda, e pede ao Gemini
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
  const texto = String(dados?.get("texto") ?? "").trim().slice(0, 600);
  const temFoto = arquivo instanceof File && arquivo.type.startsWith("image/");
  if (!temFoto && !texto) return NextResponse.json({ erro: "Não chegou nenhuma foto nem texto." }, { status: 400 });
  if (temFoto && arquivo.size > MAXIMO) return NextResponse.json({ erro: "Foto grande demais." }, { status: 413 });

  const bytes = temFoto ? Buffer.from(await arquivo.arrayBuffer()) : null;
  const refeicaoId = String(dados?.get("refeicaoId") ?? "") || null;
  const refeicao = refeicaoId ? await bd.refeicao.findUnique({ where: { id: refeicaoId } }) : null;

  const { analise, semCota } = await analisarPrato(
    { imagem: temFoto && bytes ? { tipo: arquivo.type, base64: bytes.toString("base64") } : null, texto },
    refeicao ? { nome: refeicao.nome, texto: escreverTexto(normalizarConteudo(refeicao.conteudo)), nota: refeicao.nota } : undefined,
  );

  // Foto da galeria pode ser de até uma semana atrás; nunca do futuro.
  const agora = agoraNoFuso();
  const diaPedido = String(dados?.get("dia") ?? "");
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(diaPedido) && diaPedido <= agora.dia && diaPedido >= somarDias(agora.dia, -7) ? diaPedido : agora.dia;
  const hora = normalizarHora(String(dados?.get("hora") ?? "")) ?? paraHora(agora.minutos);
  const id = novoId();
  await bd.foto.create({
    data: {
      id,
      dia,
      hora,
      refeicaoId: refeicao?.id ?? null,
      nome: refeicao?.nome ?? "",
      tipo: temFoto ? arquivo.type : "",
      imagem: bytes,
      texto,
      analise: analise ?? undefined,
    },
  });

  return NextResponse.json({ id, analise, semCota, sugestao: sugestaoDeMarca(analise), dia });
}
