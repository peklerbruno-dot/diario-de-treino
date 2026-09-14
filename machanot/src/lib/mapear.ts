/**
 * Converte a machané do banco (com suas relações) para o estado que viaja até o
 * navegador. Fica separado de `carregar.ts` porque a semente também usa, e ela
 * roda fora do Next.
 */
import type { Prisma } from "@prisma/client";
import type { EstadoMachane, GastoEstado, CategoriaEstado } from "@/lib/estado";

export type MachaneComRelacoes = Prisma.MachaneGetPayload<{
  include: {
    categorias: true;
    gastos: true;
    politica: true;
    duplicadaDe: { select: { id: true; nome: true } };
  };
}>;

const dia = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);

export function paraEstado(
  m: MachaneComRelacoes,
  politica: NonNullable<MachaneComRelacoes["politica"]>,
): EstadoMachane {
  const categorias: CategoriaEstado[] = m.categorias.map((c) => ({
    id: c.id,
    nome: c.nome,
    papel: c.papel,
    turma: c.turma,
    dias: c.dias,
    quantidade: c.quantidade,
    geraHospedagem: c.geraHospedagem,
    contribuicaoCents: c.contribuicaoCents,
    ordem: c.ordem,
  }));

  const gastos: GastoEstado[] = m.gastos.map((g) => ({
    id: g.id,
    descricao: g.descricao,
    tipo: g.tipo,
    categoria: g.categoria,
    valorCents: g.valorCents,
    pessoas: g.pessoas ?? undefined,
    dias: g.dias ?? undefined,
    observacao: g.observacao,
    revisado: g.revisado,
    ordem: g.ordem,
  }));

  return {
    id: m.id,
    nome: m.nome,
    tipo: m.tipo,
    ano: m.ano,
    dataInicio: dia(m.dataInicio),
    dataFim: dia(m.dataFim),
    diariaCents: m.diariaCents,
    diariaTabelaCents: m.diariaTabelaCents,
    diariaObservacao: m.diariaObservacao,
    diasGrandes: m.diasGrandes,
    diasPequenos: m.diasPequenos,
    pesoOverride: m.pesoOverride,
    pesoJustificativa: m.pesoJustificativa,
    pesoOverridePor: m.pesoOverridePor,
    pesoOverrideEm: m.pesoOverrideEm?.toISOString() ?? null,
    status: m.status,
    duplicadaDe: m.duplicadaDe,
    categorias,
    gastos,
    politica: {
      id: politica.id,
      metodo: politica.metodo,
      margemBaseGrandesCents: politica.margemBaseGrandesCents ?? undefined,
      margemBasePequenosCents: politica.margemBasePequenosCents ?? undefined,
      acrescimoNaoSocioCents: politica.acrescimoNaoSocioCents ?? undefined,
      descontoSegundoFilhoCents: politica.descontoSegundoFilhoCents ?? undefined,
      margemBasePct: politica.margemBasePct ?? undefined,
      acrescimoNaoSocioPct: politica.acrescimoNaoSocioPct ?? undefined,
      descontoSegundoFilhoPct: politica.descontoSegundoFilhoPct ?? undefined,
      descontoSegundoFilhoGrandesCents: politica.descontoSegundoFilhoGrandesCents,
      descontoSegundoFilhoPequenosCents: politica.descontoSegundoFilhoPequenosCents,
      descontoSegundoFilhoGrandesPct: politica.descontoSegundoFilhoGrandesPct,
      descontoSegundoFilhoPequenosPct: politica.descontoSegundoFilhoPequenosPct,
      acrescimoSegundaLevaCents: politica.acrescimoSegundaLevaCents,
      superavitAlvoCents: politica.superavitAlvoCents,
      arredondamento: politica.arredondamento,
    },
  };
}
