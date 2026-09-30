/**
 * Lugares: categorias, links para o Google Maps e distância.
 *
 * Não há mapa pago no meio do caminho. Para ir a um lugar, o app abre o
 * Google Maps (ou o Waze, ou o Uber) já com o destino preenchido — é o GPS
 * que o celular já tem, com trânsito e tudo, e sem custo nenhum para nós.
 */

export const CATEGORIAS = [
  { valor: "restaurante", nome: "Restaurante", emoji: "🌮" },
  { valor: "bar", nome: "Bar / balada", emoji: "🍹" },
  { valor: "cafe", nome: "Café / doce", emoji: "☕" },
  { valor: "praia", nome: "Praia", emoji: "🏖️" },
  { valor: "passeio", nome: "Passeio / natureza", emoji: "🌋" },
  { valor: "cultura", nome: "Museu / cultura", emoji: "🏛️" },
  { valor: "compras", nome: "Compras / mercado", emoji: "🛍️" },
  { valor: "hospedagem", nome: "Hospedagem", emoji: "🏨" },
  { valor: "transporte", nome: "Transporte", emoji: "✈️" },
  { valor: "outro", nome: "Outro", emoji: "📍" },
] as const;

export type Categoria = (typeof CATEGORIAS)[number]["valor"];
const VALORES = new Set<string>(CATEGORIAS.map((c) => c.valor));
export const categoriaValida = (c: string): Categoria => (VALORES.has(c) ? (c as Categoria) : "outro");
export const infoCategoria = (c: string) => CATEGORIAS.find((x) => x.valor === c) ?? CATEGORIAS[CATEGORIAS.length - 1];

type ComDestino = { nome: string; cidade?: string; endereco?: string; lat?: number | null; lng?: number | null; googlePlaceId?: string | null };

/** O texto que o Google Maps entende como destino. Nome + cidade acha quase tudo. */
export function textoDeBusca(l: ComDestino): string {
  return [l.nome, l.endereco || "", l.cidade || ""].filter(Boolean).join(", ");
}

/** Abre o lugar no Google Maps — a ficha, com fotos, horário e avaliações. */
export function linkDoMaps(l: ComDestino): string {
  const u = new URL("https://www.google.com/maps/search/");
  u.searchParams.set("api", "1");
  u.searchParams.set("query", l.lat != null && l.lng != null && !l.nome ? `${l.lat},${l.lng}` : textoDeBusca(l));
  if (l.googlePlaceId) u.searchParams.set("query_place_id", l.googlePlaceId);
  return u.toString();
}

export type Modal = "driving" | "walking" | "transit";

/** "Como chegar": o Google Maps já em modo de navegação, saindo de onde você está. */
export function linkDeRota(l: ComDestino, modal: Modal = "driving"): string {
  const u = new URL("https://www.google.com/maps/dir/");
  u.searchParams.set("api", "1");
  u.searchParams.set("destination", destino(l));
  if (l.googlePlaceId) u.searchParams.set("destination_place_id", l.googlePlaceId);
  u.searchParams.set("travelmode", modal);
  return u.toString();
}

function destino(l: ComDestino) {
  // Com nome, o Google cai na ficha do lugar e não num ponto solto no mapa.
  return l.nome ? textoDeBusca(l) : `${l.lat},${l.lng}`;
}

/**
 * A rota do dia: todos os lugares do dia, na ordem do roteiro, numa navegação
 * só. O Google aceita até nove paradas no meio pelo link; passou disso, o
 * resto fica de fora e a tela avisa.
 */
export function linkDaRotaDoDia(paradas: ComDestino[]): string | null {
  if (paradas.length === 0) return null;
  if (paradas.length === 1) return linkDeRota(paradas[0]);
  const lista = paradas.slice(0, 10);
  const u = new URL("https://www.google.com/maps/dir/");
  u.searchParams.set("api", "1");
  u.searchParams.set("destination", destino(lista[lista.length - 1]));
  u.searchParams.set("waypoints", lista.slice(0, -1).map(destino).join("|"));
  return u.toString();
}

export const MAXIMO_DE_PARADAS = 10;

export function linkDoWaze(l: ComDestino): string {
  if (l.lat != null && l.lng != null) return `https://waze.com/ul?ll=${l.lat},${l.lng}&navigate=yes`;
  return `https://waze.com/ul?q=${encodeURIComponent(textoDeBusca(l))}&navigate=yes`;
}

export function linkDoUber(l: ComDestino): string {
  const u = new URL("https://m.uber.com/ul/");
  u.searchParams.set("action", "setPickup");
  u.searchParams.set("pickup", "my_location");
  u.searchParams.set("dropoff[nickname]", l.nome);
  if (l.lat != null && l.lng != null) {
    u.searchParams.set("dropoff[latitude]", String(l.lat));
    u.searchParams.set("dropoff[longitude]", String(l.lng));
  } else {
    u.searchParams.set("dropoff[formatted_address]", textoDeBusca(l));
  }
  return u.toString();
}

/** Distância em linha reta, em km (fórmula de haversine). */
export function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function distanciaPorExtenso(km: number): string {
  if (km < 1) return `${Math.round(km * 1000 / 10) * 10} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

/**
 * O que dá para tirar de um link do Google Maps sem perguntar a ninguém.
 *
 *   https://www.google.com/maps/place/Contramar/@19.4194,-99.1682,17z/...
 *   https://www.google.com/maps/search/?api=1&query=...
 *   https://www.google.com/maps?q=19.43,-99.13
 *
 * Link curto (maps.app.goo.gl) precisa ser seguido antes — ver `expandirLink`.
 */
export function lerLinkDoMaps(link: string): { nome?: string; lat?: number; lng?: number } | null {
  let u: URL;
  try {
    u = new URL(link);
  } catch {
    return null;
  }
  if (!/(^|\.)google\.[a-z.]+$/.test(u.hostname) && u.hostname !== "maps.app.goo.gl" && u.hostname !== "goo.gl") return null;

  const saida: { nome?: string; lat?: number; lng?: number } = {};
  const lugar = u.pathname.match(/\/maps\/place\/([^/]+)/);
  if (lugar) saida.nome = decodeURIComponent(lugar[1].replace(/\+/g, " "));

  // O ponto exato do lugar vem em "!3d<lat>!4d<lng>"; o "@lat,lng" é o centro da tela.
  const exato = link.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  const centro = u.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const par = exato ?? centro;
  if (par) {
    saida.lat = Number(par[1]);
    saida.lng = Number(par[2]);
  }

  const q = u.searchParams.get("query") ?? u.searchParams.get("q");
  if (q) {
    const coords = q.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
    if (coords) {
      saida.lat ??= Number(coords[1]);
      saida.lng ??= Number(coords[2]);
    } else {
      saida.nome ??= q;
    }
  }
  return saida.nome || saida.lat != null ? saida : null;
}

export const ehLinkDoMaps = (t: string) =>
  /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)/i.test(t.trim());

export const ehLinkDoInstagram = (t: string) =>
  /^https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv)\/[\w-]+/i.test(t.trim());

export const ehLinkDoTikTok = (t: string) => /^https?:\/\/([a-z]+\.)?tiktok\.com\//i.test(t.trim());

/** O primeiro link de um texto colado ("Olha isso! https://...") */
export function primeiroLink(texto: string): string | null {
  const m = texto.match(/https?:\/\/[^\s<>"']+/);
  return m ? m[0].replace(/[).,;!?]+$/, "") : null;
}
