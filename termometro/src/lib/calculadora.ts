/**
 * A conta que se faz no lugar de digitar o valor.
 *
 * Existe por um motivo bem concreto: o teclado numérico do iPhone **não tem a
 * tecla de mais**. O app pedia "195+15+83" e no celular não havia como digitar
 * o sinal — a soma só funcionava em computador com teclado de verdade. Agora o
 * teclado é do próprio app, e estas são as regras dele.
 *
 * Duas coisas diferentes, e a diferença importa:
 *
 *   `+`      separa em vários lançamentos. "195+15+83" são três compras no
 *            mesmo dia, cada uma com o seu valor — é o que a planilha fazia ao
 *            guardar "=195+15+83" dentro de uma célula.
 *
 *   `× ÷ −`  são conta dentro de um valor só. "3×50" é um lançamento de 150;
 *            "100−20" é um de 80. Multiplicação e divisão vêm antes da
 *            subtração, como na escola.
 *
 * Então "195+3×50" são dois lançamentos: 195 e 150.
 */

const OPERADORES = ["+", "-", "*", "/"] as const;

/** O que o teclado guarda é texto cru; estes são os sinais que ele usa. */
export const SINAIS = { mais: "+", menos: "-", vezes: "*", dividido: "/" } as const;

export interface Conta {
  /** Um valor em centavos por lançamento. */
  parcelas: number[];
  totalCents: number;
}

const ehOperador = (c: string): boolean => (OPERADORES as readonly string[]).includes(c);

/** Tira do fim o que ainda está pela metade, para a prévia acompanhar a digitação. */
function aparar(texto: string): string {
  let t = texto.trim();
  while (t.length > 0 && (ehOperador(t[t.length - 1]) || t.endsWith(","))) {
    t = t.slice(0, -1).trim();
  }
  return t;
}

/** "1.234,56" → 1234.56 · "12" → 12 */
function numero(pedaco: string): number | null {
  const limpo = pedaco.replace(/\./g, "").replace(",", ".").trim();
  if (limpo === "" || !/^\d*\.?\d*$/.test(limpo)) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/**
 * Uma parcela: números ligados por `− × ÷`, com × e ÷ na frente.
 * Devolve `null` se houver qualquer coisa que não seja conta.
 */
function avaliarParcela(parcela: string): number | null {
  const pedacos = parcela.split(/([*/-])/).map((p) => p.trim());
  if (pedacos.length === 0) return null;

  // Primeira passada: resolve × e ÷, deixando só números e subtrações.
  const restante: (number | string)[] = [];
  let i = 0;
  const primeiro = numero(pedacos[i++]);
  if (primeiro === null) return null;
  restante.push(primeiro);

  while (i < pedacos.length) {
    const sinal = pedacos[i++];
    const proximo = numero(pedacos[i++] ?? "");
    if (proximo === null) return null;

    if (sinal === "*" || sinal === "/") {
      const anterior = restante.pop();
      if (typeof anterior !== "number") return null;
      if (sinal === "/" && proximo === 0) return null;
      restante.push(sinal === "*" ? anterior * proximo : anterior / proximo);
    } else if (sinal === "-") {
      restante.push("-", proximo);
    } else {
      return null;
    }
  }

  // Segunda passada: as subtrações que sobraram, da esquerda para a direita.
  let total = restante[0] as number;
  for (let j = 1; j < restante.length; j += 2) {
    total -= restante[j + 1] as number;
  }
  return Number.isFinite(total) ? total : null;
}

/**
 * Lê a conta inteira. `null` quando não há nada aproveitável ainda — é o que a
 * prévia mostra como vazio enquanto se digita.
 */
export function avaliar(texto: string): Conta | null {
  const limpo = aparar(texto);
  if (limpo === "") return null;

  const parcelas: number[] = [];
  for (const parcela of limpo.split("+")) {
    if (parcela.trim() === "") continue;
    const valor = avaliarParcela(parcela);
    if (valor === null) return null;
    const cents = Math.round(valor * 100);
    if (cents !== 0) parcelas.push(cents);
  }

  if (parcelas.length === 0) return null;
  if (parcelas.some((c) => c < 0)) return null;

  return { parcelas, totalCents: parcelas.reduce((s, c) => s + c, 0) };
}

/** O que o visor mostra: os sinais desenhados como a gente escreve à mão. */
export function paraOVisor(texto: string): string {
  return texto
    .replace(/\*/g, " × ")
    .replace(/\//g, " ÷ ")
    .replace(/-/g, " − ")
    .replace(/\+/g, " + ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Acrescenta uma tecla ao que já está escrito, sem deixar a conta inválida:
 * dois operadores seguidos viram um só, e uma vírgula só entra uma vez por
 * número.
 */
export function teclar(atual: string, tecla: string): string {
  if (tecla === "⌫") return atual.slice(0, -1);

  if (ehOperador(tecla)) {
    if (atual === "") return "";
    const ultimo = atual[atual.length - 1];
    if (ehOperador(ultimo)) return atual.slice(0, -1) + tecla;
    if (ultimo === ",") return atual.slice(0, -1) + tecla;
    return atual + tecla;
  }

  if (tecla === ",") {
    const ultimoNumero = atual.split(/[+\-*/]/).pop() ?? "";
    if (ultimoNumero.includes(",")) return atual;
    if (ultimoNumero === "") return atual + "0,";
    return atual + ",";
  }

  return atual + tecla;
}
