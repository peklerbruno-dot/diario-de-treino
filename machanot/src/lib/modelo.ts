/**
 * O ponto de partida de uma machané nova.
 *
 * A coordenação não deveria começar de uma tela em branco: as linhas de custo
 * se repetem a cada edição — ônibus, enfermeira, seguro, bolsas. Aqui elas já
 * vêm listadas com valor zero, para preencher em vez de inventar. Sobrou linha,
 * apaga; faltou, acrescenta.
 */
import type { Papel, Turma } from "@/lib/calculo";
import type { CategoriaGasto } from "@/lib/estado";

export interface CategoriaPadrao {
  nome: string;
  papel: Papel;
  turma: Turma;
}

/** Quem costuma ir. Todas as quantidades começam em zero. */
export const CATEGORIAS_PADRAO: CategoriaPadrao[] = [
  { nome: "chanichim grandes", papel: "CHANICH", turma: "GRANDES" },
  { nome: "chanichim pequenos", papel: "CHANICH", turma: "PEQUENOS" },
  { nome: "madrichim grandes", papel: "MADRICH", turma: "GRANDES" },
  { nome: "madrichim pequenos", papel: "MADRICH", turma: "PEQUENOS" },
  { nome: "PTs grandes", papel: "PT", turma: "GRANDES" },
  { nome: "PTs pequenos", papel: "PT", turma: "PEQUENOS" },
  { nome: "equipe", papel: "EQUIPE", turma: "GRANDES" },
  { nome: "seguranças", papel: "PRESTADOR", turma: "GRANDES" },
];

export interface GastoPadrao {
  descricao: string;
  categoria: CategoriaGasto;
  tipo: "VALOR_FECHADO" | "POR_PESSOA" | "CACHE_DIARIO";
  /** Dica de preenchimento, não observação de verdade. */
  ajuda: string;
}

/**
 * Os gastos que aparecem em toda machané, com valor zero.
 *
 * Nenhum deles é do tipo "por diária" de propósito: numa machané nova, a
 * hospedagem de equipe e prestadores entra pela tela de Pessoas, com a coluna
 * "gera hospedagem" marcada. Misturar os dois modelos é o que fazia a diária
 * ser contada duas vezes na planilha (§6).
 */
export const GASTOS_PADRAO: GastoPadrao[] = [
  { descricao: "ônibus", categoria: "TRANSPORTE", tipo: "VALOR_FECHADO", ajuda: "orçamento da empresa de ônibus" },
  { descricao: "carro de apoio", categoria: "TRANSPORTE", tipo: "VALOR_FECHADO", ajuda: "aluguel e combustível" },
  { descricao: "passagem dos shagririm", categoria: "TRANSPORTE", tipo: "VALOR_FECHADO", ajuda: "passagens aéreas" },
  { descricao: "alimentação extra", categoria: "ALIMENTACAO", tipo: "VALOR_FECHADO", ajuda: "carne e o que não entra na diária" },
  { descricao: "enfermeira (cachê)", categoria: "SAUDE", tipo: "VALOR_FECHADO", ajuda: "o serviço dela, fora a hospedagem" },
  { descricao: "psicóloga (cachê)", categoria: "SAUDE", tipo: "VALOR_FECHADO", ajuda: "o serviço dela, fora a hospedagem" },
  { descricao: "ambulância", categoria: "SAUDE", tipo: "VALOR_FECHADO", ajuda: "plantão ou deslocamento" },
  { descricao: "remédios e farmácia", categoria: "SAUDE", tipo: "VALOR_FECHADO", ajuda: "reposição da enfermaria" },
  { descricao: "seguro", categoria: "SAUDE", tipo: "POR_PESSOA", ajuda: "valor por pessoa — o sistema multiplica pelo total" },
  { descricao: "segurança (cachê)", categoria: "SEGURANCA", tipo: "CACHE_DIARIO", ajuda: "valor de um segurança por dia" },
  { descricao: "material de peulá", categoria: "MATERIAL", tipo: "VALOR_FECHADO", ajuda: "papelaria, tinta, prêmios" },
  { descricao: "fundo de bolsas", categoria: "BOLSA", tipo: "VALOR_FECHADO", ajuda: "quanto o movimento reserva para quem não pode pagar" },
];
