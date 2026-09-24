/**
 * O motor. Função pura, sem banco e sem tela: é a única fonte dos números.
 *
 * É a aba 2026 da planilha, linha por linha:
 *
 *   saldo do dia = saldo de ontem + Entrada − (Saída + Diário)
 *
 * O saldo atravessa o mês e vira para o mês seguinte; o de janeiro começa no
 * saldo de abertura do ano. Por isso o cálculo é sempre do ano inteiro, de uma
 * vez: pedir "só março" seria pedir um número que depende de janeiro.
 *
 * O rodapé de cada mês é o mesmo da planilha (linhas 37 a 44), com duas
 * correções que lá estavam erradas e aqui não dava para repetir:
 *
 *  - a média diária dividia por 30 em mês de 31 dias (e janeiro somava 31 dias
 *    de gasto e dividia por 30); aqui divide pelos dias que o mês tem;
 *  - janeiro não tinha a soma das entradas, então a "performance" do mês saía
 *    como se nada tivesse entrado no ano todo.
 */
import { diasNoMes, montarData, nomeDoMes, partesDaData } from "./datas";
import type { Ajustes, Fixo, Lancamento, Tipo } from "./tipos";

export interface DiaCalculado {
  dia: number;
  data: string;
  entradaCents: number;
  saidaCents: number;
  diarioCents: number;
  /** Saldo ao fim deste dia. */
  saldoCents: number;
  lancamentos: Lancamento[];
  /** Tem pelo menos um lançamento ainda não confirmado. */
  temPrevisto: boolean;
  temLancamento: boolean;
}

export interface TotaisDoMes {
  entradasCents: number;
  saidasCents: number;
  diarioCents: number;
  /** Saídas + Diário: tudo o que saiu. */
  saidaTotalCents: number;
  /** Diário do mês dividido pelos dias do mês. */
  mediaDiariaCents: number;
  /** Só as entradas marcadas como dinheiro seu. */
  entradaPropriaCents: number;
  investidoCents: number;
  /** Investido sobre a entrada própria, em %. `null` quando não houve entrada própria. */
  investidoPercent: number | null;
  /** Entradas − saída total: o que sobrou (ou faltou) no mês. */
  performanceCents: number;
  aptoCents: number;
  /** A parte do apartamento que é da outra pessoa. */
  aptoParteDoOutroCents: number;
  saldoAberturaCents: number;
  saldoFechamentoCents: number;
  /** O menor saldo que o mês alcança — onde o termômetro chega mais perto do zero. */
  saldoMinimoCents: number;
  diaDoSaldoMinimo: number;
  temPrevisto: boolean;
}

export interface MesCalculado {
  ano: number;
  mes: number;
  nome: string;
  dias: DiaCalculado[];
  totais: TotaisDoMes;
}

export interface AnoCalculado {
  ano: number;
  meses: MesCalculado[];
  saldoInicialCents: number;
  saldoFinalCents: number;
  totais: {
    entradasCents: number;
    saidasCents: number;
    diarioCents: number;
    saidaTotalCents: number;
    entradaPropriaCents: number;
    investidoCents: number;
    performanceCents: number;
  };
}

const vivo = (l: Lancamento) => !l.apagadoEm;

/** O ano inteiro, mês a mês, com o saldo encadeado de janeiro a dezembro. */
export function calcularAno(opcoes: {
  ano: number;
  lancamentos: Lancamento[];
  ajustes: Pick<Ajustes, "saldoInicialCents" | "rateioAptoPercent">;
}): AnoCalculado {
  const { ano, ajustes } = opcoes;

  // Um balde por dia, para não varrer a lista inteira doze vezes.
  const porData = new Map<string, Lancamento[]>();
  for (const l of opcoes.lancamentos) {
    if (!vivo(l)) continue;
    if (partesDaData(l.data).ano !== ano) continue;
    const balde = porData.get(l.data);
    if (balde) balde.push(l);
    else porData.set(l.data, [l]);
  }

  const meses: MesCalculado[] = [];
  let saldo = ajustes.saldoInicialCents;

  for (let mes = 1; mes <= 12; mes++) {
    const saldoAbertura = saldo;
    const dias: DiaCalculado[] = [];

    let entradas = 0;
    let saidas = 0;
    let diario = 0;
    let entradaPropria = 0;
    let investido = 0;
    let apto = 0;
    let temPrevisto = false;
    let saldoMinimo = Number.POSITIVE_INFINITY;
    let diaDoSaldoMinimo = 1;

    const quantosDias = diasNoMes(ano, mes);
    for (let dia = 1; dia <= quantosDias; dia++) {
      const data = montarData(ano, mes, dia);
      const doDia = (porData.get(data) ?? []).slice().sort(ordemDeExibicao);

      let e = 0;
      let s = 0;
      let d = 0;
      let previstoNoDia = false;

      for (const l of doDia) {
        if (l.previsto) previstoNoDia = true;
        if (l.tipo === "ENTRADA") {
          e += l.valorCents;
          if (l.rendaPropria) entradaPropria += l.valorCents;
        } else if (l.tipo === "SAIDA") {
          s += l.valorCents;
          if (l.investimento) investido += l.valorCents;
          if (l.apartamento) apto += l.valorCents;
        } else {
          d += l.valorCents;
        }
      }

      saldo = saldo + e - (s + d);
      entradas += e;
      saidas += s;
      diario += d;
      if (previstoNoDia) temPrevisto = true;
      if (saldo < saldoMinimo) {
        saldoMinimo = saldo;
        diaDoSaldoMinimo = dia;
      }

      dias.push({
        dia,
        data,
        entradaCents: e,
        saidaCents: s,
        diarioCents: d,
        saldoCents: saldo,
        lancamentos: doDia,
        temPrevisto: previstoNoDia,
        temLancamento: doDia.length > 0,
      });
    }

    const saidaTotal = saidas + diario;
    meses.push({
      ano,
      mes,
      nome: nomeDoMes(mes),
      dias,
      totais: {
        entradasCents: entradas,
        saidasCents: saidas,
        diarioCents: diario,
        saidaTotalCents: saidaTotal,
        mediaDiariaCents: Math.round(diario / quantosDias),
        entradaPropriaCents: entradaPropria,
        investidoCents: investido,
        investidoPercent: entradaPropria > 0 ? (investido / entradaPropria) * 100 : null,
        performanceCents: entradas - saidaTotal,
        aptoCents: apto,
        aptoParteDoOutroCents: Math.round((apto * ajustes.rateioAptoPercent) / 100),
        saldoAberturaCents: saldoAbertura,
        saldoFechamentoCents: saldo,
        saldoMinimoCents: saldoMinimo === Number.POSITIVE_INFINITY ? saldoAbertura : saldoMinimo,
        diaDoSaldoMinimo,
        temPrevisto,
      },
    });
  }

  const soma = (pegar: (m: MesCalculado) => number) => meses.reduce((t, m) => t + pegar(m), 0);

  return {
    ano,
    meses,
    saldoInicialCents: ajustes.saldoInicialCents,
    saldoFinalCents: saldo,
    totais: {
      entradasCents: soma((m) => m.totais.entradasCents),
      saidasCents: soma((m) => m.totais.saidasCents),
      diarioCents: soma((m) => m.totais.diarioCents),
      saidaTotalCents: soma((m) => m.totais.saidaTotalCents),
      entradaPropriaCents: soma((m) => m.totais.entradaPropriaCents),
      investidoCents: soma((m) => m.totais.investidoCents),
      performanceCents: soma((m) => m.totais.performanceCents),
    },
  };
}

/** Entradas primeiro, depois saídas, depois o diário; o confirmado antes do previsto. */
function ordemDeExibicao(a: Lancamento, b: Lancamento): number {
  const peso: Record<Tipo, number> = { ENTRADA: 0, SAIDA: 1, DIARIO: 2 };
  if (peso[a.tipo] !== peso[b.tipo]) return peso[a.tipo] - peso[b.tipo];
  if (!!a.previsto !== !!b.previsto) return a.previsto ? 1 : -1;
  return (a.criadoEm ?? "").localeCompare(b.criadoEm ?? "");
}

/**
 * Onde o saldo passa a ser negativo daqui para a frente, se nada mudar.
 * É a pergunta que a planilha existia para responder: "dá até o fim do mês?"
 */
export function primeiroDiaNoVermelho(ano: AnoCalculado, apartirDe: string): DiaCalculado | null {
  for (const mes of ano.meses) {
    for (const dia of mes.dias) {
      if (dia.data < apartirDe) continue;
      if (dia.saldoCents < 0) return dia;
    }
  }
  return null;
}

/** O dia de hoje dentro do ano calculado (ou o último dia, se o ano já passou). */
export function diaDoAno(ano: AnoCalculado, data: string): DiaCalculado | null {
  const { ano: a, mes, dia } = partesDaData(data);
  if (a !== ano.ano) return null;
  return ano.meses[mes - 1]?.dias[dia - 1] ?? null;
}

/**
 * A previsão: pega o que se repete todo mês e escreve nos dias que ainda não
 * chegaram. Um fixo nunca é escrito duas vezes no mesmo dia — se já houver
 * lançamento nascido dele naquela data, ele é pulado.
 *
 * Fixo marcado para o dia 31 num mês de 30 caiu no dia 30. Na planilha ele caía
 * numa linha 31 que não existia em novembro: R$ 8.000 de investimento lançados
 * num dia que o calendário não tem, e que mesmo assim entravam na conta.
 */
export function gerarPrevisao(opcoes: {
  fixos: Fixo[];
  de: string;
  ate: string;
  existentes: Lancamento[];
  agora?: string;
  novoId?: () => string;
}): Lancamento[] {
  const { de, ate } = opcoes;
  if (ate < de) return [];

  const agora = opcoes.agora ?? new Date().toISOString();
  const novoId = opcoes.novoId ?? (() => crypto.randomUUID());

  const jaExiste = new Set<string>();
  for (const l of opcoes.existentes) {
    if (!vivo(l) || !l.fixoId) continue;
    jaExiste.add(`${l.fixoId}|${l.data}`);
  }

  const fixos = opcoes.fixos.filter((f) => !f.apagadoEm && f.ativo !== false && f.valorCents > 0);
  const novos: Lancamento[] = [];

  const inicio = partesDaData(de);
  const fim = partesDaData(ate);

  for (let ano = inicio.ano; ano <= fim.ano; ano++) {
    const mesInicial = ano === inicio.ano ? inicio.mes : 1;
    const mesFinal = ano === fim.ano ? fim.mes : 12;

    for (let mes = mesInicial; mes <= mesFinal; mes++) {
      const quantosDias = diasNoMes(ano, mes);

      for (const fixo of fixos) {
        const diasAlvo =
          fixo.dia === 0
            ? Array.from({ length: quantosDias }, (_, i) => i + 1)
            : [Math.min(fixo.dia, quantosDias)];

        for (const dia of diasAlvo) {
          const data = montarData(ano, mes, dia);
          if (data < de || data > ate) continue;
          if (jaExiste.has(`${fixo.id}|${data}`)) continue;
          jaExiste.add(`${fixo.id}|${data}`);

          novos.push({
            id: novoId(),
            data,
            tipo: fixo.tipo,
            valorCents: fixo.valorCents,
            nota: fixo.nota ?? null,
            previsto: true,
            rendaPropria: !!fixo.rendaPropria,
            investimento: !!fixo.investimento,
            apartamento: !!fixo.apartamento,
            fixoId: fixo.id,
            criadoEm: agora,
            atualizadoEm: agora,
            apagadoEm: null,
          });
        }
      }
    }
  }

  return novos;
}
