"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { votar } from "@/acoes/lugares";
import { distanciaKm, distanciaPorExtenso, infoCategoria, linkDeRota } from "@/lib/lugares";
import { Vazio } from "./pecas";

export type LugarNaLista = {
  id: string;
  nome: string;
  categoria: string;
  cidade: string;
  endereco: string;
  descricao: string;
  lat: number | null;
  lng: number | null;
  googlePlaceId: string | null;
  fomos: boolean;
  votos: string[];
  quem: string;
};

type Ordem = "recentes" | "votos" | "perto";

/**
 * A lista de lugares, com a ordem "perto de mim" — que precisa do GPS do
 * celular e por isso só existe no navegador. A posição não sai do aparelho:
 * a distância é calculada aqui mesmo.
 */
export function ListaDeLugares({ viagemId, euId, lugares }: { viagemId: string; euId: string; lugares: LugarNaLista[] }) {
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [aqui, setAqui] = useState<{ lat: number; lng: number } | null>(null);
  const [aviso, setAviso] = useState("");
  const [busca, setBusca] = useState("");
  const [esconderFomos, setEsconderFomos] = useState(false);

  function pertoDeMim() {
    if (!("geolocation" in navigator)) {
      setAviso("Este navegador não informa a localização.");
      return;
    }
    setAviso("Procurando você…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setAqui({ lat: p.coords.latitude, lng: p.coords.longitude });
        setOrdem("perto");
        setAviso("");
      },
      () => setAviso("Sem permissão para a localização. No iPhone: Ajustes → Privacidade → Serviços de Localização → Safari."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const xs = lugares.filter(
      (l) =>
        (!esconderFomos || !l.fomos) &&
        (!termo || `${l.nome} ${l.cidade} ${l.descricao} ${l.endereco}`.toLowerCase().includes(termo)),
    );
    const comDistancia = xs.map((l) => ({
      ...l,
      km: aqui && l.lat != null && l.lng != null ? distanciaKm(aqui, { lat: l.lat, lng: l.lng }) : null,
    }));
    if (ordem === "votos") comDistancia.sort((a, b) => b.votos.length - a.votos.length);
    if (ordem === "perto") comDistancia.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
    return comDistancia;
  }, [lugares, ordem, aqui, busca, esconderFomos]);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar"
          className="campo min-w-0 flex-1 py-2"
          aria-label="Buscar lugar"
        />
        <select value={ordem} onChange={(e) => (e.target.value === "perto" ? pertoDeMim() : setOrdem(e.target.value as Ordem))} className="campo w-auto py-2" aria-label="Ordem">
          <option value="recentes">Recentes</option>
          <option value="votos">Mais queridos</option>
          <option value="perto">Perto de mim</option>
        </select>
      </div>
      <label className="mt-2 flex items-center gap-2 text-[14px] text-fosco">
        <input type="checkbox" checked={esconderFomos} onChange={(e) => setEsconderFomos(e.target.checked)} className="h-4 w-4 accent-[var(--realce)]" />
        Esconder onde já fomos
      </label>
      {aviso && <p className="mt-2 text-[14px] text-ambar">{aviso}</p>}

      {lista.length === 0 ? (
        <div className="mt-4">
          <Vazio titulo={lugares.length ? "Nada com esse filtro" : "Nenhum lugar aqui ainda"}>
            {!lugares.length && "Mande um reel, um carrossel ou um print em Adicionar."}
          </Vazio>
        </div>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {lista.map((l) => {
            const cat = infoCategoria(l.categoria);
            const votei = l.votos.includes(euId);
            return (
              <li key={l.id} className={`cartao p-3.5 ${l.fomos ? "opacity-70" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-2xl" aria-hidden>{cat.emoji}</span>
                  <Link href={`/v/${viagemId}/lugares/${l.id}`} className="min-w-0 flex-1">
                    <span className="block font-semibold leading-snug">
                      {l.nome}
                      {l.fomos && <span className="ml-2 rounded-pilula bg-verde-fraco px-2 py-0.5 text-[12px] font-semibold text-verde">fomos ✓</span>}
                    </span>
                    <span className="block text-[14px] text-fosco">
                      {[cat.nome, l.cidade, l.km != null ? distanciaPorExtenso(l.km) : ""].filter(Boolean).join(" · ")}
                    </span>
                    {l.descricao && <span className="mt-1 line-clamp-2 block text-[14px] text-grafite">{l.descricao}</span>}
                  </Link>
                  <form action={votar}>
                    <input type="hidden" name="viagemId" value={viagemId} />
                    <input type="hidden" name="lugarId" value={l.id} />
                    <button
                      aria-label={votei ? "Tirar o quero ir" : "Quero ir"}
                      aria-pressed={votei}
                      className={`flex min-h-[40px] min-w-[44px] items-center justify-center gap-1 rounded-pilula border px-2 text-[14px] font-semibold ${votei ? "border-realce bg-realce-fraco text-realce" : "border-regua text-fosco"}`}
                    >
                      {votei ? "♥" : "♡"} {l.votos.length || ""}
                    </button>
                  </form>
                </div>
                <div className="mt-2.5 flex gap-2 pl-10">
                  <a href={linkDeRota(l)} target="_blank" rel="noreferrer" className="pilula text-realce">🧭 Como chegar</a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
