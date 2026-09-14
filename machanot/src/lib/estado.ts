/**
 * O estado de uma machané como ele viaja do servidor para o navegador.
 *
 * É o que alimenta o motor de cálculo no cliente: toda tela edita este objeto,
 * o painel lateral recalcula na hora e o salvamento acontece em paralelo.
 * Nenhum campo de dinheiro aqui é Float — tudo em centavos.
 */
import type { CategoriaInput, GastoInput, MachaneInput, PoliticaInput } from "@/lib/calculo";

export type TipoMachane = "KAITZ" | "CHOREF";
export type Arredondamento = PoliticaInput["arredondamento"];
export type MetodoPreco = PoliticaInput["metodo"];
export type StatusMachane = "RASCUNHO" | "EM_REVISAO" | "PUBLICADA" | "ENCERRADA";
export type CategoriaGasto =
  | "TRANSPORTE"
  | "ALIMENTACAO"
  | "SAUDE"
  | "SEGURANCA"
  | "MATERIAL"
  | "BOLSA"
  | "ESTRUTURA"
  | "OUTROS";

export interface CategoriaEstado extends CategoriaInput {
  ordem: number;
}

export interface GastoEstado extends GastoInput {
  categoria: CategoriaGasto;
  observacao: string;
  revisado: boolean;
  ordem: number;
}

export interface PoliticaEstado extends PoliticaInput {
  id: string;
}

export interface EstadoMachane {
  id: string;
  nome: string;
  tipo: TipoMachane;
  ano: number;
  dataInicio: string | null;
  dataFim: string | null;

  diariaCents: number;
  diariaTabelaCents: number | null;
  diariaObservacao: string | null;

  diasGrandes: number;
  diasPequenos: number;

  pesoOverride: number | null;
  pesoJustificativa: string | null;
  pesoOverridePor: string | null;
  pesoOverrideEm: string | null;

  status: StatusMachane;
  duplicadaDe: { id: string; nome: string } | null;

  categorias: CategoriaEstado[];
  gastos: GastoEstado[];
  politica: PoliticaEstado;
}

/** O recorte que o motor de cálculo enxerga. */
export function paraInput(e: EstadoMachane): MachaneInput {
  return {
    diariaCents: e.diariaCents,
    diasGrandes: e.diasGrandes,
    diasPequenos: e.diasPequenos,
    pesoOverride: e.pesoOverride,
    categorias: e.categorias,
    gastos: e.gastos,
    politica: e.politica,
  };
}

/** Gastos herdados de uma duplicação que ninguém conferiu ainda (§12, fase 4). */
export const gastosNaoRevisados = (e: EstadoMachane): GastoEstado[] =>
  e.gastos.filter((g) => !g.revisado);

export function podePublicar(e: EstadoMachane): { pode: boolean; motivos: string[] } {
  const motivos: string[] = [];
  const naoRevisados = gastosNaoRevisados(e);
  if (naoRevisados.length > 0) {
    motivos.push(
      `${naoRevisados.length} ${naoRevisados.length === 1 ? "gasto herdado ainda não foi revisado" : "gastos herdados ainda não foram revisados"}.`,
    );
  }
  if (e.categorias.filter((c) => c.papel === "CHANICH").reduce((s, c) => s + c.quantidade, 0) === 0) {
    motivos.push("Nenhum chanich cadastrado — não há para quem ratear o custo.");
  }
  if (e.diariaCents <= 0) motivos.push("A diária ainda está zerada.");
  // Linha zerada é rascunho do modelo padrão: não faz sentido exigir a origem
  // de um número que ainda não existe.
  const semObservacao = e.gastos.filter((g) => g.valorCents !== 0 && !g.observacao.trim());
  if (semObservacao.length > 0) {
    motivos.push(
      `${semObservacao.length} gasto(s) sem observação — é preciso dizer de onde veio o número.`,
    );
  }
  if (e.pesoOverride !== null && !e.pesoJustificativa?.trim()) {
    motivos.push("O peso foi ajustado à mão e está sem justificativa.");
  }
  return { pode: motivos.length === 0, motivos };
}
