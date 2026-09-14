import type { GradePrecos } from "@/lib/calculo";

/** O recorte de uma machané que o comparativo (tela 9) precisa. */
export interface ResumoMachane {
  id: string;
  nome: string;
  ano: number;
  tipo: "KAITZ" | "CHOREF";
  diariaCents: number;
  diasGrandes: number;
  diasPequenos: number;
  totalPessoas: number;
  chanichimGrandes: number;
  chanichimPequenos: number;
  custoTotalCents: number;
  hospedagemCents: number;
  gastosFixosCents: number;
  bolsaCents: number;
  receitaMadrichimCents: number;
  custoPorChanichGrandesCents: number;
  custoPorChanichPequenosCents: number;
  pesoAplicado: number;
  superavitProjetadoCents: number;
  precosGrandes: GradePrecos;
  precosPequenos: GradePrecos;
}
