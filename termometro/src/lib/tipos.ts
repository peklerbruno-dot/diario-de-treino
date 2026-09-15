export type Tipo = "ENTRADA" | "SAIDA" | "DIARIO";

export const TIPOS: Tipo[] = ["ENTRADA", "SAIDA", "DIARIO"];

export const NOME_DO_TIPO: Record<Tipo, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  DIARIO: "Diário",
};

/** O que cada coluna quer dizer, na primeira vez que a pessoa abre o app. */
export const EXPLICACAO_DO_TIPO: Record<Tipo, string> = {
  ENTRADA: "Dinheiro que entrou: salário, freela, reembolso, resgate.",
  SAIDA: "Conta grande e prevista: fatura, aluguel, parcela, investimento.",
  DIARIO: "O gasto solto do dia a dia: mercado, almoço, aplicativo, farmácia.",
};

export interface Lancamento {
  id: string;
  data: string; // "2026-01-14"
  tipo: Tipo;
  valorCents: number;
  nota?: string | null;
  previsto?: boolean;
  rendaPropria?: boolean;
  investimento?: boolean;
  apartamento?: boolean;
  fixoId?: string | null;
  criadoEm?: string;
  atualizadoEm?: string;
  apagadoEm?: string | null;
}

export interface Fixo {
  id: string;
  tipo: Tipo;
  /** 1 a 31; 0 = todo dia. */
  dia: number;
  valorCents: number;
  nota?: string | null;
  rendaPropria?: boolean;
  investimento?: boolean;
  apartamento?: boolean;
  ativo?: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
  apagadoEm?: string | null;
}

export interface Ajustes {
  /** Saldo com que o ano começa — na planilha era a última célula de dezembro anterior. */
  saldoInicialCents: number;
  ano: number;
  /** Quanto das saídas do apartamento é da outra pessoa, em % (a planilha usava 40). */
  rateioAptoPercent: number;
}

export const AJUSTES_PADRAO: Ajustes = {
  saldoInicialCents: 0,
  ano: new Date().getFullYear(),
  rateioAptoPercent: 40,
};
