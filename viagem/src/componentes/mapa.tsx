"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type * as L from "leaflet";

export type Ponto = { id: string; nome: string; lat: number; lng: number; emoji: string; href?: string; detalhe?: string };

/**
 * O mapa dos lugares, sobre o OpenStreetMap — gratuito e sem chave. Serve para
 * ver onde as coisas ficam umas das outras; para ir até lá, cada marcador leva
 * à ficha, que abre o Google Maps.
 *
 * O Leaflet mexe na página direto e não roda no servidor, por isso é
 * carregado só aqui dentro, depois que a tela abre.
 */
export function Mapa({ pontos, altura = 420, mostrarEu = true }: { pontos: Ponto[]; altura?: number; mostrarEu?: boolean }) {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const leaflet = useRef<typeof L | null>(null);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let vivo = true;
    (async () => {
      const Lf = (await import("leaflet")).default;
      if (!vivo || !caixa.current || mapa.current) return;
      leaflet.current = Lf;
      const m = Lf.map(caixa.current, { zoomControl: true, attributionControl: true });
      Lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      mapa.current = m;

      const marcas = pontos.map((p) => {
        const icone = Lf.divIcon({
          className: "",
          html: `<div style="font-size:22px;line-height:34px;width:34px;height:34px;text-align:center;background:var(--cartao);border:2px solid var(--realce);border-radius:50% 50% 50% 4px;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.25)"><span style="display:inline-block;transform:rotate(45deg)">${p.emoji}</span></div>`,
          iconSize: [34, 34],
          iconAnchor: [4, 34],
        });
        const marca = Lf.marker([p.lat, p.lng], { icon: icone, title: p.nome }).addTo(m);
        const nome = p.nome.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
        const detalhe = (p.detalhe ?? "").replace(/[<>&"]/g, "");
        marca.bindPopup(
          `<strong>${nome}</strong>${detalhe ? `<br><span style="color:#756c65">${detalhe}</span>` : ""}${p.href ? `<br><a href="${p.href}">Abrir →</a>` : ""}`,
        );
        return marca;
      });

      if (marcas.length === 1) m.setView([pontos[0].lat, pontos[0].lng], 15);
      else if (marcas.length > 1) m.fitBounds(Lf.featureGroup(marcas).getBounds().pad(0.15));
      else m.setView([19.4326, -99.1332], 5); // México
    })();
    return () => {
      vivo = false;
      mapa.current?.remove();
      mapa.current = null;
    };
  }, [pontos]);

  function ondeEstou() {
    const Lf = leaflet.current;
    const m = mapa.current;
    if (!Lf || !m) return;
    setAviso("Procurando você…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c: [number, number] = [p.coords.latitude, p.coords.longitude];
        Lf.circleMarker(c, { radius: 8, color: "#fff", weight: 3, fillColor: "#1f5f8f", fillOpacity: 1 }).addTo(m).bindPopup("Você");
        m.setView(c, 14);
        setAviso("");
      },
      () => setAviso("Sem permissão para a localização."),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  return (
    <div className="relative">
      <div ref={caixa} style={{ height: altura }} className="z-0 overflow-hidden rounded-cartao border border-linha" />
      {mostrarEu && (
        <button type="button" onClick={ondeEstou} className="botao-leve absolute bottom-3 right-3 z-[500] min-h-[40px] px-3 text-[14px] shadow-cartao">
          📍 Onde estou
        </button>
      )}
      {aviso && <p className="mt-2 text-[14px] text-ambar">{aviso}</p>}
    </div>
  );
}
