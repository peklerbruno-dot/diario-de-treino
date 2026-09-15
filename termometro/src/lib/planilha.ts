/**
 * Ler a planilha do Termômetro (a aba de um ano) e devolver lançamentos.
 *
 * A leitura acontece no navegador, no aparelho de quem importa: o arquivo não
 * sobe para lugar nenhum antes de virar dado seu. Só depois de lido é que os
 * lançamentos são gravados no seu banco.
 *
 * O que a planilha guardava em forma de célula, e que aqui vira dado de verdade:
 *
 *  - "=195+15+83" numa célula eram três gastos no mesmo dia. Viram três
 *    lançamentos separados, que dá para nomear e apagar um a um.
 *  - o comentário amarelo da célula ("pagamento fatura") vira a nota do
 *    lançamento.
 *  - a linha "ENTRADA S/ $PAI" apontava a dedo quais entradas eram dinheiro
 *    seu ("=C16", "=I21+I5"). Essas referências são lidas, e as entradas que
 *    ela citava chegam marcadas como renda própria. O mesmo vale para o
 *    "INVESTIDO %", que apontava a saída do investimento, e para "Saídas Apto".
 */
import { diasNoMes, montarData } from "./datas";
import type { Lancamento, Tipo } from "./tipos";

export interface ResumoDoMesImportado {
  mes: number;
  entradasCents: number;
  saidasCents: number;
  diarioCents: number;
  /**
   * O saldo que a planilha levava para o mês seguinte — sempre a última linha
   * do bloco, mesmo em mês de 30 dias. É com ele que se confere a importação.
   */
  saldoFinalDaPlanilhaCents: number;
}

export interface ResultadoImportacao {
  ano: number;
  aba: string;
  saldoInicialCents: number;
  lancamentos: Lancamento[];
  resumoPorMes: ResumoDoMesImportado[];
  avisos: string[];
}

export interface OpcoesImportacao {
  /** Qual aba ler. Sem isso, a mais recente que tiver nome de ano ("2026"). */
  aba?: string;
  /** A partir de que dia os lançamentos entram como previsão. */
  hoje?: string;
  agora?: string;
  novoId?: () => string;
}

/** Linha 2 de cada bloco: Data | Entrada | Saída | Diário | Saldo. */
const COLUNA = { DATA: 0, ENTRADA: 1, SAIDA: 2, DIARIO: 3, SALDO: 4 } as const;

const PRIMEIRA_LINHA_DE_DIA = 3;
const ULTIMA_LINHA_DE_DIA = 33;
const LINHA_DO_ROTULO_DE_BAIXO = 40;
const LINHA_DA_CONTA_DE_BAIXO = 41;
const LINHA_DO_ROTULO_DE_PERCENTUAL = 43;
const LINHA_DA_CONTA_DE_PERCENTUAL = 44;

type Celula = { t?: string; v?: unknown; f?: string; c?: { t?: string }[] };
type Aba = Record<string, unknown>;

export function letraDaColuna(indice: number): string {
  let n = indice + 1;
  let letra = "";
  while (n > 0) {
    const resto = (n - 1) % 26;
    letra = String.fromCharCode(65 + resto) + letra;
    n = Math.floor((n - 1) / 26);
  }
  return letra;
}

function celula(aba: Aba, coluna: number, linha: number): Celula | undefined {
  return aba[`${letraDaColuna(coluna)}${linha}`] as Celula | undefined;
}

function numero(c: Celula | undefined): number {
  const v = c?.v;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function texto(c: Celula | undefined): string {
  return typeof c?.v === "string" ? c.v : "";
}

/** Sem acento, sem caixa: para comparar rótulos escritos de qualquer jeito. */
export function achatar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Comentário de célula vindo do caminho "threaded" chega com os bytes de UTF-8
 * lidos um a um ("peitacoringÃ£o"). Quando o texto tem essa cara, relemos os
 * bytes como UTF-8 — e "peitacoringão" volta ao normal.
 */
function consertarAcentos(s: string): string {
  if (!/[ÂÃ][-¿]/.test(s)) return s;
  try {
    const bytes = Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return s;
  }
}

function notaDaCelula(c: Celula | undefined): string | null {
  const bruto = (c?.c ?? [])
    .map((comentario) => (comentario?.t ?? "").trim())
    .filter(Boolean)
    .join(" - ");
  if (!bruto) return null;
  // Comentário antigo do Excel às vezes vem com o aviso da versão colado antes
  // do texto de verdade; o que interessa é o que vem depois de "Comment:".
  const limpo = bruto.includes("Comment:") ? bruto.slice(bruto.lastIndexOf("Comment:") + 8) : bruto;
  return consertarAcentos(limpo).replace(/\s+/g, " ").trim() || null;
}

const SOMENTE_SOMA = /^[0-9\s.+]+$/;

/**
 * "985.4+367.5+379+528" vira quatro valores. Só quando a fórmula é uma soma de
 * números escritos à mão: havendo conta de verdade ("D11*0,4", "11473-10000")
 * ou referência a outra célula, o valor calculado entra inteiro, e a fórmula
 * original vira parte da nota para não se perder.
 */
export function parcelasDaFormula(
  formula: string | undefined,
  valor: number,
): { valores: number[]; formulaPreservada: string | null } {
  if (!formula) return { valores: [valor], formulaPreservada: null };

  const limpa = formula.trim().replace(/^=/, "");
  // "=83.13" é só um número com um sinal de igual na frente: não há nada a
  // preservar, e virar nota só encheria a tela.
  if (/^[0-9]+([.,][0-9]+)?$/.test(limpa)) return { valores: [valor], formulaPreservada: null };
  if (SOMENTE_SOMA.test(limpa) && limpa.includes("+")) {
    const partes = limpa
      .split("+")
      .map((p) => Number(p.trim()))
      .filter((n) => Number.isFinite(n) && n !== 0);
    if (partes.length > 1) return { valores: partes, formulaPreservada: null };
  }
  return { valores: [valor], formulaPreservada: `=${limpa}` };
}

const REFERENCIA = /\$?([A-Z]{1,2})\$?(\d{1,2})/g;

/** As células que uma fórmula de rodapé cita, dentro de uma coluna e do miolo do mês. */
function referenciasNaColuna(formula: string | undefined, coluna: number): Set<number> {
  const linhas = new Set<number>();
  if (!formula) return linhas;
  const alvo = letraDaColuna(coluna);
  for (const achado of formula.matchAll(REFERENCIA)) {
    const [, letra, linha] = achado;
    const n = Number(linha);
    if (letra === alvo && n >= PRIMEIRA_LINHA_DE_DIA && n <= ULTIMA_LINHA_DE_DIA) linhas.add(n);
  }
  return linhas;
}

function arredondarCentavos(valor: number): number {
  return Math.round(valor * 100);
}

/** Onde cada mês começa: a linha 2 traz "Data" na primeira coluna do bloco. */
function acharBlocos(aba: Aba, ultimaColuna: number): number[] {
  const blocos: number[] = [];
  for (let coluna = 0; coluna <= ultimaColuna; coluna++) {
    if (achatar(texto(celula(aba, coluna, 2))) === "data") blocos.push(coluna);
  }
  return blocos;
}

function ultimaColunaDaAba(aba: Aba): number {
  const ref = typeof aba["!ref"] === "string" ? (aba["!ref"] as string) : "A1:BT50";
  const fim = ref.split(":")[1] ?? "BT50";
  const letras = fim.replace(/[0-9]/g, "");
  let n = 0;
  for (const c of letras) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/**
 * `pasta` é o que o SheetJS devolve em `XLSX.read(...)`. Este é o único lugar
 * do app que sabe o formato dele.
 */
export function lerPlanilha(
  pasta: { SheetNames: string[]; Sheets: Record<string, Aba> },
  opcoes: OpcoesImportacao = {},
): ResultadoImportacao {
  const nomeDaAba = escolherAba(pasta, opcoes.aba);
  const aba = pasta.Sheets[nomeDaAba];
  if (!aba) throw new Error(`A planilha não tem uma aba chamada "${nomeDaAba}".`);

  const ano = Number(nomeDaAba.match(/\d{4}/)?.[0]);
  if (!Number.isFinite(ano)) {
    throw new Error(
      `Não consegui descobrir de que ano é a aba "${nomeDaAba}". ` +
        "O nome da aba precisa ter o ano (por exemplo, 2026).",
    );
  }

  const blocos = acharBlocos(aba, ultimaColunaDaAba(aba));
  if (blocos.length === 0) {
    throw new Error(
      `A aba "${nomeDaAba}" não parece o Termômetro: não achei a linha ` +
        '"Data | Entrada | Saída | Diário | Saldo".',
    );
  }

  const agora = opcoes.agora ?? new Date().toISOString();
  const novoId = opcoes.novoId ?? (() => crypto.randomUUID());
  const hoje = opcoes.hoje ?? null;

  const avisos: string[] = [];
  const lancamentos: Lancamento[] = [];
  const resumoPorMes: ResumoDoMesImportado[] = [];
  let saldoInicialCents = 0;

  if (blocos.length !== 12) {
    avisos.push(`Esperava 12 meses lado a lado e achei ${blocos.length}. Importei os que achei.`);
  }

  blocos.forEach((inicio, indice) => {
    const mes = indice + 1;
    if (mes > 12) return;

    const colunas = {
      entrada: inicio + COLUNA.ENTRADA,
      saida: inicio + COLUNA.SAIDA,
      diario: inicio + COLUNA.DIARIO,
      saldo: inicio + COLUNA.SALDO,
    };

    const marcadas = lerMarcacoesDoRodape(aba, inicio, colunas);
    const quantosDias = diasNoMes(ano, mes);

    let entradasCents = 0;
    let saidasCents = 0;
    let diarioCents = 0;

    for (let linha = PRIMEIRA_LINHA_DE_DIA; linha <= ULTIMA_LINHA_DE_DIA; linha++) {
      const diaEscrito = linha - PRIMEIRA_LINHA_DE_DIA + 1;
      // Dia 31 em mês de 30 existia na planilha, e o dinheiro lançado nele
      // entrava na conta do mês assim mesmo. Aqui ele desce para o último dia
      // de verdade, e o aviso conta o que aconteceu.
      const dia = Math.min(diaEscrito, quantosDias);
      const data = montarData(ano, mes, dia);
      const forcado = diaEscrito !== dia;

      const colunasPorTipo: [Tipo, number][] = [
        ["ENTRADA", colunas.entrada],
        ["SAIDA", colunas.saida],
        ["DIARIO", colunas.diario],
      ];

      for (const [tipo, coluna] of colunasPorTipo) {
        const c = celula(aba, coluna, linha);
        const valor = numero(c);
        if (valor === 0) continue;

        if (forcado) {
          avisos.push(
            `${MESES_CURTOS[mes - 1]}: havia lançamento no dia ${diaEscrito}, que esse mês não ` +
              `tem. Passei para o dia ${dia}.`,
          );
        }

        const { valores, formulaPreservada } = parcelasDaFormula(c?.f, valor);
        const nota = notaDaCelula(c);
        const complemento = formulaPreservada ? `planilha: ${formulaPreservada}` : null;
        const notaFinal = [nota, complemento].filter(Boolean).join(" - ") || null;

        for (const parcela of valores) {
          const cents = arredondarCentavos(parcela);
          if (cents === 0) continue;
          if (tipo === "ENTRADA") entradasCents += cents;
          else if (tipo === "SAIDA") saidasCents += cents;
          else diarioCents += cents;

          lancamentos.push({
            id: novoId(),
            data,
            tipo,
            valorCents: cents,
            nota: notaFinal,
            previsto: hoje ? data > hoje : false,
            rendaPropria: tipo === "ENTRADA" && marcadas.rendaPropria.has(linha),
            investimento: tipo === "SAIDA" && marcadas.investimento.has(linha),
            apartamento: tipo === "SAIDA" && marcadas.apartamento.has(linha),
            fixoId: null,
            criadoEm: agora,
            atualizadoEm: agora,
            apagadoEm: null,
          });
        }
      }
    }

    if (mes === 1) {
      // O saldo da primeira linha já é o saldo do fim do dia 1º. Para achar com
      // quanto o ano começou, desfazemos o que aconteceu naquele dia.
      const noDiaUm = (coluna: number) => numero(celula(aba, coluna, PRIMEIRA_LINHA_DE_DIA));
      saldoInicialCents = arredondarCentavos(
        noDiaUm(colunas.saldo) - noDiaUm(colunas.entrada) + noDiaUm(colunas.saida) + noDiaUm(colunas.diario),
      );
    }

    resumoPorMes.push({
      mes,
      entradasCents,
      saidasCents,
      diarioCents,
      // A última linha do bloco, e não o último dia do mês: era ela que o mês
      // seguinte lia. Em novembro elas não eram a mesma coisa, porque havia
      // dinheiro lançado num dia 31 que novembro não tem.
      saldoFinalDaPlanilhaCents: arredondarCentavos(
        numero(celula(aba, colunas.saldo, ULTIMA_LINHA_DE_DIA)),
      ),
    });
  });

  return { ano, aba: nomeDaAba, saldoInicialCents, lancamentos, resumoPorMes, avisos };
}

/**
 * O rodapé da planilha apontava a dedo, célula por célula, o que era dinheiro
 * seu, o que foi para investimento e o que era do apartamento. Ler essas
 * fórmulas é recuperar uma informação que, fora delas, só existia na cabeça de
 * quem montou a planilha.
 */
function lerMarcacoesDoRodape(
  aba: Aba,
  inicio: number,
  colunas: { entrada: number; saida: number; diario: number },
): { rendaPropria: Set<number>; investimento: Set<number>; apartamento: Set<number> } {
  const rendaPropria = new Set<number>();
  const investimento = new Set<number>();
  const apartamento = new Set<number>();

  for (let coluna = inicio; coluna <= inicio + 4; coluna++) {
    const rotuloDeBaixo = achatar(texto(celula(aba, coluna, LINHA_DO_ROTULO_DE_BAIXO)));
    const contaDeBaixo = celula(aba, coluna, LINHA_DA_CONTA_DE_BAIXO)?.f;

    if (rotuloDeBaixo.startsWith("entrada s/")) {
      for (const linha of referenciasNaColuna(contaDeBaixo, colunas.entrada)) {
        rendaPropria.add(linha);
      }
    }
    if (rotuloDeBaixo.includes("saidas apto")) {
      for (const linha of referenciasNaColuna(contaDeBaixo, colunas.saida)) {
        apartamento.add(linha);
      }
    }

    const rotuloPercentual = achatar(texto(celula(aba, coluna, LINHA_DO_ROTULO_DE_PERCENTUAL)));
    if (rotuloPercentual.includes("investido")) {
      const conta = celula(aba, coluna, LINHA_DA_CONTA_DE_PERCENTUAL)?.f;
      for (const linha of referenciasNaColuna(conta, colunas.saida)) investimento.add(linha);
    }
  }

  return { rendaPropria, investimento, apartamento };
}

function escolherAba(pasta: { SheetNames: string[] }, pedida?: string): string {
  if (pedida) return pedida;
  const comAno = abasDeAno(pasta);
  if (comAno.length === 0) {
    throw new Error(
      "Não achei nenhuma aba com nome de ano (2026, 2025...). " +
        `A planilha tem: ${pasta.SheetNames.join(", ")}.`,
    );
  }
  return comAno[0];
}

/** As abas que dá para importar, para a tela oferecer a escolha. */
export function abasDeAno(pasta: { SheetNames: string[] }): string[] {
  return pasta.SheetNames.filter((n) => /^\s*\d{4}\s*$/.test(n))
    .sort()
    .reverse();
}
