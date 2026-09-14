/** Zod em toda fronteira: formulário, ação de servidor e importação (§2). */
import { z } from "zod";

export const zTipoMachane = z.enum(["KAITZ", "CHOREF"]);
export const zStatus = z.enum(["RASCUNHO", "EM_REVISAO", "PUBLICADA", "ENCERRADA"]);
export const zPapel = z.enum(["CHANICH", "MADRICH", "PT", "EQUIPE", "PRESTADOR"]);
export const zTurma = z.enum(["GRANDES", "PEQUENOS"]);
export const zTipoGasto = z.enum(["VALOR_FECHADO", "POR_PESSOA", "POR_DIARIA", "CACHE_DIARIO"]);
export const zCategoriaGasto = z.enum([
  "TRANSPORTE",
  "ALIMENTACAO",
  "SAUDE",
  "SEGURANCA",
  "MATERIAL",
  "BOLSA",
  "ESTRUTURA",
  "OUTROS",
]);
export const zMetodo = z.enum(["ADITIVO", "MULTIPLICATIVO"]);
export const zArredondamento = z.enum(["NENHUM", "DEZ", "CINQUENTA", "CEM"]);

/** Dinheiro é sempre inteiro em centavos. */
const centavos = z.number().int();
const centavosNaoNegativos = centavos.min(0, "Não pode ser negativo.");
const contagem = z.number().int().min(0, "Não pode ser negativo.").max(5000);
const dias = z.number().int().min(0).max(60);
const textoCurto = z.string().trim().max(200);
const dataOpcional = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD.")
  .nullable()
  .optional();

export const zCriarMachane = z.object({
  nome: z.string().trim().min(3, "Dê um nome à machané.").max(120),
  tipo: zTipoMachane,
  ano: z.number().int().min(2000).max(2100),
});

export const zPatchMachane = z
  .object({
    nome: z.string().trim().min(1).max(120),
    tipo: zTipoMachane,
    ano: z.number().int().min(2000).max(2100),
    dataInicio: dataOpcional,
    dataFim: dataOpcional,
    diariaCents: centavosNaoNegativos,
    diariaTabelaCents: centavosNaoNegativos.nullable(),
    diariaObservacao: z.string().trim().max(500).nullable(),
    diasGrandes: dias,
    diasPequenos: dias,
  })
  .partial();

export const zPatchCategoria = z
  .object({
    nome: textoCurto.min(1, "A categoria precisa de um nome."),
    papel: zPapel,
    turma: zTurma,
    dias,
    quantidade: contagem,
    geraHospedagem: z.boolean(),
    contribuicaoCents: centavosNaoNegativos,
    ordem: z.number().int(),
  })
  .partial();

export const zPatchGasto = z
  .object({
    descricao: textoCurto.min(1, "Descreva o gasto."),
    tipo: zTipoGasto,
    categoria: zCategoriaGasto,
    valorCents: centavos,
    pessoas: z.number().int().min(0).max(5000).nullable(),
    dias: dias.nullable(),
    observacao: z.string().trim().min(1, "Diga de onde veio este número.").max(500),
    revisado: z.boolean(),
    ordem: z.number().int(),
  })
  .partial();

const fracao = z.number().min(-1).max(5);

export const zPatchPolitica = z
  .object({
    metodo: zMetodo,
    margemBaseGrandesCents: centavos.nullable(),
    margemBasePequenosCents: centavos.nullable(),
    acrescimoNaoSocioCents: centavos.nullable(),
    descontoSegundoFilhoCents: centavos.nullable(),
    margemBasePct: fracao.nullable(),
    acrescimoNaoSocioPct: fracao.nullable(),
    descontoSegundoFilhoPct: fracao.nullable(),
    descontoSegundoFilhoGrandesCents: centavos.nullable(),
    descontoSegundoFilhoPequenosCents: centavos.nullable(),
    descontoSegundoFilhoGrandesPct: fracao.nullable(),
    descontoSegundoFilhoPequenosPct: fracao.nullable(),
    acrescimoSegundaLevaCents: centavos,
    superavitAlvoCents: centavos,
    arredondamento: zArredondamento,
  })
  .partial();

/** O override de peso nunca entra sem justificativa (§3, §13). */
export const zPeso = z
  .object({
    pesoOverride: z
      .number()
      .min(0, "O peso vai de 0 a 1.")
      .max(1, "O peso vai de 0 a 1.")
      .nullable(),
    justificativa: z.string().trim().max(500),
  })
  .refine((v) => v.pesoOverride === null || v.justificativa.length >= 10, {
    message: "Para ajustar o peso à mão é obrigatório escrever a justificativa (mín. 10 letras).",
    path: ["justificativa"],
  });

export const zDuplicar = z.object({
  origemId: z.string().min(1),
  nome: z.string().trim().min(3).max(120),
  tipo: zTipoMachane,
  ano: z.number().int().min(2000).max(2100),
});

export const zEmail = z.string().trim().toLowerCase().email("E-mail inválido.");

/** Mensagem curta de erro, do jeito que a tela mostra. */
export function primeiroErro(erro: z.ZodError): string {
  return erro.issues[0]?.message ?? "Dados inválidos.";
}
