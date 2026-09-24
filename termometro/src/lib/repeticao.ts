import { diasNoMes, montarData } from "./datas";

/**
 * Quando um fixo acontece.
 *
 * "Dia 5" dá conta do salário e do aluguel, e não dá conta de metade do resto:
 * a feira é sábado, a diarista vem toda primeira quarta, o boleto do contador
 * vence no último dia útil. Escrever isso como um dia do mês obriga a corrigir
 * à mão todo mês, que é o mesmo que não ter fixo nenhum.
 *
 * As regras que interessam são poucas, e são estas. Não há "a cada N dias" de
 * propósito: ela precisa de uma data-âncora, e uma âncora que ninguém vê é uma
 * fonte de surpresa — o fixo começa a cair num dia que a pessoa não pediu e não
 * tem onde conferir por quê.
 *
 * Dia útil aqui é segunda a sexta, **sem feriado**. Uma tabela de feriados
 * nacionais, estaduais e municipais é um problema que não acaba, e errar por
 * excesso de zelo (dizer que o dia 15 é feriado onde não é) seria pior do que a
 * regra simples e anunciada.
 */
export type Repeticao =
  | { tipo: "TODO_DIA" }
  /** 1 a 31. Num mês que não tem o dia, cai no último — como a planilha fazia. */
  | { tipo: "DIA_DO_MES"; dia: number }
  /** "toda primeira quarta": ordem 1 a 4, ou -1 para a última do mês. */
  | { tipo: "DIA_DA_SEMANA"; ordem: 1 | 2 | 3 | 4 | -1; diaDaSemana: number }
  | { tipo: "DIA_UTIL"; qual: "primeiro" | "ultimo" };

export const DIAS_DA_SEMANA = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

const ORDEM_POR_EXTENSO: Record<string, string> = {
  "1": "primeira",
  "2": "segunda",
  "3": "terceira",
  "4": "quarta",
  "-1": "última",
};

/** Como a regra é guardada no banco: um texto curto, que atravessa a sincronização. */
export function escreverRepeticao(r: Repeticao): string {
  switch (r.tipo) {
    case "TODO_DIA":
      return "todo-dia";
    case "DIA_DO_MES":
      return `dia:${r.dia}`;
    case "DIA_DA_SEMANA":
      return `semana:${r.ordem}:${r.diaDaSemana}`;
    case "DIA_UTIL":
      return `util:${r.qual}`;
  }
}

/**
 * Lê a regra guardada, caindo no campo `dia` quando não há regra escrita.
 *
 * É esse recuo que faz os fixos que já existiam continuarem funcionando sem
 * nenhuma migração de dados: quem foi cadastrado como "dia 5" segue sendo dia 5
 * enquanto ninguém o editar.
 */
export function lerRepeticao(fixo: { dia: number; repeticao?: string | null }): Repeticao {
  const bruto = fixo.repeticao?.trim();
  if (!bruto) return fixo.dia === 0 ? { tipo: "TODO_DIA" } : doDia(fixo.dia);

  if (bruto === "todo-dia") return { tipo: "TODO_DIA" };

  const [chave, a, b] = bruto.split(":");

  if (chave === "dia") return doDia(Number(a));

  if (chave === "semana") {
    const ordem = Number(a);
    const diaDaSemana = Number(b);
    const ordemOk = [1, 2, 3, 4, -1].includes(ordem);
    const diaOk = Number.isInteger(diaDaSemana) && diaDaSemana >= 0 && diaDaSemana <= 6;
    if (ordemOk && diaOk) {
      return { tipo: "DIA_DA_SEMANA", ordem: ordem as 1 | 2 | 3 | 4 | -1, diaDaSemana };
    }
  }

  if (chave === "util" && (a === "primeiro" || a === "ultimo")) {
    return { tipo: "DIA_UTIL", qual: a };
  }

  // Regra que não dá para entender vira o campo `dia`, que sempre existe. Um
  // fixo que some da previsão por causa de um texto torto é pior do que um
  // fixo caindo no dia errado, que se vê e se conserta.
  return fixo.dia === 0 ? { tipo: "TODO_DIA" } : doDia(fixo.dia);
}

const doDia = (dia: number): Repeticao => ({
  tipo: "DIA_DO_MES",
  dia: Number.isFinite(dia) ? Math.min(Math.max(Math.trunc(dia), 1), 31) : 1,
});

/** Em que dias deste mês a regra cai. Sempre em ordem, sempre dias que existem. */
export function diasDoMes(r: Repeticao, ano: number, mes: number): number[] {
  const quantos = diasNoMes(ano, mes);

  switch (r.tipo) {
    case "TODO_DIA":
      return Array.from({ length: quantos }, (_, i) => i + 1);

    case "DIA_DO_MES":
      return [Math.min(r.dia, quantos)];

    case "DIA_DA_SEMANA": {
      const casam: number[] = [];
      for (let dia = 1; dia <= quantos; dia++) {
        if (diaDaSemanaDe(ano, mes, dia) === r.diaDaSemana) casam.push(dia);
      }
      if (casam.length === 0) return [];
      if (r.ordem === -1) return [casam[casam.length - 1]];
      // Um mês pode ter só quatro quartas; pedir a quinta não inventa uma.
      return casam[r.ordem - 1] === undefined ? [] : [casam[r.ordem - 1]];
    }

    case "DIA_UTIL": {
      if (r.qual === "primeiro") {
        for (let dia = 1; dia <= quantos; dia++) {
          if (ehUtil(ano, mes, dia)) return [dia];
        }
        return [];
      }
      for (let dia = quantos; dia >= 1; dia--) {
        if (ehUtil(ano, mes, dia)) return [dia];
      }
      return [];
    }
  }
}

/** 0 = domingo. Lido em UTC, porque a data aqui é dia de caderno e não instante. */
const diaDaSemanaDe = (ano: number, mes: number, dia: number) =>
  new Date(`${montarData(ano, mes, dia)}T12:00:00.000Z`).getUTCDay();

const ehUtil = (ano: number, mes: number, dia: number) => {
  const d = diaDaSemanaDe(ano, mes, dia);
  return d >= 1 && d <= 5;
};

/** Como a regra aparece escrita na lista de fixos. */
export function descreverRepeticao(r: Repeticao): string {
  switch (r.tipo) {
    case "TODO_DIA":
      return "todo dia";
    case "DIA_DO_MES":
      return `dia ${r.dia}`;
    case "DIA_DA_SEMANA":
      return `${ORDEM_POR_EXTENSO[String(r.ordem)]} ${DIAS_DA_SEMANA[r.diaDaSemana]}`;
    case "DIA_UTIL":
      return r.qual === "primeiro" ? "primeiro dia útil" : "último dia útil";
  }
}
