import "server-only";
import { bd } from "./bd";
import { dividasPorPar, naBase, saldos, simplificar } from "./contas";

export const membrosDaViagem = (viagemId: string, incluirQuemSaiu = false) =>
  bd.membro.findMany({
    where: { viagemId, ...(incluirQuemSaiu ? {} : { saiuEm: null }) },
    orderBy: { criadoEm: "asc" },
  });

/** Tudo que a aba Contas mostra, calculado de uma vez. */
export async function contasDaViagem(viagemId: string) {
  const [membros, despesas, pagamentos] = await Promise.all([
    membrosDaViagem(viagemId, true),
    bd.despesa.findMany({
      where: { viagemId, apagadoEm: null },
      include: { pagadores: true, partes: true },
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
    }),
    bd.pagamento.findMany({ where: { viagemId, apagadoEm: null }, orderBy: [{ data: "desc" }, { criadoEm: "desc" }] }),
  ]);

  const paraSaldo = despesas.map((d) => ({ valor: d.valor, cambio: d.cambio, pagadores: d.pagadores, partes: d.partes }));
  const lista = saldos(
    membros.map((m) => m.id),
    paraSaldo,
    pagamentos,
  );
  const totalDoGrupo = paraSaldo.reduce((a, d) => a + naBase(d).total, 0);

  const porCategoria = new Map<string, number>();
  for (const d of despesas) porCategoria.set(d.categoria, (porCategoria.get(d.categoria) ?? 0) + naBase(d).total);

  return {
    membros,
    despesas,
    pagamentos,
    saldos: lista,
    simplificadas: simplificar(lista),
    porPar: dividasPorPar(paraSaldo, pagamentos),
    totalDoGrupo,
    porCategoria: [...porCategoria.entries()].sort((a, b) => b[1] - a[1]),
  };
}

export const importacoesPendentes = (viagemId: string) =>
  bd.importacao.count({ where: { viagemId, estado: { in: ["pronta", "falhou", "pendente"] } } });
