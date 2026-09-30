/**
 * A divisão de contas — o que o Splitwise faz, sem banco e sem tela.
 *
 * Tudo aqui é função pura sobre centavos inteiros. É a única fonte dos números
 * que aparecem na aba Contas, e `contas.test.ts` tranca cada regra.
 *
 * As quatro formas de dividir são as do Splitwise:
 *   - igual        — entre quem foi marcado;
 *   - exato        — cada um digita o seu valor, e a soma tem que bater;
 *   - porcentagem  — a soma tem que dar 100%;
 *   - cotas        — "o casal conta 2, os outros 1".
 */

export type Modo = "igual" | "exato" | "porcentagem" | "cotas";
export const MODOS: { valor: Modo; nome: string; dica: string }[] = [
  { valor: "igual", nome: "Igual", dica: "Divide igualmente entre quem estiver marcado." },
  { valor: "exato", nome: "Valores", dica: "Cada um com o seu valor; a soma tem que bater." },
  { valor: "porcentagem", nome: "%", dica: "Uma porcentagem para cada; a soma tem que dar 100." },
  { valor: "cotas", nome: "Cotas", dica: "Peso de cada um: 2 paga o dobro de quem tem 1." },
];

/**
 * Reparte `total` centavos na proporção dos pesos, sem perder nem inventar um
 * centavo.
 *
 * É o método do maior resto: cada um recebe a parte inteira do que lhe cabe, e
 * os centavos que sobram vão, um a um, para quem teve a maior fração cortada.
 * R$ 100 entre três dá 33,34 + 33,33 + 33,33 — e não 33,33 × 3 = 99,99.
 * Empate no resto vai para quem vem primeiro na lista, para o resultado não
 * mudar de uma tela para outra.
 */
export function repartir(total: number, pesos: number[]): number[] {
  const soma = pesos.reduce((a, b) => a + b, 0);
  if (pesos.length === 0 || soma <= 0) return pesos.map(() => 0);

  const sinal = total < 0 ? -1 : 1;
  const absoluto = Math.abs(total);
  const exatas = pesos.map((p) => (absoluto * p) / soma);
  const partes = exatas.map(Math.floor);
  let sobra = absoluto - partes.reduce((a, b) => a + b, 0);

  const porResto = exatas
    .map((e, i) => ({ i, resto: e - Math.floor(e) }))
    .filter(({ i }) => pesos[i] > 0)
    .sort((a, b) => b.resto - a.resto || a.i - b.i);
  for (let k = 0; sobra > 0 && porResto.length > 0; k = (k + 1) % porResto.length, sobra--) {
    partes[porResto[k].i] += 1;
  }
  return partes.map((p) => p * sinal);
}

export type Entrada = { membroId: string; valor: number };
export type Parte = { membroId: string; valor: number; peso: number };

export class ErroDeDivisao extends Error {}

/**
 * O que cabe a cada um numa despesa de `total` centavos.
 *
 * `entradas` depende do modo: em "igual" o valor é ignorado (conta só quem
 * está na lista); em "exato" é o valor em centavos; em "porcentagem" é a
 * porcentagem (33.33); em "cotas", o peso.
 */
export function dividir(modo: Modo, total: number, entradas: Entrada[]): Parte[] {
  if (!Number.isInteger(total) || total <= 0) throw new ErroDeDivisao("O valor precisa ser maior que zero.");

  const ativas =
    modo === "igual" ? entradas : entradas.filter((e) => Number.isFinite(e.valor) && e.valor > 0);
  if (ativas.length === 0) throw new ErroDeDivisao("Marque pelo menos uma pessoa na divisão.");
  if (new Set(ativas.map((e) => e.membroId)).size !== ativas.length) {
    throw new ErroDeDivisao("A mesma pessoa aparece duas vezes na divisão.");
  }

  if (modo === "exato") {
    const soma = ativas.reduce((a, e) => a + e.valor, 0);
    if (soma !== total) {
      const diferenca = total - soma;
      throw new ErroDeDivisao(
        diferenca > 0
          ? `Faltam ${(diferenca / 100).toFixed(2).replace(".", ",")} para fechar o total.`
          : `Passou ${(-diferenca / 100).toFixed(2).replace(".", ",")} do total.`,
      );
    }
    return ativas.map((e) => ({ membroId: e.membroId, valor: e.valor, peso: e.valor }));
  }

  if (modo === "porcentagem") {
    const soma = ativas.reduce((a, e) => a + e.valor, 0);
    if (Math.abs(soma - 100) > 0.011) {
      throw new ErroDeDivisao(`As porcentagens somam ${soma.toLocaleString("pt-BR")}%, e não 100%.`);
    }
  }

  const pesos = modo === "igual" ? ativas.map(() => 1) : ativas.map((e) => e.valor);
  const valores = repartir(total, pesos);
  return ativas.map((e, i) => ({ membroId: e.membroId, valor: valores[i], peso: pesos[i] }));
}

/** Confere os pagadores: cada um com valor positivo, somando o total. */
export function conferirPagadores(total: number, pagadores: Entrada[]): Entrada[] {
  const ativos = pagadores.filter((p) => p.valor > 0);
  if (ativos.length === 0) throw new ErroDeDivisao("Diga quem pagou.");
  const soma = ativos.reduce((a, p) => a + p.valor, 0);
  if (soma !== total) {
    throw new ErroDeDivisao("O que cada um pagou precisa somar o valor da despesa.");
  }
  return ativos;
}

// ---------------------------------------------------------------------------
// Saldos
// ---------------------------------------------------------------------------

export type DespesaParaSaldo = {
  valor: number;
  cambio: number;
  pagadores: Entrada[];
  partes: Entrada[];
};
export type PagamentoParaSaldo = { deId: string; paraId: string; valor: number };

/**
 * A despesa passada para a moeda base, com cada pagador e cada parte já
 * convertidos — e somando exatamente o total convertido.
 *
 * Converter cada linha separadamente e arredondar deixaria a soma dos
 * pagadores diferente da soma das partes por um centavo, e esse centavo
 * apareceria como uma dívida fantasma. Então converte-se o total uma vez, e
 * reparte-se o total convertido na proporção original.
 */
export function naBase(d: DespesaParaSaldo) {
  const total = Math.round(d.valor * d.cambio);
  const pagos = repartir(total, d.pagadores.map((p) => p.valor));
  const devidos = repartir(total, d.partes.map((p) => p.valor));
  return {
    total,
    pagadores: d.pagadores.map((p, i) => ({ membroId: p.membroId, valor: pagos[i] })),
    partes: d.partes.map((p, i) => ({ membroId: p.membroId, valor: devidos[i] })),
  };
}

export type Saldo = {
  membroId: string;
  /** Quanto pagou de despesas, na moeda base. */
  pagou: number;
  /** Quanto consumiu — a soma das partes dele. */
  consumiu: number;
  /** Pagamentos feitos a outros para acertar, menos os recebidos. */
  acertou: number;
  /** Positivo: tem a receber. Negativo: deve. */
  liquido: number;
};

export function saldos(
  membros: string[],
  despesas: DespesaParaSaldo[],
  pagamentos: PagamentoParaSaldo[],
): Saldo[] {
  const mapa = new Map<string, Saldo>(
    membros.map((id) => [id, { membroId: id, pagou: 0, consumiu: 0, acertou: 0, liquido: 0 }]),
  );
  const de = (id: string) => {
    let s = mapa.get(id);
    if (!s) mapa.set(id, (s = { membroId: id, pagou: 0, consumiu: 0, acertou: 0, liquido: 0 }));
    return s;
  };

  for (const d of despesas) {
    const b = naBase(d);
    for (const p of b.pagadores) de(p.membroId).pagou += p.valor;
    for (const p of b.partes) de(p.membroId).consumiu += p.valor;
  }
  for (const p of pagamentos) {
    de(p.deId).acertou += p.valor;
    de(p.paraId).acertou -= p.valor;
  }
  for (const s of mapa.values()) s.liquido = s.pagou - s.consumiu + s.acertou;
  return [...mapa.values()];
}

export type Transferencia = { deId: string; paraId: string; valor: number };

/**
 * "Simplificar dívidas", como o Splitwise chama: o menor punhado de Pix que
 * zera todo mundo.
 *
 * Se a Ana deve 50 ao Bruno e o Bruno deve 50 ao Caio, a Ana paga direto ao
 * Caio e o Bruno não mexe em nada. O jeito: quem mais deve paga a quem mais tem
 * a receber, o quanto der, e repete. Não é garantidamente o mínimo absoluto
 * (esse problema é difícil de verdade), mas nunca passa de n − 1 transferências
 * e, para um grupo de amigos, bate com o que se faria de cabeça.
 */
export function simplificar(lista: Pick<Saldo, "membroId" | "liquido">[]): Transferencia[] {
  const credores = lista
    .filter((s) => s.liquido > 0)
    .map((s) => ({ id: s.membroId, v: s.liquido }));
  const devedores = lista
    .filter((s) => s.liquido < 0)
    .map((s) => ({ id: s.membroId, v: -s.liquido }));

  const ordenar = (xs: { id: string; v: number }[]) =>
    xs.sort((a, b) => b.v - a.v || a.id.localeCompare(b.id));

  const saida: Transferencia[] = [];
  ordenar(credores);
  ordenar(devedores);
  while (credores.length && devedores.length) {
    const c = credores[0];
    const d = devedores[0];
    const v = Math.min(c.v, d.v);
    saida.push({ deId: d.id, paraId: c.id, valor: v });
    c.v -= v;
    d.v -= v;
    if (c.v === 0) credores.shift();
    if (d.v === 0) devedores.shift();
    ordenar(credores);
    ordenar(devedores);
  }
  return saida;
}

/**
 * Sem simplificar: quem deve a quem, par a par, pelo que cada despesa diz.
 * Em cada despesa, cada um que consumiu deve a cada pagador na proporção do
 * que este pagou. No fim, as dívidas de mão dupla entre dois se compensam.
 */
export function dividasPorPar(
  despesas: DespesaParaSaldo[],
  pagamentos: PagamentoParaSaldo[],
): Transferencia[] {
  const devido = new Map<string, number>(); // "de|para" → centavos
  const somar = (deId: string, paraId: string, v: number) => {
    if (deId === paraId || v === 0) return;
    const [a, b] = deId < paraId ? [deId, paraId] : [paraId, deId];
    const chave = `${a}|${b}`;
    devido.set(chave, (devido.get(chave) ?? 0) + (deId === a ? v : -v));
  };

  for (const d of despesas) {
    const b = naBase(d);
    for (const parte of b.partes) {
      const fatias = repartir(parte.valor, b.pagadores.map((p) => p.valor));
      b.pagadores.forEach((p, i) => somar(parte.membroId, p.membroId, fatias[i]));
    }
  }
  for (const p of pagamentos) somar(p.paraId, p.deId, p.valor);

  const saida: Transferencia[] = [];
  for (const [chave, v] of devido) {
    const [a, b] = chave.split("|");
    if (v > 0) saida.push({ deId: a, paraId: b, valor: v });
    else if (v < 0) saida.push({ deId: b, paraId: a, valor: -v });
  }
  return saida.sort((x, y) => y.valor - x.valor);
}

export const CATEGORIAS_DE_DESPESA = [
  { valor: "comida", nome: "Comida", emoji: "🌮" },
  { valor: "bebida", nome: "Bebida / balada", emoji: "🍹" },
  { valor: "mercado", nome: "Mercado", emoji: "🛒" },
  { valor: "transporte", nome: "Transporte", emoji: "🚕" },
  { valor: "hospedagem", nome: "Hospedagem", emoji: "🏨" },
  { valor: "passeio", nome: "Passeios / ingressos", emoji: "🎟️" },
  { valor: "compras", nome: "Compras", emoji: "🛍️" },
  { valor: "outro", nome: "Outro", emoji: "💸" },
] as const;

export const infoCategoriaDeDespesa = (c: string) =>
  CATEGORIAS_DE_DESPESA.find((x) => x.valor === c) ?? CATEGORIAS_DE_DESPESA[CATEGORIAS_DE_DESPESA.length - 1];
