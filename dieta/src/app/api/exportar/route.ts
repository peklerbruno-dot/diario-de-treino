import { NextResponse } from "next/server";
import { temSessao } from "@/lib/auth";
import { bd } from "@/lib/bd";
import { hoje } from "@/lib/datas";

/**
 * Tudo o que o app guarda, num JSON só: planos, marcações, água, medidas,
 * lembretes, semanas e ajustes. As fotos vão só com os dados (dia, hora,
 * análise): as imagens passariam do limite de 4,5 MB por resposta da Vercel,
 * então o aparelho as baixa uma a uma e monta o ZIP (ver componentes/backup.tsx).
 * As chaves de push dos aparelhos ficam de fora: não servem em outro lugar.
 */
export async function GET() {
  if (!(await temSessao())) return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });
  const [planos, registros, agua, medidas, lembretes, semanas, ajustes, fotos, fotosDoCorpo] = await Promise.all([
    bd.plano.findMany({ include: { refeicoes: true }, orderBy: { criadoEm: "asc" } }),
    bd.registro.findMany({ orderBy: [{ dia: "asc" }, { horario: "asc" }] }),
    bd.agua.findMany({ orderBy: { criadoEm: "asc" } }),
    bd.medida.findMany({ orderBy: { dia: "asc" } }),
    bd.lembrete.findMany(),
    bd.semana.findMany({ orderBy: { criadoEm: "asc" } }),
    bd.ajuste.findMany(),
    bd.foto.findMany({ orderBy: [{ dia: "asc" }, { hora: "asc" }], select: { id: true, dia: true, hora: true, refeicaoId: true, nome: true, analise: true, criadoEm: true } }),
    bd.fotoCorpo.findMany({ orderBy: { dia: "asc" }, select: { id: true, dia: true, nota: true, criadoEm: true } }),
  ]);
  const corpo = JSON.stringify(
    { app: "dieta", versao: 1, exportadoEm: new Date().toISOString(), planos, registros, agua, medidas, lembretes, semanas, ajustes, fotos, fotosDoCorpo },
    null,
    1,
  );
  return new Response(corpo, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="dieta-backup-${hoje()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
