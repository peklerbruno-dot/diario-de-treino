/**
 * Conversão entre centavos (o que o sistema guarda) e reais (o que a pessoa lê
 * e digita). Nenhum cálculo de dinheiro acontece aqui — só apresentação.
 */

const formatador = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 244749 -> "2.447,49" */
export function reais(cents: number): string {
  return formatador.format(cents / 100);
}

/** 244749 -> "R$ 2.447,49" */
export function brl(cents: number): string {
  const sinal = cents < 0 ? "−" : "";
  return `${sinal}R$ ${formatador.format(Math.abs(cents) / 100)}`;
}

/** 244749 -> "R$ 2.447" (sem centavos, para números grandes em cartão) */
export function brlRedondo(cents: number): string {
  const sinal = cents < 0 ? "−" : "";
  return `${sinal}R$ ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(
    Math.abs(cents) / 100,
  )}`;
}

/**
 * "2.447,49", "2447,49", "2447.49" e "R$ 2.447,49" -> 244749.
 * Devolve null quando não dá para entender o que foi digitado.
 */
export function paraCentavos(texto: string): number | null {
  const limpo = texto.replace(/[R$\s ]/g, "").replace(/−/g, "-");
  if (limpo === "" || limpo === "-") return null;

  let normalizado = limpo;
  const temVirgula = limpo.includes(",");
  const temPonto = limpo.includes(".");
  if (temVirgula && temPonto) {
    // formato brasileiro: ponto é milhar, vírgula é decimal
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (temVirgula) {
    normalizado = limpo.replace(",", ".");
  } else if (temPonto) {
    // "1.234" é mil duzentos e trinta e quatro; "1.23" é um e vinte e três
    const [, decimais = ""] = limpo.split(".");
    normalizado = decimais.length === 3 ? limpo.replace(/\./g, "") : limpo;
  }

  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return null;
  return Math.round(numero * 100);
}

/** 0.896341 -> "89,6%" */
export function pct(fracao: number, casas = 1): string {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(fracao * 100)}%`;
}

/** 0.034 -> "+3,4%" */
export function pctComSinal(fracao: number, casas = 1): string {
  return `${fracao >= 0 ? "+" : "−"}${pct(Math.abs(fracao), casas)}`;
}

export function brlComSinal(cents: number): string {
  return `${cents >= 0 ? "+" : "−"}R$ ${formatador.format(Math.abs(cents) / 100)}`;
}

export function dataCurta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
}

export function dataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
}
