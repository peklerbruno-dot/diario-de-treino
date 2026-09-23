/**
 * O mapa de tudo o que a equipe pode editar no site.
 *
 * Cada bloco e cada tipo de item diz aqui quais campos tem, com o nome que a
 * equipe lê no formulário e uma dica curta. O formulário de edição, a
 * validação no servidor e o conteúdo inicial saem daqui. Para acrescentar um
 * campo novo a uma seção, basta acrescentá-lo na lista — não há migração de
 * banco nem formulário para escrever.
 *
 * Este arquivo roda no navegador e no servidor: nada de banco aqui.
 */

export type TipoCampo =
  | "texto" // uma linha
  | "textoLongo" // parágrafos
  | "imagem" // foto enviada pela equipe
  | "arquivo" // PDF ou foto, para documentos
  | "data" // AAAA-MM-DD, guardada como texto (ver padrao.ts)
  | "hora" // HH:MM
  | "link" // endereço de site, ou caminho do próprio site ("/contato")
  | "cor"; // uma das cores da identidade visual

export type Campo = {
  nome: string;
  rotulo: string;
  tipo: TipoCampo;
  dica?: string;
  obrigatorio?: boolean;
  exemplo?: string;
};

export const CORES = {
  amarelo: { fundo: "#F5FFC6", nome: "Amarelo" },
  rosa: { fundo: "#FFACE4", nome: "Rosa" },
  verde: { fundo: "#C1FF9B", nome: "Verde" },
  turquesa: { fundo: "#75DDDD", nome: "Turquesa" },
  celeste: { fundo: "#87C8FD", nome: "Celeste" },
} as const;
export type Cor = keyof typeof CORES;
export const LISTA_CORES = Object.keys(CORES) as Cor[];

// ---------------------------------------------------------------------------
// Blocos: pedaços únicos do site
// ---------------------------------------------------------------------------

export const BLOCOS = {
  "site.aviso": {
    titulo: "Faixa de aviso no topo",
    descricao: "Aparece no alto de todas as páginas. Deixe o texto vazio para esconder a faixa.",
    campos: [
      { nome: "texto", rotulo: "Texto do aviso", tipo: "texto", exemplo: "Inscrições abertas para a machané de kaitz!" },
      { nome: "link", rotulo: "Link (opcional)", tipo: "link", dica: "Para onde a faixa leva quando alguém clica." },
    ],
  },
  "inicio.capa": {
    titulo: "Capa da página inicial",
    descricao: "A primeira coisa que quem entra no site vê.",
    campos: [
      { nome: "titulo", rotulo: "Título grande", tipo: "texto", obrigatorio: true },
      { nome: "subtitulo", rotulo: "Frase abaixo do título", tipo: "textoLongo" },
      { nome: "textoBotao", rotulo: "Texto do botão", tipo: "texto" },
      { nome: "linkBotao", rotulo: "Para onde o botão leva", tipo: "link" },
      { nome: "imagem", rotulo: "Foto da capa (opcional)", tipo: "imagem", dica: "Uma foto alegre de peulá ou machané. Sem foto, aparece o símbolo." },
    ],
  },
  "inicio.chamada": {
    titulo: "Convite no fim da página inicial",
    campos: [
      { nome: "titulo", rotulo: "Título", tipo: "texto", obrigatorio: true },
      { nome: "texto", rotulo: "Texto", tipo: "textoLongo" },
      { nome: "textoBotao", rotulo: "Texto do botão", tipo: "texto" },
      { nome: "linkBotao", rotulo: "Para onde o botão leva", tipo: "link" },
    ],
  },
  "chazit.quemSomos": {
    titulo: "Quem somos",
    campos: [
      { nome: "titulo", rotulo: "Título", tipo: "texto", obrigatorio: true },
      { nome: "texto", rotulo: "Texto", tipo: "textoLongo" },
      { nome: "imagem", rotulo: "Foto (opcional)", tipo: "imagem" },
    ],
  },
  "chazit.historia": {
    titulo: "Nossa história",
    campos: [
      { nome: "titulo", rotulo: "Título", tipo: "texto", obrigatorio: true },
      { nome: "texto", rotulo: "Texto", tipo: "textoLongo" },
      { nome: "imagem", rotulo: "Foto (opcional)", tipo: "imagem" },
    ],
  },
  "shichvot.intro": {
    titulo: "Apresentação das shichvot",
    campos: [
      { nome: "titulo", rotulo: "Título", tipo: "texto", obrigatorio: true },
      { nome: "texto", rotulo: "Texto", tipo: "textoLongo" },
    ],
  },
  "contato.info": {
    titulo: "Contato e endereço",
    descricao: "Aparece na página de contato e no rodapé de todas as páginas. Campo vazio não aparece no site.",
    campos: [
      { nome: "endereco", rotulo: "Endereço da sede", tipo: "textoLongo", dica: "Com número, bairro e cidade: é o que vai para o mapa." },
      { nome: "horario", rotulo: "Quando acontecem as atividades", tipo: "textoLongo", exemplo: "Sábados, das 14h às 17h" },
      { nome: "whatsapp", rotulo: "WhatsApp", tipo: "texto", dica: "Só o número, com DDD. O site monta o link.", exemplo: "(11) 99999-9999" },
      { nome: "email", rotulo: "E-mail", tipo: "texto" },
      { nome: "instagram", rotulo: "Instagram", tipo: "texto", dica: "O @ ou o endereço do perfil.", exemplo: "@chazithanoarsp" },
      { nome: "facebook", rotulo: "Facebook", tipo: "link" },
      { nome: "youtube", rotulo: "YouTube", tipo: "link" },
    ],
  },
  "contato.apoie": {
    titulo: "Apoie a Chazit",
    descricao: "Deixe o texto vazio para esconder esta parte.",
    campos: [
      { nome: "titulo", rotulo: "Título", tipo: "texto" },
      { nome: "texto", rotulo: "Texto", tipo: "textoLongo" },
      { nome: "pix", rotulo: "Chave PIX (opcional)", tipo: "texto" },
      { nome: "link", rotulo: "Link para doação (opcional)", tipo: "link" },
    ],
  },
} as const satisfies Record<string, { titulo: string; descricao?: string; campos: readonly Campo[] }>;

export type ChaveBloco = keyof typeof BLOCOS;

// ---------------------------------------------------------------------------
// Listas: coisas que a equipe acrescenta e tira
// ---------------------------------------------------------------------------

export const COLECOES = {
  pilar: {
    apagado: "Pilar apagado.",
    singular: "pilar",
    novo: "Adicionar pilar",
    ordenacao: "manual",
    campos: [
      { nome: "titulo", rotulo: "Nome", tipo: "texto", obrigatorio: true },
      { nome: "texto", rotulo: "Explicação curta", tipo: "textoLongo" },
      { nome: "cor", rotulo: "Cor do cartão", tipo: "cor" },
    ],
  },
  shichva: {
    apagado: "Shichvá apagada.",
    singular: "shichvá",
    novo: "Adicionar shichvá",
    ordenacao: "manual",
    campos: [
      { nome: "nome", rotulo: "Nome da shichvá", tipo: "texto", obrigatorio: true },
      { nome: "idade", rotulo: "Idade ou série", tipo: "texto", exemplo: "7 a 9 anos" },
      { nome: "texto", rotulo: "O que acontece nessa shichvá", tipo: "textoLongo" },
      { nome: "imagem", rotulo: "Foto (opcional)", tipo: "imagem" },
      { nome: "cor", rotulo: "Cor do cartão", tipo: "cor" },
    ],
  },
  evento: {
    apagado: "Atividade apagada.",
    singular: "atividade",
    novo: "Adicionar atividade",
    ordenacao: "data",
    campos: [
      { nome: "titulo", rotulo: "Nome da atividade", tipo: "texto", obrigatorio: true, exemplo: "Peulá de sábado" },
      { nome: "data", rotulo: "Data", tipo: "data", obrigatorio: true },
      { nome: "hora", rotulo: "Horário (opcional)", tipo: "hora" },
      { nome: "local", rotulo: "Local (opcional)", tipo: "texto" },
      { nome: "texto", rotulo: "Descrição", tipo: "textoLongo" },
      { nome: "linkInscricao", rotulo: "Link de inscrição (opcional)", tipo: "link", dica: "Um Google Forms, por exemplo." },
      { nome: "imagem", rotulo: "Imagem (opcional)", tipo: "imagem" },
    ],
  },
  noticia: {
    apagado: "Notícia apagada.",
    singular: "notícia",
    novo: "Escrever notícia",
    ordenacao: "data",
    campos: [
      { nome: "titulo", rotulo: "Título", tipo: "texto", obrigatorio: true },
      { nome: "data", rotulo: "Data", tipo: "data", obrigatorio: true },
      { nome: "resumo", rotulo: "Resumo (uma ou duas frases)", tipo: "textoLongo", dica: "Aparece no cartão da notícia." },
      { nome: "texto", rotulo: "Texto completo", tipo: "textoLongo" },
      { nome: "imagem", rotulo: "Foto (opcional)", tipo: "imagem" },
    ],
  },
  foto: {
    apagado: "Foto apagada.",
    singular: "foto",
    novo: "Adicionar foto",
    ordenacao: "manual",
    campos: [
      { nome: "imagem", rotulo: "Foto", tipo: "imagem", obrigatorio: true },
      { nome: "legenda", rotulo: "Legenda (opcional)", tipo: "texto", exemplo: "Machané de kaitz 2026" },
    ],
  },
  documento: {
    apagado: "Documento apagado.",
    singular: "documento",
    novo: "Adicionar documento",
    ordenacao: "manual",
    campos: [
      { nome: "titulo", rotulo: "Nome do documento", tipo: "texto", obrigatorio: true },
      { nome: "descricao", rotulo: "Descrição (opcional)", tipo: "textoLongo" },
      { nome: "arquivo", rotulo: "Arquivo (PDF)", tipo: "arquivo", dica: "Ou deixe vazio e use o link abaixo." },
      { nome: "link", rotulo: "Ou um link (Google Drive, por exemplo)", tipo: "link" },
    ],
  },
} as const satisfies Record<
  string,
  { apagado: string; singular: string; novo: string; ordenacao: "manual" | "data"; campos: readonly Campo[] }
>;

export type TipoItem = keyof typeof COLECOES;

export type Dados = Record<string, string>;

/** A Vercel recusa pedidos acima de 4,5 MB; fica uma folga. */
export const LIMITE_ARQUIVO = 4 * 1024 * 1024;

export function ehChaveBloco(x: string): x is ChaveBloco {
  return Object.prototype.hasOwnProperty.call(BLOCOS, x);
}
export function ehTipoItem(x: string): x is TipoItem {
  return Object.prototype.hasOwnProperty.call(COLECOES, x);
}
