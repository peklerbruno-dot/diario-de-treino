import "server-only";

/**
 * Achar o ponto no mapa de um lugar que só tem nome e cidade.
 *
 * Duas vias, na ordem:
 *
 * 1. **Google Places**, se houver `GOOGLE_MAPS_API_KEY`. É a busca que acha
 *    "Taquería Orinoco, Roma Norte" de primeira, e devolve o identificador que
 *    faz o "Abrir no Maps" cair direto na ficha do lugar. O Google dá uma cota
 *    mensal gratuita que uma viagem entre amigos não chega perto de gastar.
 * 2. **OpenStreetMap** (Photon e, se falhar, Nominatim), sem chave e sem custo.
 *    Acha bem endereço, praia e ponto turístico; restaurante pequeno, às vezes
 *    não — e tudo bem: o lugar fica sem ponto no mapa, mas o "Como chegar"
 *    continua funcionando, porque ele manda o nome ao Google Maps.
 *
 * Nada aqui é obrigatório. Se nenhuma via achar, devolve nulo e segue a vida.
 */

export type Achado = {
  lat: number;
  lng: number;
  endereco?: string;
  googlePlaceId?: string;
};

const AGENTE = "viagem-em-grupo/1.0 (app pessoal)";

async function comPrazo(url: string, init: RequestInit = {}, ms = 8000): Promise<Response | null> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(ms), cache: "no-store" });
  } catch {
    return null;
  }
}

/**
 * A região da viagem: a caixa no mapa e o país do destino ("México" → o
 * México inteiro). Sem ela, "Contramar, Cidade do México" já foi parar num
 * bairro de Cuiabá — o OpenStreetMap não entende o nome da cidade em
 * português e fica com o que casar melhor com "Contramar", no mundo todo.
 * Com ela, a busca só olha dentro do destino, e o que cair fora é descartado.
 */
export type Regiao = { oeste: number; sul: number; leste: number; norte: number; pais?: string };

const regioes = new Map<string, Regiao | null>();

export async function regiaoDoDestino(destino: string): Promise<Regiao | null> {
  const chave = destino.trim().toLowerCase();
  if (!chave) return null;
  if (regioes.has(chave)) return regioes.get(chave)!;
  const r = await comPrazo(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(destino)}`,
    { headers: { "User-Agent": AGENTE, "Accept-Language": "pt-BR,es" } },
  );
  let regiao: Regiao | null = null;
  if (r?.ok) {
    const j = (await r.json()) as { boundingbox?: string[]; address?: { country_code?: string } }[];
    const b = j[0]?.boundingbox?.map(Number);
    if (b && b.length === 4 && b.every(Number.isFinite)) {
      regiao = { sul: b[0], norte: b[1], oeste: b[2], leste: b[3], pais: j[0].address?.country_code };
    }
  }
  // Só guarda o que deu certo: uma falha de rede não pode desligar o filtro para sempre.
  if (regiao) regioes.set(chave, regiao);
  return regiao;
}

/** Folga de meio grau: cidade de fronteira e ilha perto da costa não ficam de fora. */
export const dentro = (a: { lat: number; lng: number }, r: Regiao | null) =>
  !r || (a.lat >= r.sul - 0.5 && a.lat <= r.norte + 0.5 && a.lng >= r.oeste - 0.5 && a.lng <= r.leste + 0.5);

async function peloGoogle(consulta: string, regiao: Regiao | null): Promise<Achado | null> {
  const chave = process.env.GOOGLE_MAPS_API_KEY;
  if (!chave) return null;
  const r = await comPrazo("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": chave,
      "X-Goog-FieldMask": "places.id,places.formattedAddress,places.location",
    },
    body: JSON.stringify({
      textQuery: consulta,
      maxResultCount: 1,
      languageCode: "pt-BR",
      ...(regiao
        ? {
            locationRestriction: {
              rectangle: {
                low: { latitude: regiao.sul, longitude: regiao.oeste },
                high: { latitude: regiao.norte, longitude: regiao.leste },
              },
            },
          }
        : {}),
    }),
  });
  if (!r?.ok) {
    if (r) console.error("[localizar] Google respondeu", r.status, await r.text().catch(() => ""));
    return null;
  }
  const j = (await r.json()) as {
    places?: { id: string; formattedAddress?: string; location?: { latitude: number; longitude: number } }[];
  };
  const p = j.places?.[0];
  if (!p?.location) return null;
  return { lat: p.location.latitude, lng: p.location.longitude, endereco: p.formattedAddress, googlePlaceId: p.id };
}

async function peloPhoton(consulta: string, regiao: Regiao | null): Promise<Achado | null> {
  const caixa = regiao ? `&bbox=${regiao.oeste},${regiao.sul},${regiao.leste},${regiao.norte}` : "";
  const r = await comPrazo(
    `https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(consulta)}${caixa}`,
    { headers: { "User-Agent": AGENTE } },
  );
  if (!r?.ok) return null;
  const j = (await r.json()) as {
    features?: { geometry: { coordinates: [number, number] }; properties: Record<string, string> }[];
  };
  const f = j.features?.[0];
  if (!f) return null;
  const p = f.properties;
  const endereco = [p.street && `${p.street}${p.housenumber ? ` ${p.housenumber}` : ""}`, p.district, p.city, p.state]
    .filter(Boolean)
    .join(", ");
  return { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], endereco: endereco || undefined };
}

async function peloNominatim(consulta: string, regiao: Regiao | null): Promise<Achado | null> {
  const pais = regiao?.pais ? `&countrycodes=${regiao.pais}` : "";
  const r = await comPrazo(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(consulta)}${pais}`,
    { headers: { "User-Agent": AGENTE, "Accept-Language": "pt-BR,es" } },
  );
  if (!r?.ok) return null;
  const j = (await r.json()) as { lat: string; lon: string; display_name?: string }[];
  const p = j[0];
  if (!p) return null;
  return { lat: Number(p.lat), lng: Number(p.lon), endereco: p.display_name };
}

/**
 * Procura o lugar. `regiao` é o destino da viagem ("México"): sem ele,
 * "El Moro" pode virar um bairro na Espanha.
 */
export async function localizar(l: { nome: string; cidade?: string; endereco?: string }, destino = ""): Promise<Achado | null> {
  const partes = [l.nome, l.endereco, l.cidade, destino].map((x) => (x ?? "").trim()).filter(Boolean);
  // Não repetir "México" se a cidade já é "Cidade do México".
  const consulta = partes
    .filter((p, i) => i === 0 || !partes.slice(0, i).some((q) => q.toLowerCase().includes(p.toLowerCase())))
    .join(", ");

  // A caixa mais justa que se conseguir: a da cidade, senão a do país. O
  // Nominatim entende "Cidade do México" (tem os nomes em várias línguas);
  // a busca de estabelecimento é que não.
  const cidade = (l.cidade ?? "").trim();
  const regiao =
    (cidade ? await regiaoDoDestino(destino ? `${cidade}, ${destino}` : cidade) : null) ??
    (await regiaoDoDestino(destino));
  const vale = (a: Achado | null) => (a && dentro(a, regiao) ? a : null);

  const google = vale(await peloGoogle(consulta, regiao));
  if (google) return google;

  // No OpenStreetMap o nome da cidade em português atrapalha mais do que ajuda
  // ("Cidade do México" ≠ "Ciudad de México"); com a caixa do destino, só o
  // nome do lugar já basta. Tenta com a cidade, e depois sem.
  const semCidade = l.nome.trim();
  for (const q of consulta === semCidade ? [consulta] : [consulta, semCidade]) {
    const achado = vale(await peloPhoton(q, regiao)) ?? vale(await peloNominatim(q, regiao));
    if (achado) return achado;
  }
  return null;
}

export const temGoogle = () => Boolean(process.env.GOOGLE_MAPS_API_KEY);
