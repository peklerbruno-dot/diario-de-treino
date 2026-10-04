import { somarDias } from "./datas";
import type { Lancamento } from "./tipos";

/**
 * Os botões de valor da tela Hoje: um toque e o gasto entra no Diário.
 *
 * A pergunta que eles respondem é "quanto foi?", não "no que foi" — quem sai
 * do caixa com o celular na mão sabe o valor na hora.
 *
 * A grade é montada em duas etapas:
 *
 * 1. **Os seus**: os valores que você de fato usa, redondos ou quebrados (o
 *    R$ 38 do almoço, o R$ 12 do café). Contam com peso pela idade — um uso de
 *    ontem vale um, um de quatro meses atrás vale meio — para que o valor que
 *    você parou de usar saia sozinho, e o novo hábito entre logo. Precisa de
 *    duas vezes no último ano: uma só é acaso.
 *
 * 2. **Os redondos que tapam buraco**: depois dos seus, a grade completa o
 *    caminho de R$ 5 até onde vão quase todos os seus gastos com valores
 *    redondos, sempre escolhendo o que fica mais longe de tudo o que já está
 *    na grade. "Longe" é medido em proporção, não em reais: entre R$ 20 e
 *    R$ 30 cabe um botão; entre R$ 100 e R$ 110, não. Por isso a grade é mais
 *    fina embaixo, onde mora o gasto do dia a dia, e espaçada em cima — mas
 *    sem descer ao de real em real, que lá embaixo vira botão demais por
 *    diferença de menos.
 *
 * O resultado vai em ordem crescente, numa grade só, para o dedo achar o valor
 * pelo tamanho. Tudo calculado no aparelho, a partir dos lançamentos dele.
 *
 * E a última palavra é sua (Ajustes → Botões do Gastei): um valor escondido
 * nunca aparece, nem tapando buraco; um valor fixado aparece sempre.
 */

/**
 * Os redondos de onde saem os botões que completam a grade, em duas camadas:
 * primeiro os bem redondos; os do meio só entram se ainda sobrar lugar.
 */
const BEM_REDONDOS = [
  5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200, 250, 300, 400, 500,
];
const DO_MEIO = [6, 8, 12, 14, 16, 18, 22, 28, 35, 45, 55, 65, 75, 110, 130, 180];

/** Quantos botões a grade tem, ao todo: sete fileiras de quatro. */
export const BOTOES_NA_GRADE = 28;
/** No máximo, quantos deles vêm da sua história; o resto é para tapar buraco. */
const MAXIMO_DOS_SEUS = 20;
/** Em quantos dias o peso de um uso cai pela metade. */
const MEIA_VIDA_EM_DIAS = 120;
const VEZES_PARA_SER_SEU = 2;
/** Abaixo disto a história ainda não diz até onde a grade deve ir. */
const MINIMO_PARA_APRENDER = 10;
/**
 * A régua da distância entre dois valores: proporção, amaciada embaixo. O
 * `+ 5` faz R$ 5 e R$ 6 contarem como vizinhos (sem ele, seriam tão distantes
 * quanto R$ 50 e R$ 60), e é o que impede a grade de virar 5, 6, 7, 8.
 */
const lugar = (reais: number) => Math.log(reais + 5);
/** Dois botões mais perto do que isto são o mesmo botão para o dedo. */
const PERTO_DEMAIS = Math.log(1.08);

export const CHAVE_DOS_VALORES = "valoresDoGastei";

/** Em reais inteiros. */
export interface PreferenciasDeValores {
  fixados: number[];
  escondidos: number[];
}

export const SEM_PREFERENCIAS: PreferenciasDeValores = { fixados: [], escondidos: [] };

const listaDeReais = (bruto: unknown): number[] =>
  Array.isArray(bruto)
    ? [...new Set(bruto.filter((v): v is number => Number.isInteger(v) && v > 0 && v <= 100_000))]
        .sort((a, b) => a - b)
        .slice(0, 60)
    : [];

/** Lê o que foi guardado; qualquer coisa estranha vira "sem preferência". */
export function lerPreferencias(bruto: string | undefined): PreferenciasDeValores {
  if (!bruto) return SEM_PREFERENCIAS;
  try {
    const lido = JSON.parse(bruto) as Record<string, unknown>;
    return { fixados: listaDeReais(lido.fixados), escondidos: listaDeReais(lido.escondidos) };
  } catch {
    return SEM_PREFERENCIAS;
  }
}

export function escreverPreferencias(p: PreferenciasDeValores): string {
  return JSON.stringify({ fixados: listaDeReais(p.fixados), escondidos: listaDeReais(p.escondidos) });
}

export interface BotaoDeValor {
  valorCents: number;
  /** Veio da sua história (e não de tapar buraco). */
  seu: boolean;
}

export interface ValoresRapidos {
  /** Em ordem crescente. */
  botoes: BotaoDeValor[];
  /** Quantos gastos do último ano entraram na conta. */
  baseadoEm: number;
  /** Metade dos gastos fica até aqui (em centavos). `null` sem história. */
  medianaCents: number | null;
}

export function valoresRapidos(
  lancamentos: readonly Lancamento[],
  hoje: string,
  preferencias: PreferenciasDeValores = SEM_PREFERENCIAS,
): ValoresRapidos {
  const escondido = new Set(preferencias.escondidos);
  const fixados = preferencias.fixados.filter((v) => !escondido.has(v));
  const desde = somarDias(hoje, -365);
  const hojeEmMs = Date.parse(`${hoje}T12:00:00Z`);

  const usos: { reais: number; peso: number }[] = [];
  for (const l of lancamentos) {
    if (l.apagadoEm || l.previsto || l.tipo !== "DIARIO" || l.valorCents <= 0) continue;
    if (l.data < desde || l.data > hoje) continue;
    const reais = Math.round(l.valorCents / 100);
    if (reais <= 0) continue;
    const dias = (hojeEmMs - Date.parse(`${l.data}T12:00:00Z`)) / 86_400_000;
    usos.push({ reais, peso: 0.5 ** (dias / MEIA_VIDA_EM_DIAS) });
  }

  // 1. Os seus.
  const porValor = new Map<number, { vezes: number; peso: number }>();
  for (const { reais, peso } of usos) {
    const atual = porValor.get(reais) ?? { vezes: 0, peso: 0 };
    atual.vezes += 1;
    atual.peso += peso;
    porValor.set(reais, atual);
  }
  const daHistoria = [...porValor.entries()]
    .filter(([valor, u]) => u.vezes >= VEZES_PARA_SER_SEU && !escondido.has(valor))
    // O peso decide quem fica quando há mais do que cabe; empate, o menor.
    .sort((a, b) => b[1].peso - a[1].peso || a[0] - b[0])
    .map(([valor]) => valor);
  // Os fixados entram primeiro e não disputam lugar.
  const seus = [...new Set([...fixados, ...daHistoria])].slice(
    0,
    Math.max(MAXIMO_DOS_SEUS, fixados.length),
  );

  // 2. Até onde a grade vai: o redondo que cobre 95% dos gastos, nunca menos
  // que R$ 100.
  const ordenados = usos.map((u) => u.reais).sort((a, b) => a - b);
  const quantil = (q: number) =>
    ordenados[Math.min(ordenados.length - 1, Math.floor(q * ordenados.length))];
  const aprendeu = ordenados.length >= MINIMO_PARA_APRENDER;
  const p95 = aprendeu ? quantil(0.95) : 100;

  // 3. Os redondos que tapam buraco, o mais isolado primeiro.
  const teto = Math.max(100, BEM_REDONDOS.find((v) => v >= p95) ?? 500);
  const escolhidos = new Set(seus);
  const distancia = (v: number) => {
    let menor = Infinity;
    for (const e of escolhidos) menor = Math.min(menor, Math.abs(lugar(v) - lugar(e)));
    return menor;
  };
  // As pontas primeiro, para a grade sempre ir do pequeno até o teto.
  for (const ponta of [BEM_REDONDOS[0], teto]) {
    if (escondido.has(ponta)) continue;
    if (escolhidos.size < BOTOES_NA_GRADE && distancia(ponta) > PERTO_DEMAIS) escolhidos.add(ponta);
  }
  for (const camada of [BEM_REDONDOS, DO_MEIO]) {
    const candidatos = camada.filter((v) => v <= teto && !escondido.has(v));
    while (escolhidos.size < BOTOES_NA_GRADE) {
      let melhor: number | null = null;
      let melhorDistancia = PERTO_DEMAIS;
      for (const c of candidatos) {
        if (escolhidos.has(c)) continue;
        const d = distancia(c);
        // Empate fica com o primeiro da lista, que é o menor: embaixo é onde
        // um botão a mais economiza mais toques.
        if (d > melhorDistancia + 1e-9) {
          melhor = c;
          melhorDistancia = d;
        }
      }
      if (melhor === null) break;
      escolhidos.add(melhor);
    }
  }

  const ehSeu = new Set(seus);
  return {
    botoes: [...escolhidos]
      .sort((a, b) => a - b)
      .map((reais) => ({ valorCents: reais * 100, seu: ehSeu.has(reais) })),
    baseadoEm: usos.length,
    medianaCents: aprendeu ? quantil(0.5) * 100 : null,
  };
}

/**
 * As categorias do Diário na ordem em que você mais usa.
 *
 * Na confirmação de um valor, a categoria é o segundo toque — e o segundo
 * toque só é rápido se a categoria certa estiver à mão. As mais usadas no
 * último ano vêm primeiro; as nunca usadas seguem na ordem em que foram
 * cadastradas.
 */
export function categoriasPorUso<C extends { id: string }>(
  categorias: readonly C[],
  lancamentos: readonly Lancamento[],
  hoje: string,
): C[] {
  const desde = somarDias(hoje, -365);
  const vezes = new Map<string, number>();
  for (const l of lancamentos) {
    if (l.apagadoEm || l.previsto || l.tipo !== "DIARIO" || !l.categoria) continue;
    if (l.data < desde || l.data > hoje) continue;
    vezes.set(l.categoria, (vezes.get(l.categoria) ?? 0) + 1);
  }
  return categorias
    .map((c, ordem) => ({ c, ordem, n: vezes.get(c.id) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.ordem - b.ordem)
    .map(({ c }) => c);
}
