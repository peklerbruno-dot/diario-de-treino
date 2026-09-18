import * as XLSX from "xlsx";
import {
  arrumarNome, arrumarTelefone, comoVinculo, normalizarEmail, pareceEmail,
  type VinculoDoContato,
} from "./contatos";

/**
 * Ler a planilha de contatos que a equipe já tem.
 *
 * A planilha real nunca é a planilha ideal. Ela tem o cabeçalho na terceira
 * linha, uma coluna chamada "e-mail" e outra "E-Mail ", linhas em branco no
 * meio, e a mesma pessoa duas vezes com a caixa diferente. Este arquivo existe
 * para transformar isso em contatos sem que ninguém precise arrumar a planilha
 * antes — porque "arrume a planilha antes" é o conselho que faz a importação
 * nunca acontecer.
 *
 * Nada aqui grava nada: a leitura devolve o que entendeu, com os problemas
 * apontados linha a linha, e a tela mostra tudo isso **antes** de qualquer
 * gravação. Importação que grava primeiro e explica depois é importação que se
 * desfaz na mão.
 */

export type ProblemaDaLinha = "SEM_EMAIL" | "EMAIL_INVALIDO" | "REPETIDO_NA_PLANILHA";

export const EXPLICACAO_DO_PROBLEMA: Record<ProblemaDaLinha, string> = {
  SEM_EMAIL: "sem e-mail",
  EMAIL_INVALIDO: "o e-mail não parece um e-mail",
  REPETIDO_NA_PLANILHA: "repetido mais acima na própria planilha",
};

export type LinhaLida = {
  /** A linha na planilha, contando como o Excel conta. Para a pessoa achar. */
  linha: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  vinculo: VinculoDoContato;
  instituicao: string | null;
  etiquetas: string[];
  observacao: string | null;
  problema: ProblemaDaLinha | null;
};

export type Leitura = {
  /** Que coluna da planilha virou que campo. A tela mostra, para a pessoa conferir. */
  colunas: { campo: string; coluna: string }[];
  naoReconhecidas: string[];
  linhas: LinhaLida[];
};

/** Sem acento, sem pontuação, em minúsculas: "E-Mail " e "e_mail" viram "email". */
const achatar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Como cada campo pode estar escrito no cabeçalho.
 *
 * A ordem **dentro** de `nomes` decide quem ganha, e não a posição da coluna na
 * planilha: procura-se primeiro por "emailinstitucional" em todas as colunas, e
 * só depois por "email". Sem isso, uma planilha com as duas colunas pegaria a
 * que estivesse mais à esquerda — que é sempre a errada.
 */
const APELIDOS: { campo: keyof typeof CAMPOS; nomes: string[] }[] = [
  { campo: "email", nomes: ["emailinstitucional", "email", "emails", "correioeletronico", "mail"] },
  { campo: "nome", nomes: ["nomecompleto", "nome", "contato", "participante", "pessoa"] },
  { campo: "telefone", nomes: ["telefone", "celular", "whatsapp", "fone", "tel"] },
  { campo: "vinculo", nomes: ["vinculo", "categoria", "tipo", "perfil", "relacao"] },
  { campo: "instituicao", nomes: ["instituicao", "universidade", "departamento", "unidade", "empresa", "organizacao"] },
  { campo: "etiquetas", nomes: ["etiquetas", "etiqueta", "tags", "grupos", "grupo", "segmento", "lista"] },
  { campo: "observacao", nomes: ["observacao", "observacoes", "obs", "notas", "nota", "comentario"] },
];

const CAMPOS = {
  nome: "Nome", email: "E-mail", telefone: "Telefone", vinculo: "Vínculo",
  instituicao: "Instituição", etiquetas: "Etiquetas", observacao: "Observação",
};

/**
 * Vírgula ou ponto e vírgula?
 *
 * O Excel em português salva CSV com ponto e vírgula. Adivinhar isso pela
 * **primeira linha** do arquivo parece razoável e está errado: a primeira linha
 * de uma planilha de equipe costuma ser um título solto — "Contatos do Centro —
 * 2025" —, que não tem separador nenhum. O palpite saía "vírgula", o arquivo
 * inteiro virava uma coluna só, e a importação dizia "não achei contatos aqui
 * dentro" sobre uma planilha perfeitamente boa.
 *
 * Então a conta é sobre as primeiras linhas com conteúdo, somadas: quem
 * aparecer mais, ganha.
 */
function separadorDe(texto: string): string {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10);
  const quantos = (marca: RegExp) =>
    linhas.reduce((soma, linha) => soma + (linha.match(marca) ?? []).length, 0);

  return quantos(/;/g) > quantos(/,/g) ? ";" : ",";
}

/**
 * Achar a linha do cabeçalho.
 *
 * Quase sempre é a primeira, mas planilha de equipe adora um título e uma linha
 * em branco antes. Cabeçalho é a primeira linha das dez primeiras em que eu
 * reconheço alguma coluna **e** que tenha um "e-mail" — sem e-mail não há o que
 * importar, então uma linha sem ele não é cabeçalho de nada.
 */
function acharCabecalho(grade: string[][]): number {
  for (let i = 0; i < Math.min(grade.length, 10); i++) {
    const achatadas = grade[i].map(achatar);
    const temEmail = achatadas.some((c) => APELIDOS[0].nomes.includes(c));
    if (temEmail) return i;
  }
  return 0;
}

/**
 * Excel e CSV são dois arquivos diferentes, e tratá-los igual estraga o CSV.
 *
 * Um `.xlsx` é um zip e começa por "PK"; um `.xls` antigo começa por D0 CF. O
 * resto é texto. E texto lido como planilha binária é lido na tabela de
 * caracteres errada: um CSV do Google Sheets, que é UTF-8, chega com "Vínculo"
 * virado em "VÃ­nculo" — e, junto com o cabeçalho, todo nome com acento. Numa
 * lista de pessoas isso não é detalhe de formatação: é o nome de alguém escrito
 * errado no e-mail que essa pessoa vai receber.
 *
 * Por isso o texto é decodificado como UTF-8 aqui, com o BOM removido, e
 * entregue como texto.
 */
function abrir(arquivo: ArrayBuffer | Buffer): XLSX.WorkBook {
  const bytes = Buffer.isBuffer(arquivo) ? arquivo : Buffer.from(arquivo);

  const ehZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK" — .xlsx
  const ehXlsAntigo = bytes[0] === 0xd0 && bytes[1] === 0xcf;
  if (ehZip || ehXlsAntigo) return XLSX.read(bytes, { type: "buffer", raw: false });

  const texto = bytes.toString("utf8").replace(/^\uFEFF/, "");

  return XLSX.read(texto, { type: "string", raw: false, FS: separadorDe(texto) });
}

export function lerPlanilha(arquivo: ArrayBuffer | Buffer): Leitura {
  const livro = abrir(arquivo);
  const primeira = livro.SheetNames[0];
  if (!primeira) return { colunas: [], naoReconhecidas: [], linhas: [] };

  const grade = XLSX.utils.sheet_to_json<string[]>(livro.Sheets[primeira], {
    header: 1,
    blankrows: false,
    defval: "",
  });
  if (grade.length === 0) return { colunas: [], naoReconhecidas: [], linhas: [] };

  const iCabecalho = acharCabecalho(grade);
  const cabecalho = (grade[iCabecalho] ?? []).map((c) => String(c ?? ""));

  const onde: Partial<Record<keyof typeof CAMPOS, number>> = {};
  const usadas = new Set<number>();
  for (const { campo, nomes } of APELIDOS) {
    for (const apelido of nomes) {
      const i = cabecalho.findIndex((titulo, j) => !usadas.has(j) && achatar(titulo) === apelido);
      if (i >= 0) {
        onde[campo] = i;
        usadas.add(i);
        break;
      }
    }
  }

  const colunas = (Object.keys(CAMPOS) as (keyof typeof CAMPOS)[])
    .filter((campo) => onde[campo] != null)
    .map((campo) => ({ campo: CAMPOS[campo], coluna: cabecalho[onde[campo]!] }));

  const naoReconhecidas = cabecalho.filter((t, j) => t.trim() && !usadas.has(j));

  const celula = (linha: string[], campo: keyof typeof CAMPOS): string => {
    const i = onde[campo];
    return i == null ? "" : String(linha[i] ?? "").trim();
  };

  const jaVistos = new Set<string>();
  const linhas: LinhaLida[] = [];

  for (let i = iCabecalho + 1; i < grade.length; i++) {
    const bruta = grade[i] ?? [];
    if (bruta.every((c) => !String(c ?? "").trim())) continue;

    const email = normalizarEmail(celula(bruta, "email"));
    const nome = arrumarNome(celula(bruta, "nome"));

    // Uma linha sem nome e sem e-mail é lixo de planilha (um total, uma nota de
    // rodapé), não um contato que deu errado. Some sem virar problema.
    if (!email && !nome) continue;

    let problema: ProblemaDaLinha | null = null;
    if (!email) problema = "SEM_EMAIL";
    else if (!pareceEmail(email)) problema = "EMAIL_INVALIDO";
    else if (jaVistos.has(email)) problema = "REPETIDO_NA_PLANILHA";
    if (email && !problema) jaVistos.add(email);

    linhas.push({
      linha: i + 1, // o Excel conta a partir de 1
      nome,
      email,
      telefone: arrumarTelefone(celula(bruta, "telefone")),
      vinculo: comoVinculo(celula(bruta, "vinculo")),
      instituicao: celula(bruta, "instituicao") || null,
      etiquetas: celula(bruta, "etiquetas")
        .split(/[;,/|]/)
        .map((e) => e.trim())
        .filter(Boolean),
      observacao: celula(bruta, "observacao") || null,
      problema,
    });
  }

  return { colunas, naoReconhecidas, linhas };
}

export const aproveitaveis = (leitura: Leitura) => leitura.linhas.filter((l) => !l.problema);
