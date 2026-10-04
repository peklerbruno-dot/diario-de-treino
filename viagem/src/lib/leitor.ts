import "server-only";
import { ApiError, GoogleGenAI, Type, type Part } from "@google/genai";
import { chaveDoGemini } from "./configuracao";
import { categoriaValida, ehLinkDoInstagram, ehLinkDoTikTok, CATEGORIAS } from "./lugares";

/**
 * O leitor de posts: um reel, um carrossel, um print ou um texto entra, e sai a
 * lista de lugares que ele menciona.
 *
 * Quem lê é o Gemini, pelo mesmo motivo do assistente deste repositório: tem
 * plano gratuito, lê imagem e devolve JSON no formato que se pede.
 *
 * O Instagram não gosta de ser lido por robô. Pelo link, o que dá para pegar
 * sem login é a legenda (e a capa) que o próprio Instagram entrega para quem
 * gera pré-visualização — e numa boa parte dos carrosséis de "10 restaurantes
 * em Tulum", a lista está na legenda. Quando está só nas imagens, ou quando o
 * Instagram fecha a porta, o caminho é mandar os prints: o Gemini lê cada
 * slide.
 */

const MODELO = process.env.GEMINI_MODELO || "gemini-flash-latest";

const clientes = new Map<string, GoogleGenAI>();
async function ia(): Promise<GoogleGenAI | null> {
  const chave = await chaveDoGemini();
  if (!chave) return null;
  let c = clientes.get(chave);
  if (!c) clientes.set(chave, (c = new GoogleGenAI({ apiKey: chave })));
  return c;
}
export const temGemini = async () => Boolean(await chaveDoGemini());

export type Sugestao = {
  nome: string;
  categoria: string;
  cidade: string;
  endereco: string;
  descricao: string;
  dicas: string;
  lat?: number;
  lng?: number;
  googlePlaceId?: string;
};

export type Leitura = { resumo: string; lugares: Sugestao[] };

export class ErroDeLeitura extends Error {}

// ---------------------------------------------------------------------------
// Buscar o que um link mostra
// ---------------------------------------------------------------------------

export type Pagina = { titulo: string; texto: string; imagem?: string };

const NAVEGADOR = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
/** É com este nome que o Instagram entrega a pré-visualização com legenda. */
const PRE_VISUALIZADOR = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

const decodificar = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

function meta(html: string, nome: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${nome}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${nome}["']`,
    "i",
  );
  const m = html.match(re);
  return m ? decodificar(m[1] ?? m[2] ?? "").trim() : "";
}

async function baixar(url: string, agente: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": agente, "Accept-Language": "pt-BR,pt;q=0.9,es;q=0.8,en;q=0.7" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

/** Legenda do Instagram na página de incorporação — o plano B quando a meta vem vazia. */
function legendaDaIncorporacao(html: string): string {
  const m = html.match(/<div class="Caption"[^>]*>([\s\S]*?)<div class="CaptionComments/);
  if (!m) return "";
  return decodificar(m[1].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .trim();
}

export async function buscarPagina(url: string): Promise<Pagina | null> {
  if (ehLinkDoTikTok(url)) {
    try {
      const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
      if (r.ok) {
        const j = (await r.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
        if (j.title) return { titulo: j.author_name ?? "TikTok", texto: j.title, imagem: j.thumbnail_url };
      }
    } catch {
      /* segue para a leitura genérica */
    }
  }

  if (ehLinkDoInstagram(url)) {
    const limpo = url.split("?")[0].replace(/\/?$/, "/");
    const html = await baixar(limpo, PRE_VISUALIZADOR);
    const texto = html ? meta(html, "og:description") || meta(html, "description") : "";
    const titulo = html ? meta(html, "og:title") : "";
    const imagem = html ? meta(html, "og:image") : "";
    if (texto && !/^(Instagram|Log in|Entrar)/i.test(texto)) {
      return { titulo, texto, imagem: imagem || undefined };
    }
    const codigo = limpo.match(/instagram\.com\/(?:p|reel|reels|tv)\/([\w-]+)/i)?.[1];
    if (codigo) {
      const incorporada = await baixar(`https://www.instagram.com/p/${codigo}/embed/captioned/`, NAVEGADOR);
      const legenda = incorporada ? legendaDaIncorporacao(incorporada) : "";
      if (legenda) return { titulo: titulo || "Instagram", texto: legenda, imagem: imagem || undefined };
    }
    return imagem ? { titulo, texto: "", imagem } : null;
  }

  const html = await baixar(url, NAVEGADOR);
  if (!html) return null;
  const titulo = meta(html, "og:title") || decodificar(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim();
  const descricao = meta(html, "og:description") || meta(html, "description");
  // Para blog e site de guia, o corpo da página diz mais do que a descrição.
  const corpo = decodificar(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .slice(0, 15000);
  return { titulo, texto: `${descricao}\n\n${corpo}`.trim(), imagem: meta(html, "og:image") || undefined };
}

/** Baixa uma imagem (a capa do post) para o Gemini olhar junto com a legenda. */
export async function imagemComoParte(url: string): Promise<Part | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!r.ok) return null;
    const tipo = r.headers.get("content-type") ?? "image/jpeg";
    if (!tipo.startsWith("image/")) return null;
    const bytes = Buffer.from(await r.arrayBuffer());
    if (bytes.length > 6_000_000) return null;
    return { inlineData: { mimeType: tipo.split(";")[0], data: bytes.toString("base64") } };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Extrair os lugares
// ---------------------------------------------------------------------------

const ESQUEMA = {
  type: Type.OBJECT,
  properties: {
    resumo: { type: Type.STRING, description: "Uma frase dizendo do que é o post." },
    lugares: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          nome: { type: Type.STRING, description: "Nome do estabelecimento ou ponto, como aparece no post." },
          categoria: { type: Type.STRING, enum: CATEGORIAS.map((c) => c.valor) },
          cidade: { type: Type.STRING, description: "Cidade ou região (ex.: 'Cidade do México', 'Tulum', 'Puerto Escondido'). Vazio se não der para saber." },
          endereco: { type: Type.STRING, description: "Endereço ou bairro, se aparecer. Vazio se não." },
          descricao: { type: Type.STRING, description: "Uma frase curta do que é o lugar." },
          dicas: { type: Type.STRING, description: "O que pedir, preço, horário, reserva — o que o post disser. Vazio se nada." },
        },
        required: ["nome", "categoria", "cidade", "endereco", "descricao", "dicas"],
        propertyOrdering: ["nome", "categoria", "cidade", "endereco", "descricao", "dicas"],
      },
    },
  },
  required: ["resumo", "lugares"],
  propertyOrdering: ["resumo", "lugares"],
};

function instrucoes(destino: string) {
  return `Você ajuda um grupo de amigos brasileiros a planejar uma viagem${destino ? ` para ${destino}` : ""}.
Recebe um post de rede social (legenda, texto e/ou imagens — prints de um carrossel, de um reel, de um mapa) e devolve a lista de LUGARES concretos que ele recomenda: restaurantes, bares, cafés, praias, passeios, museus, hotéis, lojas, mercados.

Regras:
- Um item por lugar. Carrossel com 10 restaurantes = 10 itens. Se o mesmo lugar aparecer em mais de um slide, junte num só.
- Use o nome próprio do lugar, como ele se chama de verdade (ex.: "Contramar", "Taquería Orinoco"). Não invente nome; se o post só descreve sem dizer o nome, deixe de fora.
- Não inclua cidades, bairros ou regiões inteiras como lugar, a não ser que o post trate aquilo como um ponto a visitar (uma praia, uma pirâmide, um cenote).
- Arrobas (@taqueriaorinoco) costumam ser o perfil do lugar: use para descobrir o nome, escrevendo-o por extenso.
- Cidade: a que o post indicar; se não indicar mas o contexto deixar claro, use-a.
- Escreva descrição e dicas em português do Brasil, curtas. Preserve preços na moeda original.
- Se não houver lugar nenhum, devolva a lista vazia e explique no resumo.`;
}

/**
 * Lê o que chegou e devolve os lugares. `imagens` vem como partes prontas do
 * Gemini (base64); `texto` pode ter a legenda, um texto colado ou nada.
 */
export async function extrairLugares(entrada: { texto?: string; imagens?: Part[]; destino?: string }): Promise<Leitura> {
  const cliente = await ia();
  if (!cliente) {
    throw new ErroDeLeitura("A leitura automática ainda está desligada. Quem organiza liga em Grupo → Leitura automática (é grátis).");
  }
  const partes: Part[] = [];
  if (entrada.texto?.trim()) partes.push({ text: `Texto do post:\n${entrada.texto.trim().slice(0, 20000)}` });
  for (const img of entrada.imagens ?? []) partes.push(img);
  if (partes.length === 0) throw new ErroDeLeitura("Não chegou nada para ler.");
  if (!entrada.texto?.trim()) partes.unshift({ text: "Imagens do post:" });

  let r;
  try {
    r = await cliente.models.generateContent({
      model: MODELO,
      contents: [{ role: "user", parts: partes }],
      config: {
        systemInstruction: instrucoes(entrada.destino ?? ""),
        responseMimeType: "application/json",
        responseSchema: ESQUEMA,
        temperature: 0.2,
      },
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 429) {
      throw new ErroDeLeitura("A cota gratuita do Gemini acabou por agora. Tente de novo daqui a pouco.");
    }
    console.error("[leitor]", e);
    throw new ErroDeLeitura("Não consegui ler o post agora. Tente de novo em instantes.");
  }

  return interpretarResposta(r.text ?? "");
}

/** Separado para dar para testar sem chamar o Gemini. */
export function interpretarResposta(bruto: string): Leitura {
  let j: unknown;
  try {
    j = JSON.parse(bruto.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new ErroDeLeitura("A leitura voltou num formato estranho. Tente de novo.");
  }
  const o = (j ?? {}) as { resumo?: unknown; lugares?: unknown };
  const texto = (x: unknown) => (typeof x === "string" ? x.trim() : "");
  const vistos = new Set<string>();
  const lugares: Sugestao[] = [];
  for (const item of Array.isArray(o.lugares) ? o.lugares : []) {
    const l = (item ?? {}) as Record<string, unknown>;
    const nome = texto(l.nome).slice(0, 120);
    if (!nome) continue;
    const chave = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    lugares.push({
      nome,
      categoria: categoriaValida(texto(l.categoria)),
      cidade: texto(l.cidade).slice(0, 80),
      endereco: texto(l.endereco).slice(0, 200),
      descricao: texto(l.descricao).slice(0, 300),
      dicas: texto(l.dicas).slice(0, 600),
    });
  }
  return { resumo: texto(o.resumo).slice(0, 400), lugares };
}

// ---------------------------------------------------------------------------
// Recibos e reservas — o mesmo Gemini, outras perguntas
// ---------------------------------------------------------------------------

async function gerarJson(partes: Part[], instrucoes: string, esquema: object): Promise<unknown> {
  const cliente = await ia();
  if (!cliente) {
    throw new ErroDeLeitura("A leitura automática ainda está desligada. Quem organiza liga em Grupo → Leitura automática (é grátis).");
  }
  try {
    const r = await cliente.models.generateContent({
      model: MODELO,
      contents: [{ role: "user", parts: partes }],
      config: { systemInstruction: instrucoes, responseMimeType: "application/json", responseSchema: esquema, temperature: 0.1 },
    });
    return JSON.parse((r.text ?? "").replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch (e) {
    if (e instanceof ApiError && e.status === 429) throw new ErroDeLeitura("A cota gratuita do Gemini acabou por agora. Tente daqui a pouco.");
    if (e instanceof SyntaxError) throw new ErroDeLeitura("A leitura voltou num formato estranho. Tente de novo.");
    console.error("[leitor]", e);
    throw new ErroDeLeitura("Não consegui ler agora. Tente de novo em instantes.");
  }
}

export type Recibo = { descricao: string; valor: number; moeda: string; data: string; categoria: string };

/** Foto de uma conta, nota ou comprovante → o que preenche a despesa. `valor` em centavos. */
export async function lerRecibo(imagem: Part, hoje: string): Promise<Recibo> {
  const j = (await gerarJson(
    [imagem],
    `Você lê a foto de uma conta, nota fiscal, recibo ou comprovante de pagamento de uma viagem (geralmente no México).
Devolva:
- descricao: o nome do estabelecimento, ou o que foi comprado, curto (ex.: "Contramar", "Uber aeroporto", "Oxxo").
- total: o TOTAL efetivamente pago, incluindo gorjeta (propina) se estiver somada. Número com ponto decimal.
- moeda: código ISO (MXN, BRL, USD, EUR). Em recibo mexicano com "$", é MXN.
- data: AAAA-MM-DD, se aparecer; senão "${hoje}".
- categoria: uma de comida, bebida, mercado, transporte, hospedagem, passeio, compras, outro.`,
    {
      type: Type.OBJECT,
      properties: {
        descricao: { type: Type.STRING },
        total: { type: Type.NUMBER },
        moeda: { type: Type.STRING },
        data: { type: Type.STRING },
        categoria: { type: Type.STRING, enum: ["comida", "bebida", "mercado", "transporte", "hospedagem", "passeio", "compras", "outro"] },
      },
      required: ["descricao", "total", "moeda", "data", "categoria"],
    },
  )) as Record<string, unknown>;
  const total = Number(j.total);
  if (!(total > 0)) throw new ErroDeLeitura("Não achei o valor total nessa foto. Tente uma foto mais de perto, com o total aparecendo.");
  const moeda = String(j.moeda ?? "").toUpperCase();
  return {
    descricao: String(j.descricao ?? "").trim().slice(0, 140),
    valor: Math.round(total * 100),
    moeda: ["MXN", "BRL", "USD", "EUR"].includes(moeda) ? moeda : "MXN",
    data: /^\d{4}-\d{2}-\d{2}$/.test(String(j.data)) ? String(j.data) : hoje,
    categoria: String(j.categoria ?? "outro"),
  };
}

export type Reserva = {
  titulo: string;
  tipo: string;
  resumo: string;
  itens: { dia: string; hora: string; titulo: string; notas: string }[];
};

/** Passagem, reserva de hotel, ingresso → título e os itens que entram no roteiro. */
export async function lerReserva(arquivo: Part, ano: string): Promise<Reserva> {
  const j = (await gerarJson(
    [arquivo],
    `Você lê um documento de viagem (passagem aérea, reserva de hotel/Airbnb, ingresso, aluguel de carro, seguro viagem) e devolve:
- titulo: curto e útil (ex.: "Voo LATAM GRU → MEX", "Airbnb Roma Norte", "Ingresso Teotihuacán").
- tipo: voo, hospedagem, seguro, passeio, transporte ou outro.
- resumo: uma ou duas linhas com o que importa (código de reserva/localizador, endereço, quem está na reserva).
- itens: os momentos que vão para o roteiro, cada um com dia (AAAA-MM-DD; se o ano não aparecer, use ${ano}), hora (HH:MM em 24h, ou vazio), titulo e notas.
  Voo: um item na partida ("Voo LA8070 GRU → MEX", notas com localizador e terminal). Hospedagem: check-in e check-out. Ingresso: o horário da visita.
  Seguro e documentos sem data marcada: lista vazia.`,
    {
      type: Type.OBJECT,
      properties: {
        titulo: { type: Type.STRING },
        tipo: { type: Type.STRING, enum: ["voo", "hospedagem", "seguro", "passeio", "transporte", "outro"] },
        resumo: { type: Type.STRING },
        itens: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { dia: { type: Type.STRING }, hora: { type: Type.STRING }, titulo: { type: Type.STRING }, notas: { type: Type.STRING } },
            required: ["dia", "hora", "titulo", "notas"],
          },
        },
      },
      required: ["titulo", "tipo", "resumo", "itens"],
    },
  )) as Record<string, unknown>;
  const itens = (Array.isArray(j.itens) ? j.itens : [])
    .map((x) => x as Record<string, unknown>)
    .map((x) => ({
      dia: String(x.dia ?? ""),
      hora: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(x.hora)) ? String(x.hora) : "",
      titulo: String(x.titulo ?? "").trim().slice(0, 140),
      notas: String(x.notas ?? "").trim().slice(0, 500),
    }))
    .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.dia) && x.titulo);
  return {
    titulo: String(j.titulo ?? "").trim().slice(0, 140) || "Documento",
    tipo: String(j.tipo ?? "outro"),
    resumo: String(j.resumo ?? "").trim().slice(0, 600),
    itens,
  };
}
