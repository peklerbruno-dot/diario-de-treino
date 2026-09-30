import "server-only";
import type { Part } from "@google/genai";
import { bd } from "./bd";
import { novoId } from "./ids";
import { ErroDeLeitura, buscarPagina, extrairLugares, imagemComoParte, type Sugestao } from "./leitor";
import { localizar } from "./localizar";
import { categoriaValida, ehLinkDoInstagram, ehLinkDoMaps, lerLinkDoMaps, primeiroLink } from "./lugares";

/**
 * O caminho inteiro de "chegou um post" até "sugestões prontas para revisar".
 *
 * Tudo que entra — pela tela Adicionar, pelo atalho do iPhone, pelo
 * compartilhar do Android — passa por aqui e vira uma `Importacao`. Nada vai
 * direto para a lista de lugares: a leitura automática erra às vezes (um nome
 * mal lido, um lugar que era só citado), e quem decide o que entra é gente.
 */

export type Chegada = {
  viagemId: string;
  membroId: string | null;
  origem: "link" | "imagens" | "texto" | "atalho";
  texto?: string;
  imagens?: { tipo: string; base64: string }[];
};

export const MAXIMO_DE_IMAGENS = 12;
export const TIPOS_DE_IMAGEM = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/** Segue um link curto (maps.app.goo.gl) até o endereço longo, sem baixar a página. */
export async function expandirLink(link: string): Promise<string> {
  try {
    const r = await fetch(link, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(8000), cache: "no-store" });
    const final = new URL(r.url || link);
    // Na Europa (e às vezes em servidor) o Google para numa página de consentimento
    // que carrega o destino no parâmetro "continue".
    if (final.hostname.startsWith("consent.")) return final.searchParams.get("continue") ?? link;
    return final.toString();
  } catch {
    return link;
  }
}

/** Localiza as sugestões que ainda não têm ponto, poucas de cada vez. */
async function localizarTodas(sugestoes: Sugestao[], regiao: string): Promise<Sugestao[]> {
  const saida = [...sugestoes];
  const DE_CADA_VEZ = 3;
  for (let i = 0; i < saida.length; i += DE_CADA_VEZ) {
    await Promise.all(
      saida.slice(i, i + DE_CADA_VEZ).map(async (s, k) => {
        if (s.lat != null) return;
        const achado = await localizar(s, regiao);
        if (achado) {
          saida[i + k] = {
            ...s,
            lat: achado.lat,
            lng: achado.lng,
            googlePlaceId: achado.googlePlaceId,
            endereco: s.endereco || achado.endereco || "",
          };
        }
      }),
    );
  }
  return saida;
}

/** Um texto curto, sem link e numa linha só, é o nome de um lugar: "Contramar, CDMX". */
const pareceNome = (t: string) => t.length <= 80 && !t.includes("\n") && !/https?:\/\//.test(t);

async function ler(c: Chegada, destino: string): Promise<{ resumo: string; lugares: Sugestao[]; entrada: string }> {
  const texto = (c.texto ?? "").trim();
  const link = primeiroLink(texto);
  const imagens: Part[] = (c.imagens ?? [])
    .slice(0, MAXIMO_DE_IMAGENS)
    .map((i) => ({ inlineData: { mimeType: i.tipo, data: i.base64 } }));

  // 1. Link do Google Maps: não precisa de leitura nenhuma, o link já diz o lugar.
  if (link && ehLinkDoMaps(link) && imagens.length === 0) {
    const longo = link.includes("goo.gl") ? await expandirLink(link) : link;
    const lido = lerLinkDoMaps(longo);
    if (lido?.nome || lido?.lat != null) {
      return {
        entrada: link,
        resumo: "Lugar vindo de um link do Google Maps.",
        lugares: [
          {
            nome: lido.nome ?? "Lugar do mapa",
            categoria: "outro",
            cidade: "",
            endereco: "",
            descricao: "",
            dicas: "",
            lat: lido.lat,
            lng: lido.lng,
          },
        ],
      };
    }
  }

  // 2. Só um nome digitado: vira uma sugestão só, sem gastar leitura.
  if (!link && imagens.length === 0 && pareceNome(texto)) {
    const [nome, ...resto] = texto.split(/\s*,\s*/);
    return {
      entrada: texto,
      resumo: "Lugar digitado.",
      lugares: [{ nome, categoria: "outro", cidade: resto.join(", "), endereco: "", descricao: "", dicas: "" }],
    };
  }

  // 3. Link de post ou de site: busca a legenda (e a capa) e manda ler.
  let conteudo = texto;
  if (link) {
    const pagina = await buscarPagina(link);
    if (pagina) {
      conteudo = [texto.replace(link, "").trim(), pagina.titulo && `Título: ${pagina.titulo}`, pagina.texto]
        .filter(Boolean)
        .join("\n\n");
      // A capa ajuda quando a legenda é curta ("salva pra depois 👀").
      if (pagina.imagem && imagens.length === 0 && pagina.texto.length < 400) {
        const capa = await imagemComoParte(pagina.imagem);
        if (capa) imagens.push(capa);
      }
    } else if (imagens.length === 0) {
      throw new ErroDeLeitura(
        ehLinkDoInstagram(link)
          ? "O Instagram não deixou ler esse post pelo link (acontece com conta privada e às vezes sem motivo). Mande os prints dos slides que eu leio as imagens."
          : "Não consegui abrir esse link. Mande um print ou cole o texto.",
      );
    }
  }

  const leitura = await extrairLugares({ texto: conteudo, imagens, destino });
  if (leitura.lugares.length === 0 && link && ehLinkDoInstagram(link) && imagens.length <= 1) {
    leitura.resumo +=
      " Se o post é um carrossel com os lugares nas imagens, mande os prints dos slides — pelo link só dá para ler a legenda.";
  }
  return { ...leitura, entrada: link ?? texto.slice(0, 500) };
}

/**
 * Recebe o que chegou, lê, localiza e grava. Devolve o id da importação — que
 * existe mesmo quando a leitura falha, para a pessoa ver o motivo na caixa de
 * entrada em vez de o post sumir.
 */
export async function importar(c: Chegada): Promise<string> {
  const viagem = await bd.viagem.findUniqueOrThrow({ where: { id: c.viagemId }, select: { destino: true } });
  const id = novoId();
  const entradaBruta = (c.texto ?? "").trim().slice(0, 500) || `${c.imagens?.length ?? 0} imagem(ns)`;
  await bd.importacao.create({
    data: { id, viagemId: c.viagemId, membroId: c.membroId, origem: c.origem, entrada: entradaBruta },
  });

  try {
    const { resumo, lugares, entrada } = await ler(c, viagem.destino);
    const localizados = await localizarTodas(lugares, viagem.destino);
    await bd.importacao.update({
      where: { id },
      data: {
        estado: "pronta",
        entrada: entrada || entradaBruta,
        observacao: resumo,
        sugestoes: localizados.map((s) => ({ ...s, categoria: categoriaValida(s.categoria) })),
      },
    });
  } catch (e) {
    const motivo = e instanceof ErroDeLeitura ? e.message : "Algo deu errado na leitura. Tente de novo.";
    if (!(e instanceof ErroDeLeitura)) console.error("[importar]", e);
    await bd.importacao.update({ where: { id }, data: { estado: "falhou", observacao: motivo } });
  }
  return id;
}
