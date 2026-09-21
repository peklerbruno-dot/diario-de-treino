import { pessoaAtual } from "@/lib/auth";
import { atividadesEntre } from "@/lib/consultas";
import { entraNoRelatorio, paraPlanilha } from "@/lib/relatorio";
import { periodoPedido } from "@/lib/periodo";

export const dynamic = "force-dynamic";

/** A planilha do relatório. Mesmo recorte da tela, mesmo filtro. */
export async function GET(pedido: Request) {
  if (!(await pessoaAtual())) return new Response("Entre no sistema primeiro.", { status: 401 });

  const endereco = new URL(pedido.url);
  const { de, ate } = periodoPedido({
    de: endereco.searchParams.get("de") ?? undefined,
    ate: endereco.searchParams.get("ate") ?? undefined,
  });

  const atividades = (await atividadesEntre(de, ate)).filter(entraNoRelatorio);

  const csv = paraPlanilha(
    atividades.map((a) => ({
      ...a,
      responsavelNome: a.responsavel?.nome ?? null,
      convidados: a.convidados,
    })),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="atividades-cej-${de}-a-${ate}.csv"`,
    },
  });
}
