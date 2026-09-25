/**
 * Dinheiro é sempre inteiro em centavos — e sempre múltiplo de 100.
 *
 * O app não trabalha com centavos. Não é só uma escolha de exibição: o valor
 * é arredondado ao entrar, de modo que a soma das partes sempre bate com o
 * total. Esconder os centavos e continuar guardando-os daria um rodapé que
 * fecha um real fora do que a coluna mostra — o tipo de diferença que a gente
 * passa meia hora tentando entender.
 *
 * A unidade guardada continua sendo o centavo, e não o real, porque é ela que
 * a planilha trouxe e é ela que o banco tem. Mudar a unidade não deixaria nada
 * mais simples e quebraria os 815 lançamentos que já existem.
 *
 * O detalhe que custa caro no iPhone: no teclado em português a tecla decimal é
 * a vírgula. Um campo que só entende ponto engole "52,5" e grava outra coisa —
 * por isso a leitura aqui aceita as duas, e também o hábito da planilha de
 * escrever "195+15+83" quando foram três gastos no mesmo dia.
 */

/** Só os dígitos, a vírgula, o ponto e os sinais de soma/subtração interessam. */
const LIMPEZA = /[^0-9.,+\-]/g;

/**
 * "52,5" → 5250 · "1.234,56" → 123456 · "1234.56" → 123456 · "1.234" → 123400
 *
 * Com ponto e vírgula juntos, o último dos dois é o separador decimal. Só com
 * ponto, ele é decimal quando sobram uma ou duas casas ("12.50"), e separador de
 * milhar quando sobram três ("1.234") — que é como se escreve em português.
 */
export function paraCentavos(texto: string): number | null {
  const limpo = texto.replace(LIMPEZA, "").trim();
  if (!limpo) return null;

  const negativo = limpo.startsWith("-");
  const corpo = limpo.replace(/[+\-]/g, "");
  if (!corpo) return null;

  const ultimaVirgula = corpo.lastIndexOf(",");
  const ultimoPonto = corpo.lastIndexOf(".");
  let decimal = -1;

  if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
    decimal = Math.max(ultimaVirgula, ultimoPonto);
  } else if (ultimaVirgula >= 0) {
    decimal = ultimaVirgula;
  } else if (ultimoPonto >= 0) {
    const casas = corpo.length - ultimoPonto - 1;
    decimal = casas <= 2 ? ultimoPonto : -1;
  }

  const inteiro = (decimal >= 0 ? corpo.slice(0, decimal) : corpo).replace(/[.,]/g, "");
  const fracao = decimal >= 0 ? corpo.slice(decimal + 1).replace(/[.,]/g, "") : "";
  if (!inteiro && !fracao) return null;
  if (!/^\d*$/.test(inteiro) || !/^\d*$/.test(fracao)) return null;

  const centavos = Number(inteiro || "0") * 100 + Number((fracao + "00").slice(0, 2));
  if (!Number.isFinite(centavos)) return null;
  return negativo ? -centavos : centavos;
}

/**
 * "195+15+83" → [19500, 1500, 8300].
 *
 * A planilha vivia disso: três gastos num dia viravam uma soma dentro da
 * célula. No app cada parcela vira um lançamento seu, que dá para nomear e
 * apagar sozinho — mas quem já tem o hábito pode continuar digitando a soma.
 */
export function parcelas(texto: string): number[] | null {
  const partes = texto
    .replace(/[^0-9.,+\-]/g, "")
    .split("+")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (partes.length === 0) return null;

  const valores: number[] = [];
  for (const parte of partes) {
    const c = paraCentavos(parte);
    if (c === null) return null;
    valores.push(c);
  }
  return valores;
}

const FORMATO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** Ao real mais próximo. É por aqui que todo valor passa antes de ser guardado. */
export function aoReal(centavos: number): number {
  if (!Number.isFinite(centavos)) return 0;
  return Math.round(centavos / 100) * 100;
}

/** 123456 → "1.235" */
export function emReais(centavos: number): string {
  const sinal = centavos < 0 ? "-" : "";
  return `${sinal}${FORMATO.format(Math.round(Math.abs(centavos) / 100))}`;
}

/** 123456 → "R$ 1.235" */
export function comCifrao(centavos: number): string {
  const sinal = centavos < 0 ? "-" : "";
  return `${sinal}R$ ${FORMATO.format(Math.round(Math.abs(centavos) / 100))}`;
}

/**
 * Centavos no idioma do teclado do app.
 *
 * O teclado não tem tecla de vírgula, e por isso `avaliar` lê o que está
 * escrito como reais inteiros: "66" é R$ 66 e "1.234" é R$ 1.234. Preencher
 * esse campo com "66,00" — o formato que se usa para mostrar dinheiro — fazia
 * a conta ler 6.600, e **salvar multiplicava o lançamento por cem**. Acontecia
 * ao abrir qualquer lançamento para editar.
 *
 * Então quem escreve nesse campo passa por aqui, e não por `toFixed(2)`.
 */
export function paraOTeclado(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined || !Number.isFinite(centavos)) return "";
  return String(Math.round(centavos / 100));
}
