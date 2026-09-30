/**
 * Dinheiro na tela e dinheiro no banco.
 *
 * No banco é sempre inteiro, em centavos (ver o topo do schema). Aqui mora a
 * tradução: o que a pessoa digita vira centavos, e centavos viram "R$ 1.234,56".
 */

export const MOEDAS = {
  BRL: { nome: "Real", simbolo: "R$", localidade: "pt-BR" },
  MXN: { nome: "Peso mexicano", simbolo: "MX$", localidade: "es-MX" },
  USD: { nome: "Dólar", simbolo: "US$", localidade: "en-US" },
  EUR: { nome: "Euro", simbolo: "€", localidade: "pt-PT" },
} as const;

export type Moeda = keyof typeof MOEDAS;
export const LISTA_DE_MOEDAS = Object.keys(MOEDAS) as Moeda[];
export const ehMoeda = (m: string): m is Moeda => m in MOEDAS;

/**
 * "1.234,56", "1234.56", "1234,5", "R$ 12" → centavos. Nulo se não der para ler.
 *
 * O caso difícil é o separador: no Brasil a vírgula é decimal, mas quem copia
 * um valor de um recibo mexicano traz o ponto. A regra: o último separador,
 * se tiver uma ou duas casas depois dele, é o decimal; os outros são milhar.
 */
export function lerValor(texto: string): number | null {
  const limpo = texto.replace(/[^\d.,-]/g, "");
  if (!limpo || !/\d/.test(limpo)) return null;
  const negativo = limpo.startsWith("-");
  const semSinal = limpo.replace(/-/g, "");

  const ultimo = Math.max(semSinal.lastIndexOf(","), semSinal.lastIndexOf("."));
  let inteiro = semSinal;
  let fracao = "";
  if (ultimo >= 0) {
    const depois = semSinal.slice(ultimo + 1);
    if (depois.length > 0 && depois.length <= 2) {
      inteiro = semSinal.slice(0, ultimo);
      fracao = depois;
    }
  }
  inteiro = inteiro.replace(/[.,]/g, "") || "0";
  const centavos = Number(inteiro) * 100 + Number(fracao.padEnd(2, "0"));
  if (!Number.isFinite(centavos)) return null;
  return negativo ? -centavos : centavos;
}

/** Centavos → "R$ 1.234,56" (ou "MX$ 1.234,56"). Sempre com a vírgula brasileira. */
export function formatar(centavos: number, moeda: string = "BRL"): string {
  const simbolo = ehMoeda(moeda) ? MOEDAS[moeda].simbolo : moeda;
  const numero = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(centavos) / 100);
  return `${centavos < 0 ? "−" : ""}${simbolo} ${numero}`;
}

/** Centavos → "1234,56", para voltar a um campo de edição. */
export const paraCampo = (centavos: number) =>
  (centavos / 100).toFixed(2).replace(".", ",");

/** Converte centavos de uma moeda para a base, arredondando para o centavo mais perto. */
export const converter = (centavos: number, cambio: number) => Math.round(centavos * cambio);
