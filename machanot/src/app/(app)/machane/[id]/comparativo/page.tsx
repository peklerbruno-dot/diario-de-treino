import { prisma } from "@/lib/db";
import { carregarMachane } from "@/lib/carregar";
import { calcular } from "@/lib/calculo";
import { paraInput } from "@/lib/estado";
import type { ResumoMachane } from "@/lib/resumo";
import { TelaComparativo } from "@/components/telas/comparativo";

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const outras = await prisma.machane.findMany({
    where: { id: { not: id } },
    orderBy: [{ ano: "desc" }, { criadoEm: "desc" }],
    select: { id: true },
    take: 8,
  });

  const resumos: ResumoMachane[] = [];
  for (const { id: outroId } of outras) {
    const estado = await carregarMachane(outroId);
    if (!estado) continue;
    const r = calcular(paraInput(estado));
    resumos.push({
      id: estado.id,
      nome: estado.nome,
      ano: estado.ano,
      tipo: estado.tipo,
      diariaCents: estado.diariaCents,
      diasGrandes: estado.diasGrandes,
      diasPequenos: estado.diasPequenos,
      totalPessoas: r.totalPessoas,
      chanichimGrandes: r.chanichimGrandes,
      chanichimPequenos: r.chanichimPequenos,
      custoTotalCents: r.custoTotalCents,
      hospedagemCents: r.hospedagemCents,
      gastosFixosCents: r.gastosFixosCents,
      bolsaCents: r.bolsaCents,
      receitaMadrichimCents: r.receitaMadrichimCents,
      custoPorChanichGrandesCents: r.custoPorChanichGrandesCents,
      custoPorChanichPequenosCents: r.custoPorChanichPequenosCents,
      pesoAplicado: r.pesoAplicado,
      superavitProjetadoCents: r.superavitProjetadoCents,
      precosGrandes: r.precosGrandes,
      precosPequenos: r.precosPequenos,
    });
  }

  return <TelaComparativo outras={resumos} />;
}
