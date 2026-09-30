"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bd } from "@/lib/bd";
import { novoId } from "@/lib/ids";
import { exigirMembro } from "@/lib/auth";
import { valoresDigitados, type ComValores } from "@/lib/formulario";
import { categoriaValida, ehLinkDoMaps, lerLinkDoMaps } from "@/lib/lugares";
import { expandirLink, importar, MAXIMO_DE_IMAGENS, TIPOS_DE_IMAGEM } from "@/lib/importar";
import { localizar } from "@/lib/localizar";
import type { Sugestao } from "@/lib/leitor";

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? "").trim();
const numeroOuNulo = (s: string) => {
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

async function pastaDaViagem(viagemId: string, pastaId: string): Promise<string | null> {
  if (!pastaId) return null;
  const p = await bd.pasta.findFirst({ where: { id: pastaId, viagemId }, select: { id: true } });
  return p?.id ?? null;
}

// ---------------------------------------------------------------------------
// Chegada de posts
// ---------------------------------------------------------------------------

export type RespostaDoEnvio = { erro?: string; id?: string };

/**
 * A tela Adicionar chama isto direto (não por formulário), com os prints já
 * reduzidos no navegador. Espera a leitura terminar — uns segundos — e devolve
 * o id da importação para a tela abrir a revisão.
 */
export async function enviarPost(
  viagemId: string,
  entrada: { texto: string; imagens: { tipo: string; base64: string }[] },
): Promise<RespostaDoEnvio> {
  const { eu } = await exigirMembro(viagemId);
  const textoLimpo = (entrada.texto ?? "").trim().slice(0, 20000);
  const imagens = (entrada.imagens ?? [])
    .filter((i) => TIPOS_DE_IMAGEM.includes(i.tipo) && typeof i.base64 === "string" && i.base64.length > 0)
    .slice(0, MAXIMO_DE_IMAGENS);
  if (!textoLimpo && imagens.length === 0) return { erro: "Cole um link, escreva um nome ou escolha prints." };

  const id = await importar({
    viagemId,
    membroId: eu.id,
    origem: imagens.length ? "imagens" : /https?:\/\//.test(textoLimpo) ? "link" : "texto",
    texto: textoLimpo,
    imagens,
  });
  revalidatePath(`/v/${viagemId}`, "layout");
  return { id };
}

/**
 * Confirma as sugestões marcadas: viram lugares de verdade, na pasta escolhida.
 * O formulário manda, para cada sugestão `i`, `usar_i` e os campos editáveis.
 */
export async function confirmarImportacao(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  const { eu } = await exigirMembro(viagemId);
  const imp = await bd.importacao.findFirst({ where: { id: texto(dados, "importacaoId"), viagemId } });
  if (!imp) return;

  let pastaId = await pastaDaViagem(viagemId, texto(dados, "pastaId"));
  const novaPasta = texto(dados, "novaPasta");
  if (texto(dados, "pastaId") === "nova" && novaPasta) {
    pastaId = novoId();
    await bd.pasta.create({ data: { id: pastaId, viagemId, nome: novaPasta.slice(0, 60) } });
  }

  const sugestoes = (imp.sugestoes as unknown as Sugestao[]) ?? [];
  const escolhidas = sugestoes
    .map((s, i) => ({ s, i }))
    .filter(({ i }) => dados.get(`usar_${i}`) === "sim")
    .map(({ s, i }) => ({
      ...s,
      nome: texto(dados, `nome_${i}`) || s.nome,
      cidade: dados.has(`cidade_${i}`) ? texto(dados, `cidade_${i}`) : s.cidade,
      categoria: categoriaValida(texto(dados, `categoria_${i}`) || s.categoria),
    }));

  if (escolhidas.length) {
    await bd.lugar.createMany({
      data: escolhidas.map((s) => ({
        id: novoId(),
        viagemId,
        pastaId,
        nome: s.nome.slice(0, 120),
        categoria: s.categoria,
        cidade: s.cidade ?? "",
        endereco: s.endereco ?? "",
        descricao: s.descricao ?? "",
        dicas: s.dicas ?? "",
        lat: s.lat ?? null,
        lng: s.lng ?? null,
        googlePlaceId: s.googlePlaceId ?? null,
        fonte: imp.entrada.startsWith("http") ? imp.entrada : "",
        adicionadoPorId: eu.id,
      })),
    });
  }
  await bd.importacao.update({ where: { id: imp.id }, data: { estado: "revisada" } });
  revalidatePath(`/v/${viagemId}`, "layout");
  redirect(pastaId ? `/v/${viagemId}/lugares?pasta=${pastaId}` : `/v/${viagemId}/lugares`);
}

export async function descartarImportacao(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  await bd.importacao.deleteMany({ where: { id: texto(dados, "importacaoId"), viagemId } });
  revalidatePath(`/v/${viagemId}`, "layout");
  redirect(`/v/${viagemId}/caixa`);
}

// ---------------------------------------------------------------------------
// Lugares
// ---------------------------------------------------------------------------

export async function salvarLugar(_: ComValores, dados: FormData): Promise<ComValores> {
  const viagemId = texto(dados, "viagemId");
  const { eu, viagem } = await exigirMembro(viagemId);
  const recusar = (erro: string) => ({ erro, valores: valoresDigitados(dados) });

  const nome = texto(dados, "nome");
  if (nome.length < 1) return recusar("Dê um nome ao lugar.");
  const lugarId = texto(dados, "lugarId");
  const existente = lugarId
    ? await bd.lugar.findFirst({ where: { id: lugarId, viagemId, apagadoEm: null } })
    : null;
  if (lugarId && !existente) return recusar("Esse lugar não existe mais.");

  const campos = {
    nome: nome.slice(0, 120),
    categoria: categoriaValida(texto(dados, "categoria")),
    cidade: texto(dados, "cidade").slice(0, 80),
    endereco: texto(dados, "endereco").slice(0, 200),
    descricao: texto(dados, "descricao").slice(0, 600),
    dicas: texto(dados, "dicas").slice(0, 2000),
    fonte: texto(dados, "fonte").slice(0, 500),
    pastaId: await pastaDaViagem(viagemId, texto(dados, "pastaId")),
  };

  let lat = numeroOuNulo(texto(dados, "lat"));
  let lng = numeroOuNulo(texto(dados, "lng"));
  let googlePlaceId = existente?.googlePlaceId ?? null;

  // Um link do Google Maps colado manda no ponto: é o jeito de corrigir um
  // lugar que a busca pôs no lugar errado (ou não achou).
  const linkMaps = texto(dados, "linkMaps");
  if (linkMaps) {
    if (!ehLinkDoMaps(linkMaps)) return recusar("Esse link não parece do Google Maps.");
    const lido = lerLinkDoMaps(linkMaps.includes("goo.gl") ? await expandirLink(linkMaps) : linkMaps);
    if (lido?.lat == null) return recusar("Não achei o ponto nesse link. Abra o lugar no Google Maps e use Compartilhar → Copiar link.");
    lat = lido.lat;
    lng = lido.lng ?? null;
    googlePlaceId = null;
  }
  const mudouOnde =
    !existente ||
    existente.nome !== campos.nome ||
    existente.cidade !== campos.cidade ||
    existente.endereco !== campos.endereco;
  // Mudou nome ou endereço e ninguém mexeu no ponto: procura de novo.
  if (!linkMaps && mudouOnde && (lat == null || (existente && lat === existente.lat && lng === existente.lng))) {
    const achado = await localizar(campos, viagem.destino);
    lat = achado?.lat ?? null;
    lng = achado?.lng ?? null;
    googlePlaceId = achado?.googlePlaceId ?? null;
    if (achado?.endereco && !campos.endereco) campos.endereco = achado.endereco.slice(0, 200);
  }

  const id = existente?.id ?? novoId();
  if (existente) {
    await bd.lugar.update({ where: { id }, data: { ...campos, lat, lng, googlePlaceId } });
  } else {
    await bd.lugar.create({ data: { id, viagemId, ...campos, lat, lng, googlePlaceId, adicionadoPorId: eu.id } });
  }
  revalidatePath(`/v/${viagemId}`, "layout");
  redirect(`/v/${viagemId}/lugares/${id}`);
}

export async function apagarLugar(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  await bd.lugar.updateMany({ where: { id: texto(dados, "lugarId"), viagemId }, data: { apagadoEm: new Date() } });
  revalidatePath(`/v/${viagemId}`, "layout");
  redirect(`/v/${viagemId}/lugares`);
}

export async function votar(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  const { eu } = await exigirMembro(viagemId);
  const lugar = await bd.lugar.findFirst({ where: { id: texto(dados, "lugarId"), viagemId }, select: { id: true } });
  if (!lugar) return;
  const chave = { lugarId_membroId: { lugarId: lugar.id, membroId: eu.id } };
  const ja = await bd.voto.findUnique({ where: chave });
  if (ja) await bd.voto.delete({ where: chave });
  else await bd.voto.create({ data: { lugarId: lugar.id, membroId: eu.id } });
  revalidatePath(`/v/${viagemId}`, "layout");
}

export async function marcarFomos(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  await bd.lugar.updateMany({
    where: { id: texto(dados, "lugarId"), viagemId },
    data: { fomos: texto(dados, "fomos") === "sim" },
  });
  revalidatePath(`/v/${viagemId}`, "layout");
}

// ---------------------------------------------------------------------------
// Pastas
// ---------------------------------------------------------------------------

export async function criarPasta(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  const nome = texto(dados, "nome").slice(0, 60);
  if (!nome) return;
  const id = novoId();
  await bd.pasta.create({ data: { id, viagemId, nome, emoji: texto(dados, "emoji").slice(0, 8) || "📍" } });
  revalidatePath(`/v/${viagemId}`, "layout");
  redirect(`/v/${viagemId}/lugares?pasta=${id}`);
}

export async function editarPasta(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  const nome = texto(dados, "nome").slice(0, 60);
  if (!nome) return;
  await bd.pasta.updateMany({
    where: { id: texto(dados, "pastaId"), viagemId },
    data: { nome, emoji: texto(dados, "emoji").slice(0, 8) || "📍" },
  });
  revalidatePath(`/v/${viagemId}`, "layout");
}

/** Apagar a pasta não apaga os lugares: eles só ficam sem pasta. */
export async function apagarPasta(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  await bd.pasta.deleteMany({ where: { id: texto(dados, "pastaId"), viagemId } });
  revalidatePath(`/v/${viagemId}`, "layout");
  redirect(`/v/${viagemId}/lugares`);
}
