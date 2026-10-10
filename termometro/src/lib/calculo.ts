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
import { diasDoMes, lerRepeticao } from "./repeticao";
import type { Ajustes, Fixo, Lancamento, Tipo } from "./tipos";

export interface DiaCalculado {
  dia: number;
  data: string;
  entradaCents: number;
  saidaCents: number;
  diarioCents: number;
  /** O que foi comprado no crédito: vai para a fatura, e não mexe no saldo. */
  creditoCents: number;
  /** Saldo ao fim deste dia. */
  saldoCents: number;
  lancamentos: Lancamento[];
  /** Tem pelo menos um lançamento ainda não confirmado (e que ainda conta). */
  temPrevisto: boolean;
  temLancamento: boolean;
  /**
   * Houve gasto de verdade no dia, então os R$ 60 previstos do diário não
   * contam: o real substitui a previsão, não se soma a ela.
   */
  diarioSubstituido: boolean;
  /**
   * Os R$ 60 previstos deste dia não entram na conta: ou o gasto real os
   * substituiu, ou o dia é hoje ou já passou e ninguém lançou nada. A previsão
   * do diário só vale para os dias que ainda não chegaram.
   */
  diarioPrevistoFora: boolean;
}

export interface TotaisDoMes {
  entradasCents: number;
  saidasCents: number;
  diarioCents: number;
  /** Saídas + Diário: tudo o que saiu. */
  saidaTotalCents: number;
  /** Compras no crédito do mês: ficam fora de tudo acima, e vão para a fatura. */
  creditoCents: number;
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

/**
 * Os previstos do diário que o gasto de verdade já substituiu.
 *
 * O fixo "gasto do dia" escreve, para cada dia que vem, uma estimativa (R$ 60).
 * Quando o dia ganha um gasto real — o botão do Gastei, a notificação do
 * banco — a estimativa deixa de valer: contar as duas coisas gastaria o mesmo
 * dia duas vezes. Substituir (e não abater) é a regra de propósito: ela é
 * simples de explicar, e o real passa a ser o único número do dia.
 *
 * Só o DIARIO tem essa regra. Salário e fatura previstos ficam até a pessoa (ou
 * a notificação) os confirmar, e quem os confirma é `previstoParaConfirmar`.
 */
export function previstosSubstituidos(
  lancamentos: readonly Lancamento[],
  /** Com a data de hoje, os previstos de hoje e de antes também ficam de fora. */
  hoje?: string,
): Set<string> {
  const comGastoReal = new Set<string>();
  for (const l of lancamentos) {
    if (vivo(l) && l.tipo === "DIARIO" && !l.previsto) comGastoReal.add(l.data);
  }
  const ids = new Set<string>();
  for (const l of lancamentos) {
    if (!vivo(l) || l.tipo !== "DIARIO" || !l.previsto) continue;
    if (comGastoReal.has(l.data) || (hoje !== undefined && l.data <= hoje)) ids.add(l.id);
  }
  return ids;
}

/** O ano inteiro, mês a mês, com o saldo encadeado de janeiro a dezembro. */
export function calcularAno(opcoes: {
  ano: number;
  lancamentos: Lancamento[];
  ajustes: Pick<Ajustes, "saldoInicialCents" | "rateioAptoPercent">;
  /**
   * Que dia é hoje. Com ele, a estimativa do diário (os R$ 60) só conta para os
   * dias que ainda não chegaram: hoje e os passados valem o que foi lançado.
   * Sem ele, toda estimativa conta, como na planilha.
   */
  hoje?: string;
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
    let credito = 0;
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
      let c = 0;
      let previstoNoDia = false;
      const diarioSubstituido = doDia.some((l) => l.tipo === "DIARIO" && !l.previsto);
      // A estimativa de um dia que já chegou (hoje, ontem) não gasta nada: só o
      // que foi lançado conta. Do dia seguinte em diante ela é a melhor
      // previsão que existe e volta a valer.
      const diarioPrevistoFora =
        diarioSubstituido || (opcoes.hoje !== undefined && data <= opcoes.hoje);

      for (const l of doDia) {
        // Compra no crédito: o dinheiro só sai no vencimento da fatura, que é
        // uma saída própria. Aqui ela não toca o saldo nem o gasto do dia.
        if (l.credito && l.tipo === "DIARIO" && !l.previsto) {
          c += l.valorCents;
          continue;
        }
        if (l.previsto && l.tipo === "DIARIO" && diarioPrevistoFora) continue;
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
      credito += c;
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
        creditoCents: c,
        saldoCents: saldo,
        lancamentos: doDia,
        temPrevisto: previstoNoDia,
        temLancamento: doDia.length > 0,
        diarioSubstituido,
        diarioPrevistoFora,
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
        creditoCents: credito,
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
/**
 * O ano pedido, com o saldo herdado da corrente de anos anteriores.
 *
 * Um ano começa onde o anterior terminou: o app encadeia do ano mais antigo com
 * dados até o pedido, em vez de esperar alguém digitar o saldo de abertura a
 * cada virada. Um saldo digitado à mão vale mais que a herança e interrompe a
 * corrente — é como se conserta uma diferença sem mexer no passado.
 *
 * É função pura de propósito: a tela (useAnoCalculado) e o atalho da Siri
 * (/api/lancar) precisam da MESMA conta. Enquanto cada um fazia a sua, o
 * recado da Siri esquecia a corrente e, na virada 2026→2027, respondia um
 * saldo sem nada do que veio antes.
 *
 * Anos fora de 2000–2100 são ignorados na largada da corrente: uma data
 * digitada errado ("0206-05-10") não pode arrastar o cálculo por dezoito
 * séculos nem travar a tela.
 */
export function calcularAnoEncadeado(opcoes: {
  ano: number;
  /** Só os vivos: quem chama já filtrou os apagados. */
  lancamentos: Lancamento[];
  /** Os saldos de abertura digitados à mão, por ano. */
  saldosIniciais: Record<number, number>;
  rateioAptoPercent: number;
  /** Que dia é hoje: ver `calcularAno`. */
  hoje?: string;
}): AnoCalculado {
  const { ano, lancamentos, saldosIniciais, rateioAptoPercent, hoje } = opcoes;

  const saudavel = (a: number) => Number.isFinite(a) && a >= 2000 && a <= 2100;
  const candidatos = [
    ...lancamentos.map((l) => Number(l.data.slice(0, 4))),
    ...Object.keys(saldosIniciais).map(Number),
  ].filter((a) => saudavel(a) && a <= ano);
  const primeiro = candidatos.length ? Math.min(ano, ...candidatos) : ano;

  let calculado = calcularAno({
    ano: primeiro,
    lancamentos,
    ajustes: { saldoInicialCents: saldosIniciais[primeiro] ?? 0, rateioAptoPercent },
    hoje,
  });

  for (let a = primeiro + 1; a <= ano; a++) {
    calculado = calcularAno({
      ano: a,
      lancamentos,
      ajustes: {
        saldoInicialCents: saldosIniciais[a] ?? calculado.saldoFinalCents,
        rateioAptoPercent,
      },
      hoje,
    });
  }

  return calculado;
}

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
 * chegaram. Um fixo nunca é escrito duas vezes no mesmo dia nem, para regra
 * mensal, duas vezes no mesmo mês — e lançamento APAGADO conta: apagar um
 * previsto é uma decisão, não um convite para recriá-lo. Passe em `existentes`
 * todos os lançamentos, inclusive os apagados.
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

  // Duas chaves de "já decidido", e as duas contam também os APAGADOS: um
  // previsto que a pessoa apagou de propósito ("esse mês não pago") é uma
  // decisão, e a previsão não pode desfazê-la recriando o lançamento.
  //
  // A chave por dia protege o TODO_DIA. A chave por mês protege as regras
  // mensais: quando o dia do fixo muda (regra editada, ou o lançamento movido
  // de data dentro do mês), o lançamento antigo está em outro dia — e sem a
  // chave do mês a previsão escrevia o fixo de novo no dia novo, dobrando o
  // aluguel do mês em silêncio.
  const jaExiste = new Set<string>();
  const mesJaTem = new Set<string>();
  for (const l of opcoes.existentes) {
    if (!l.fixoId) continue;
    jaExiste.add(`${l.fixoId}|${l.data}`);
    mesJaTem.add(`${l.fixoId}|${l.data.slice(0, 7)}`);
  }

  const fixos = opcoes.fixos.filter((f) => !f.apagadoEm && f.ativo !== false && f.valorCents > 0);
  const novos: Lancamento[] = [];

  const inicio = partesDaData(de);
  const fim = partesDaData(ate);

  for (let ano = inicio.ano; ano <= fim.ano; ano++) {
    const mesInicial = ano === inicio.ano ? inicio.mes : 1;
    const mesFinal = ano === fim.ano ? fim.mes : 12;

    for (let mes = mesInicial; mes <= mesFinal; mes++) {
      for (const fixo of fixos) {
        const regra = lerRepeticao(fixo);
        const diasAlvo = diasDoMes(regra, ano, mes);
        // Regra mensal acontece uma vez por mês: um lançamento do fixo em
        // QUALQUER dia do mês já é a vez dele. Só o todo-dia olha dia a dia.
        const umaPorMes = regra.tipo !== "TODO_DIA";

        for (const dia of diasAlvo) {
          const data = montarData(ano, mes, dia);
          if (data < de || data > ate) continue;
          if (jaExiste.has(`${fixo.id}|${data}`)) continue;
          if (umaPorMes && mesJaTem.has(`${fixo.id}|${data.slice(0, 7)}`)) continue;
          jaExiste.add(`${fixo.id}|${data}`);
          mesJaTem.add(`${fixo.id}|${data.slice(0, 7)}`);

          novos.push({
            id: novoId(),
            data,
            tipo: fixo.tipo,
            valorCents: fixo.valorCents,
            nota: fixo.nota ?? null,
            categoria: fixo.categoria ?? null,
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

/**
 * O termômetro em uma frase: quanto dá para gastar POR DIA até o fim do mês
 * sem terminar no vermelho.
 *
 * A conta é honesta com a previsão: `saldoFechamentoCents` já desconta tudo o
 * que ainda vai acontecer (fixos, previstos) e soma o que já foi gasto hoje.
 * O que sobra dividido pelos dias que faltam — hoje incluso, porque hoje ainda
 * dá tempo — é o número que o README prometia desde o primeiro dia e nenhuma
 * tela mostrava.
 */
export interface SobraPorDia {
  /** Quanto dá por dia, em reais inteiros. Zero quando não sobra nem um real por dia. */
  porDiaCents: number;
  diasRestantes: number;
  /** O fechamento do mês SEM o diário previsto — é sobre isto que a conta é feita. */
  fechamentoCents: number;
  /** O mês fecha abaixo de zero mesmo sem gastar mais nada no dia a dia. */
  noVermelho: boolean;
  /** O gasto do dia a dia já CONFIRMADO hoje. */
  gastoDeHojeCents: number;
}

export function sobraPorDia(ano: AnoCalculado, hoje: string): SobraPorDia | null {
  const dia = diaDoAno(ano, hoje);
  if (!dia) return null;
  const { mes } = partesDaData(hoje);
  const doMes = ano.meses[mes - 1];
  const diasRestantes = doMes.dias.length - partesDaData(hoje).dia + 1;

  // O fechamento já desconta o diário PREVISTO (o fixo "gasto do dia" de hoje
  // em diante). Contá-lo aqui seria descontar duas vezes: uma na previsão,
  // outra no "dá por dia" que ela mesma vai substituir. A pergunta é "sem
  // nenhum gasto do dia a dia, quanto sobra?" — então o previsto volta.
  // Só volta o que estava no fechamento: o previsto que ficou de fora (um gasto
  // real o substituiu, ou o dia é hoje) não foi descontado, então não se soma.
  const diarioPrevistoRestante = doMes.dias
    .filter((d) => d.data >= hoje && !d.diarioPrevistoFora)
    .flatMap((d) => d.lancamentos)
    .filter((l) => l.tipo === "DIARIO" && l.previsto)
    .reduce((t, l) => t + l.valorCents, 0);
  const fechamentoCents = doMes.totais.saldoFechamentoCents + diarioPrevistoRestante;

  const gastoDeHojeCents = dia.lancamentos
    .filter((l) => l.tipo === "DIARIO" && !l.previsto && !l.credito)
    .reduce((t, l) => t + l.valorCents, 0);

  return {
    porDiaCents: fechamentoCents > 0 ? Math.floor(fechamentoCents / diasRestantes / 100) * 100 : 0,
    diasRestantes,
    fechamentoCents,
    noVermelho: fechamentoCents < 0,
    gastoDeHojeCents,
  };
}

/**
 * Os previstos cuja data já passou (ou é hoje) e ninguém disse se aconteceram.
 *
 * Um previsto vencido fica distorcendo o saldo em silêncio: o dinheiro talvez
 * nem tenha saído, e a tela jura que saiu. A lista alimenta o cartão de
 * conferência da tela Hoje — mais antigo primeiro, que é o que está mais
 * errado há mais tempo.
 */
export function previstosVencidos(lancamentos: readonly Lancamento[], hoje: string): Lancamento[] {
  // Um previsto do diário já substituído por gasto real não tem o que conferir.
  const substituidos = previstosSubstituidos(lancamentos);
  // A estimativa do diário de hoje ainda está em andamento: o dia não acabou, e
  // perguntar "aconteceu mesmo?" às seis da manhã não faz sentido. Só os dias
  // que já passaram pedem conferência.
  return lancamentos
    .filter(
      (l) =>
        vivo(l) &&
        l.previsto &&
        (l.tipo === "DIARIO" ? l.data < hoje : l.data <= hoje) &&
        !substituidos.has(l.id),
    )
    .sort((a, b) => a.data.localeCompare(b.data));
}

/**
 * Quanto os fixos somam num mês como o pedido, por direção do dinheiro.
 * O todo-dia conta uma vez por dia; as regras mensais, uma por mês.
 */
export function somaDosFixosNoMes(
  fixos: readonly Fixo[],
  ano: number,
  mes: number,
): { entraCents: number; saiCents: number } {
  let entraCents = 0;
  let saiCents = 0;
  for (const f of fixos) {
    if (f.apagadoEm || f.ativo === false || f.valorCents <= 0) continue;
    const vezes = diasDoMes(lerRepeticao(f), ano, mes).length;
    if (f.tipo === "ENTRADA") entraCents += f.valorCents * vezes;
    else saiCents += f.valorCents * vezes;
  }
  return { entraCents, saiCents };
}
