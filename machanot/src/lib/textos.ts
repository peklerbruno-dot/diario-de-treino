/** Rótulos em português. Termos do movimento ficam em hebraico transliterado (§1). */

export const PAPEIS = {
  CHANICH: "chanichim",
  MADRICH: "madrichim",
  PT: "peilim (PT)",
  EQUIPE: "equipe",
  PRESTADOR: "prestador",
} as const;

export const PAPEL_EXPLICACAO = {
  CHANICH: "Paga o preço divulgado. É entre eles que o custo é rateado.",
  MADRICH: "Paga contribuição simbólica. A diferença entra no preço dos chanichim.",
  PT: "Peil. Igual ao madrich: contribuição simbólica, subsidiada pelos chanichim.",
  EQUIPE: "Enfermeira, psicóloga, mechanech, shagririm. Não paga, e não é contada como subsídio.",
  PRESTADOR: "Segurança e afins. Não paga; o custo dele é gasto fixo.",
} as const;

export const TURMAS = { GRANDES: "grandes", PEQUENOS: "pequenos/babys" } as const;

export const TIPOS_GASTO = {
  VALOR_FECHADO: "valor fechado",
  POR_PESSOA: "por pessoa",
  POR_DIARIA: "por diária",
  CACHE_DIARIO: "cachê diário",
} as const;

export const TIPO_GASTO_FORMULA = {
  VALOR_FECHADO: "o valor digitado é o total",
  POR_PESSOA: "valor × total de pessoas da machané",
  POR_DIARIA: "diária da machané × pessoas × dias (o valor digitado é ignorado)",
  CACHE_DIARIO: "valor × pessoas × dias (cachê próprio, não a diária do local)",
} as const;

export const CATEGORIAS_GASTO = {
  TRANSPORTE: "transporte",
  ALIMENTACAO: "alimentação",
  SAUDE: "saúde",
  SEGURANCA: "segurança",
  MATERIAL: "material",
  BOLSA: "bolsas",
  ESTRUTURA: "estrutura",
  OUTROS: "outros",
} as const;

export const COR_CATEGORIA: Record<string, string> = {
  TRANSPORTE: "#2f6f9f",
  ALIMENTACAO: "#b0741f",
  SAUDE: "#2e7d68",
  SEGURANCA: "#7a4b8f",
  MATERIAL: "#4a6572",
  BOLSA: "#b03f5c",
  ESTRUTURA: "#6b8e23",
  OUTROS: "#8a8f98",
};

export const TIPOS_MACHANE = { KAITZ: "kaitz (verão)", CHOREF: "choref (inverno)" } as const;

export const STATUS = {
  RASCUNHO: "rascunho",
  EM_REVISAO: "em revisão",
  PUBLICADA: "publicada",
  ENCERRADA: "encerrada",
} as const;

export const METODOS_PRECO = { ADITIVO: "aditivo (R$)", MULTIPLICATIVO: "multiplicativo (%)" } as const;

export const ARREDONDAMENTOS = {
  NENHUM: "sem arredondar (centavos)",
  DEZ: "múltiplos de R$ 10",
  CINQUENTA: "múltiplos de R$ 50",
  CEM: "múltiplos de R$ 100",
} as const;

export const ALVOS_ALTERACAO = {
  MACHANE: "machané",
  PESO: "peso do rateio",
  POLITICA: "política de preço",
  CATEGORIA: "categoria de pessoas",
  GASTO: "gasto fixo",
  MADRICH: "madrich",
  PAGAMENTO: "pagamento",
  STATUS: "status",
  DUPLICACAO: "duplicação",
} as const;

export const CELULAS_GRADE = {
  primeiroFilhoSocio: "1º filho, sócio",
  primeiroFilhoNaoSocio: "1º filho, não-sócio",
  segundoFilhoSocio: "2º filho, sócio",
  segundoFilhoNaoSocio: "2º filho, não-sócio",
} as const;
