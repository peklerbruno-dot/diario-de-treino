import { NextResponse } from "next/server";
import { sugestaoDeMarca } from "@/lib/analise";
import { temSessao } from "@/lib/auth";
import { bd } from "@/lib/bd";
import { escreverTexto, normalizarConteudo } from "@/lib/conteudo";
import { analisarPrato } from "@/lib/leitor";

export const maxDuration = 60;

/** A imagem de uma foto do prato. Só para quem entrou. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await temSessao())) return new Response("Sem sessão.", { status: 401 });
  const { id } = await params;
  const foto = await bd.foto.findUnique({ where: { id }, select: { imagem: true, tipo: true } });
  if (!foto?.imagem) return new Response("Não achei essa foto.", { status: 404 });
  return new Response(new Uint8Array(foto.imagem), {
    headers: {
      "Content-Type": foto.tipo,
      // A foto nunca muda depois de salva: o aparelho pode guardar à vontade.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

/**
 * Analisa de novo uma foto já salva: a que ficou sem leitura porque a cota do
 * Gemini tinha acabado na hora, ou a que a pessoa corrigiu ("era peito de
 * peru", corpo JSON `{ correcao }`). A imagem já está no banco: não precisa
 * enviar de novo.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await temSessao())) return NextResponse.json({ erro: "A sessão venceu. Entre de novo." }, { status: 401 });
  const { id } = await params;
  const foto = await bd.foto.findUnique({ where: { id } });
  if (!foto) return NextResponse.json({ erro: "Não achei essa foto." }, { status: 404 });
  const refeicao = foto.refeicaoId ? await bd.refeicao.findUnique({ where: { id: foto.refeicaoId } }) : null;

  const pedido = (await req.json().catch(() => ({}))) as { correcao?: unknown };
  const correcao = typeof pedido.correcao === "string" && pedido.correcao.trim() ? pedido.correcao.trim().slice(0, 400) : foto.correcao;

  const { analise, semCota } = await analisarPrato(
    {
      imagem: foto.imagem && foto.tipo ? { tipo: foto.tipo, base64: Buffer.from(foto.imagem).toString("base64") } : null,
      texto: foto.texto,
      correcao,
      anterior: correcao ? foto.analise : undefined,
    },
    refeicao ? { nome: refeicao.nome, texto: escreverTexto(normalizarConteudo(refeicao.conteudo)), nota: refeicao.nota } : undefined,
  );
  if (!analise) {
    return NextResponse.json(
      { erro: semCota ? "A cota do Gemini ainda não voltou. Tente mais tarde." : "Não consegui analisar agora. Tente de novo." },
      { status: semCota ? 429 : 422 },
    );
  }
  await bd.foto.update({ where: { id }, data: { analise, correcao } });
  return NextResponse.json({ analise, sugestao: sugestaoDeMarca(analise) });
}
