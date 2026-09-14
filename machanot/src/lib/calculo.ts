/**
 * Motor de cálculo das machanot.
 *
 * Função pura, sem I/O: recebe os parâmetros da machané e devolve custo,
 * rateio, grade de preços e os números de transparência. É a única fonte de
 * verdade de preço da plataforma — nenhuma tela pode digitar um preço à mão.
 *
 * Todo valor monetário é inteiro em centavos. Pesos e percentuais são frações
 * (0,03 = 3%).
 */

// ===== Tipos de entrada =====

export type Turma = "GRANDES" | "PEQUENOS";
export type Papel = "CHANICH" | "MADRICH" | "PT" | "EQUIPE" | "PRESTADOR";

export interface CategoriaInput {
  id: string;
  nome: string;
  papel: Papel;
  turma: Turma;
  dias: number;
  quantidade: number;
  geraHospedagem: boolean;
  contribuicaoCents: number;
}

export type TipoGasto = "VALOR_FECHADO" | "POR_PESSOA" | "POR_DIARIA" | "CACHE_DIARIO";

export interface GastoInput {
  id: string;
  descricao: string;
  tipo: TipoGasto;
  categoria: string;
  valorCents: number;
  pessoas?: number;
  dias?: number;
}

export interface PoliticaInput {
  metodo: "ADITIVO" | "MULTIPLICATIVO";
  margemBaseGrandesCents?: number;
  margemBasePequenosCents?: number;
  acrescimoNaoSocioCents?: number;
  descontoSegundoFilhoCents?: number;
  margemBasePct?: number;
  acrescimoNaoSocioPct?: number;
  descontoSegundoFilhoPct?: number;
  acrescimoSegundaLevaCents: number;
  superavitAlvoCents: number;
  arredondamento: "NENHUM" | "DEZ" | "CINQUENTA" | "CEM";

  /**
   * Extensão ao modelo da §7: desconto de 2º filho por turma.
   *
   * O desconto único (`descontoSegundoFilhoCents`) continua sendo o padrão e o
   * comportamento normal. Estes campos existem porque a grade histórica de 2026
   * usou −R$ 130 nos grandes e −R$ 100 nos pequenos; sem eles a coordenação não
   * conseguiria reproduzir a tabela divulgada. Quando `null`/`undefined`, cada
   * turma usa o desconto único. Ver `docs/DIVERGENCIAS.md`.
   */
  descontoSegundoFilhoGrandesCents?: number | null;
  descontoSegundoFilhoPequenosCents?: number | null;
  descontoSegundoFilhoGrandesPct?: number | null;
  descontoSegundoFilhoPequenosPct?: number | null;
}

export interface MachaneInput {
  diariaCents: number;
  diasGrandes: number;
  diasPequenos: number;
  pesoOverride?: number | null;
  categorias: CategoriaInput[];
  gastos: GastoInput[];
  politica: PoliticaInput;
  /** Se informado, substitui a soma das contribuições das categorias.
   *  Use o total real do cadastro de madrichim (devido − bolsa). */
  receitaMadrichimRealCents?: number | null;
}

// ===== Tipos de saída =====

export interface GradePrecos {
  primeiroFilhoSocio: number;
  primeiroFilhoNaoSocio: number;
  segundoFilhoSocio: number;
  segundoFilhoNaoSocio: number;
}

export interface Resultado {
  totalPessoas: number;
  pessoaDiaTotal: number;

  hospedagemCents: number;
  gastosFixosCents: number;
  custoTotalCents: number;

  receitaMadrichimCents: number;
  subsidioMadrichimCents: number; // o que custam menos o que pagam
  aRatearCents: number;

  pesoCalculado: number;
  pesoAplicado: number;
  deslocamentoPorOverrideCents: number; // quanto o override tirou dos pequenos

  chanichimGrandes: number;
  chanichimPequenos: number;
  custoPorChanichGrandesCents: number;
  custoPorChanichPequenosCents: number;

  precosGrandes: GradePrecos;
  precosPequenos: GradePrecos;
  segundaLevaGrandes: GradePrecos;
  segundaLevaPequenos: GradePrecos;

  // transparência — §8
  bolsaCents: number;
  impactoBolsaPorChanichGrandeCents: number;
  impactoSubsidioPorChanichGrandeCents: number;
  receitaSeTodosPrimeiroFilhoSocioCents: number;
  superavitProjetadoCents: number;
  superavitProjetadoPct: number;

  avisos: string[];

  // ---- Apoio às telas (derivados, nenhum cálculo novo) ----
  /**
   * O que o override muda no bolso de cada chanich, por turma: negativo = paga
   * menos do que o peso calculado cobraria. O que sai de uma turma entra na
   * outra, por isso os sinais são opostos.
   */
  deslocamentoPorChanichGrandeCents: number;
  deslocamentoPorChanichPequenoCents: number;
  /** Hospedagem de quem é subsidiado (MADRICH + PT). Cartão "subsídio à liderança". */
  custoDosNaoChanichimCents: number;
  /** Quantos madrichim e peilim são subsidiados. */
  quantidadeSubsidiados: number;
  /** Custo por chanich se o peso matemático fosse aplicado (para o slider da tela 5). */
  custoPorChanichGrandesSemOverrideCents: number;
  custoPorChanichPequenosSemOverrideCents: number;
  /** Impacto do fundo de bolsas no chanich pequeno. */
  impactoBolsaPorChanichPequenoCents: number;
  impactoSubsidioPorChanichPequenoCents: number;
  /** Hospedagem e gastos fixos por categoria de gasto, para o gráfico da tela 3. */
  gastosPorCategoria: { categoria: string; valorCents: number }[];
}

// ===== Helpers =====

const round = (n: number) => Math.round(n);

/** "1664.33" seria en-US; aqui a interface é em português. */
const emReais = (cents: number): string =>
  (Math.abs(cents) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function arredondaPreco(cents: number, modo: PoliticaInput["arredondamento"]): number {
  switch (modo) {
    case "DEZ":
      return Math.round(cents / 1000) * 1000;
    case "CINQUENTA":
      return Math.round(cents / 5000) * 5000;
    case "CEM":
      return Math.round(cents / 10000) * 10000;
    default:
      return round(cents);
  }
}

/** minúsculas, sem acento, sem plural simples — para comparar nomes escritos à mão. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const PALAVRAS_IGNORADAS = new Set([
  "dias", "dia", "diaria", "diarias", "grandes", "pequenos", "pequenas", "babys", "baby",
  "para", "com", "sem", "das", "dos", "dal", "geral", "turma", "total",
]);

/** singular grosseiro: segurancas -> seguranca, madrichim fica igual. */
const semPlural = (p: string) => (p.length > 4 && p.endsWith("s") ? p.slice(0, -1) : p);

/**
 * §6 — armadilha de dupla contagem.
 *
 * Se uma categoria já gera hospedagem e ainda existe uma linha de gasto
 * POR_DIARIA falando da mesma gente, a diária entra duas vezes no custo.
 */
export function avisosDuplaContagem(categorias: CategoriaInput[], gastos: GastoInput[]): string[] {
  const avisos: string[] = [];
  const porDiaria = gastos.filter((g) => g.tipo === "POR_DIARIA");
  if (porDiaria.length === 0) return avisos;

  for (const c of categorias) {
    if (!c.geraHospedagem) continue;
    const termos = normalizar(c.nome)
      .split(/[^a-z0-9]+/)
      .filter((p) => p.length >= 4 && !PALAVRAS_IGNORADAS.has(p))
      .map(semPlural);
    if (termos.length === 0) continue;

    for (const g of porDiaria) {
      const descricao = normalizar(g.descricao)
        .split(/[^a-z0-9]+/)
        .map(semPlural)
        .join(" ");
      if (termos.some((t) => descricao.includes(t))) {
        avisos.push(
          `Possível dupla contagem: '${g.descricao}' pode já estar coberto pela categoria '${c.nome}'. ` +
            `Ou desmarque "gera hospedagem" na categoria, ou apague a linha de gasto.`
        );
      }
    }
  }
  return avisos;
}

/**
 * Quanto vale uma linha de gasto fixo (§5). Exportada porque a tela de Custos
 * mostra o valor de cada linha — e ela tem que usar a mesma conta do motor.
 */
export function valorDoGastoCents(
  g: GastoInput,
  diariaCents: number,
  totalPessoas: number,
): number {
  switch (g.tipo) {
    case "VALOR_FECHADO":
      return g.valorCents;
    case "POR_PESSOA":
      return g.valorCents * totalPessoas;
    case "POR_DIARIA":
      return diariaCents * (g.pessoas ?? 0) * (g.dias ?? 0);
    case "CACHE_DIARIO":
      return g.valorCents * (g.pessoas ?? 0) * (g.dias ?? 0);
  }
}

// ===== Motor =====

export function calcular(m: MachaneInput): Resultado {
  const avisos: string[] = [];

  // --- Bloco 1 e 2: pessoas e hospedagem ---
  const totalPessoas = m.categorias.reduce((s, c) => s + c.quantidade, 0);
  const pessoaDiaTotal = m.categorias.reduce((s, c) => s + c.quantidade * c.dias, 0);

  const hospedagemCents = round(
    m.categorias
      .filter((c) => c.geraHospedagem)
      .reduce((s, c) => s + c.quantidade * c.dias * m.diariaCents, 0)
  );

  // --- Bloco 3: gastos fixos ---
  const valorDoGasto = (g: GastoInput): number =>
    valorDoGastoCents(g, m.diariaCents, totalPessoas);

  // A soma percorre a coleção inteira, nunca um intervalo de linhas (§13).
  const gastosFixosCents = round(m.gastos.reduce((s, g) => s + valorDoGasto(g), 0));

  const gastosPorCategoria = Object.entries(
    m.gastos.reduce<Record<string, number>>((acc, g) => {
      acc[g.categoria] = (acc[g.categoria] ?? 0) + valorDoGasto(g);
      return acc;
    }, {})
  )
    .map(([categoria, valorCents]) => ({ categoria, valorCents: round(valorCents) }))
    .sort((a, b) => b.valorCents - a.valorCents);

  // --- Bloco 4 ---
  const custoTotalCents = hospedagemCents + gastosFixosCents;

  // --- Bloco 5: madrichim ---
  const naoChanichim = m.categorias.filter((c) => c.papel !== "CHANICH");

  const receitaMadrichimCents =
    m.receitaMadrichimRealCents ??
    round(naoChanichim.reduce((s, c) => s + c.quantidade * c.contribuicaoCents, 0));

  // Só MADRICH e PT são "subsidiados": equipe e prestadores nunca deveriam pagar.
  const contribuintes = m.categorias.filter((c) => c.papel === "MADRICH" || c.papel === "PT");
  const custoDosNaoChanichim = round(
    contribuintes.reduce((s, c) => s + c.quantidade * c.dias * m.diariaCents, 0)
  );
  const subsidioMadrichimCents = custoDosNaoChanichim - receitaMadrichimCents;
  const quantidadeSubsidiados = contribuintes.reduce((s, c) => s + c.quantidade, 0);

  // --- Bloco 6: rateio por pessoa-dia ---
  const chanichim = m.categorias.filter((c) => c.papel === "CHANICH");
  const chanichimGrandes = chanichim
    .filter((c) => c.turma === "GRANDES")
    .reduce((s, c) => s + c.quantidade, 0);
  const chanichimPequenos = chanichim
    .filter((c) => c.turma === "PEQUENOS")
    .reduce((s, c) => s + c.quantidade, 0);

  const pdGrandes = chanichimGrandes * m.diasGrandes;
  const pdPequenos = chanichimPequenos * m.diasPequenos;
  const pdChanichim = pdGrandes + pdPequenos;

  if (pdChanichim === 0) {
    avisos.push("Nenhum chanich cadastrado — não é possível ratear o custo.");
  }

  const pesoCalculado = pdChanichim === 0 ? 0 : pdGrandes / pdChanichim;
  const pesoAplicado = m.pesoOverride ?? pesoCalculado;

  const aRatearCents = custoTotalCents - receitaMadrichimCents + m.politica.superavitAlvoCents;

  const custoPorChanichGrandesCents =
    chanichimGrandes === 0 ? 0 : round((aRatearCents * pesoAplicado) / chanichimGrandes);
  const custoPorChanichPequenosCents =
    chanichimPequenos === 0 ? 0 : round((aRatearCents * (1 - pesoAplicado)) / chanichimPequenos);

  const custoPorChanichGrandesSemOverrideCents =
    chanichimGrandes === 0 ? 0 : round((aRatearCents * pesoCalculado) / chanichimGrandes);
  const custoPorChanichPequenosSemOverrideCents =
    chanichimPequenos === 0 ? 0 : round((aRatearCents * (1 - pesoCalculado)) / chanichimPequenos);

  const deslocamentoPorOverrideCents = round(aRatearCents * (pesoAplicado - pesoCalculado));

  const deslocamentoPorChanichGrandeCents =
    chanichimGrandes === 0 ? 0 : round(deslocamentoPorOverrideCents / chanichimGrandes);
  const deslocamentoPorChanichPequenoCents =
    chanichimPequenos === 0 ? 0 : round(-deslocamentoPorOverrideCents / chanichimPequenos);

  if (Math.abs(pesoAplicado - pesoCalculado) > 0.001) {
    const dir =
      deslocamentoPorOverrideCents > 0
        ? "dos pequenos para os grandes"
        : "dos grandes para os pequenos";
    avisos.push(
      `Peso ajustado manualmente (${(pesoAplicado * 100).toFixed(1)}% vs. ${(pesoCalculado * 100).toFixed(1)}% calculado). ` +
        `Isso desloca R$ ${emReais(deslocamentoPorOverrideCents)} ${dir}.`
    );
  }

  // --- Bloco 7: grade de preços ---
  function grade(base: number, turma: Turma): GradePrecos {
    const p = m.politica;
    let socio1: number, naoSocio1: number, socio2: number, naoSocio2: number;

    if (p.metodo === "ADITIVO") {
      const margem =
        turma === "GRANDES" ? (p.margemBaseGrandesCents ?? 0) : (p.margemBasePequenosCents ?? 0);
      const naoSocio = p.acrescimoNaoSocioCents ?? 0;
      const descontoTurma =
        turma === "GRANDES" ? p.descontoSegundoFilhoGrandesCents : p.descontoSegundoFilhoPequenosCents;
      const desconto = descontoTurma ?? p.descontoSegundoFilhoCents ?? 0;

      socio1 = base + margem;
      naoSocio1 = base + margem + naoSocio;
      socio2 = base + margem - desconto;
      naoSocio2 = base + margem - desconto + naoSocio;
    } else {
      const margem = p.margemBasePct ?? 0;
      const naoSocio = p.acrescimoNaoSocioPct ?? 0;
      const descontoTurma =
        turma === "GRANDES" ? p.descontoSegundoFilhoGrandesPct : p.descontoSegundoFilhoPequenosPct;
      const desconto = descontoTurma ?? p.descontoSegundoFilhoPct ?? 0;

      socio1 = base * (1 + margem);
      naoSocio1 = base * (1 + margem + naoSocio);
      socio2 = base * (1 + margem - desconto);
      naoSocio2 = base * (1 + margem - desconto + naoSocio);
    }

    return {
      primeiroFilhoSocio: arredondaPreco(socio1, p.arredondamento),
      primeiroFilhoNaoSocio: arredondaPreco(naoSocio1, p.arredondamento),
      segundoFilhoSocio: arredondaPreco(socio2, p.arredondamento),
      segundoFilhoNaoSocio: arredondaPreco(naoSocio2, p.arredondamento),
    };
  }

  const somaLeva = (g: GradePrecos, add: number): GradePrecos => ({
    primeiroFilhoSocio: g.primeiroFilhoSocio + add,
    primeiroFilhoNaoSocio: g.primeiroFilhoNaoSocio + add,
    segundoFilhoSocio: g.segundoFilhoSocio + add,
    segundoFilhoNaoSocio: g.segundoFilhoNaoSocio + add,
  });

  const precosGrandes = grade(custoPorChanichGrandesCents, "GRANDES");
  const precosPequenos = grade(custoPorChanichPequenosCents, "PEQUENOS");

  // --- Transparência ---
  const bolsaCents = m.gastos
    .filter((g) => g.categoria === "BOLSA")
    .reduce((s, g) => s + valorDoGasto(g), 0);

  const impactoBolsaPorChanichGrandeCents =
    chanichimGrandes === 0 ? 0 : round((bolsaCents * pesoAplicado) / chanichimGrandes);
  const impactoSubsidioPorChanichGrandeCents =
    chanichimGrandes === 0 ? 0 : round((subsidioMadrichimCents * pesoAplicado) / chanichimGrandes);
  const impactoBolsaPorChanichPequenoCents =
    chanichimPequenos === 0 ? 0 : round((bolsaCents * (1 - pesoAplicado)) / chanichimPequenos);
  const impactoSubsidioPorChanichPequenoCents =
    chanichimPequenos === 0
      ? 0
      : round((subsidioMadrichimCents * (1 - pesoAplicado)) / chanichimPequenos);

  const receitaSeTodosPrimeiroFilhoSocioCents =
    chanichimGrandes * precosGrandes.primeiroFilhoSocio +
    chanichimPequenos * precosPequenos.primeiroFilhoSocio;

  const superavitProjetadoCents =
    receitaSeTodosPrimeiroFilhoSocioCents + receitaMadrichimCents - custoTotalCents;
  const superavitProjetadoPct =
    custoTotalCents === 0 ? 0 : superavitProjetadoCents / custoTotalCents;

  if (superavitProjetadoCents < 0) {
    avisos.push(
      `DÉFICIT projetado de R$ ${emReais(superavitProjetadoCents)} ` +
        `no cenário em que todos são 1º filho sócio.`
    );
  }

  avisos.push(...avisosDuplaContagem(m.categorias, m.gastos));

  return {
    totalPessoas,
    pessoaDiaTotal,
    hospedagemCents,
    gastosFixosCents,
    custoTotalCents,
    receitaMadrichimCents,
    subsidioMadrichimCents,
    aRatearCents,
    pesoCalculado,
    pesoAplicado,
    deslocamentoPorOverrideCents,
    chanichimGrandes,
    chanichimPequenos,
    custoPorChanichGrandesCents,
    custoPorChanichPequenosCents,
    precosGrandes,
    precosPequenos,
    segundaLevaGrandes: somaLeva(precosGrandes, m.politica.acrescimoSegundaLevaCents),
    segundaLevaPequenos: somaLeva(precosPequenos, m.politica.acrescimoSegundaLevaCents),
    bolsaCents,
    impactoBolsaPorChanichGrandeCents,
    impactoSubsidioPorChanichGrandeCents,
    receitaSeTodosPrimeiroFilhoSocioCents,
    superavitProjetadoCents,
    superavitProjetadoPct,
    avisos,
    deslocamentoPorChanichGrandeCents,
    deslocamentoPorChanichPequenoCents,
    custoDosNaoChanichimCents: custoDosNaoChanichim,
    quantidadeSubsidiados,
    custoPorChanichGrandesSemOverrideCents,
    custoPorChanichPequenosSemOverrideCents,
    impactoBolsaPorChanichPequenoCents,
    impactoSubsidioPorChanichPequenoCents,
    gastosPorCategoria,
  };
}
