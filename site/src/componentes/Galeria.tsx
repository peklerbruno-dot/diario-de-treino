"use client";

import { useEffect, useState } from "react";
import type { ItemSite } from "@/lib/conteudo";
import { FerramentasItem } from "./edicao/Editaveis";

/** Grade de fotos; um toque abre a foto grande, com setas e o teclado. */
export function Galeria({ fotos }: { fotos: ItemSite[] }) {
  const [aberta, setAberta] = useState<number | null>(null);
  const atual = aberta === null ? null : fotos[aberta];

  useEffect(() => {
    if (aberta === null) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberta(null);
      if (e.key === "ArrowRight") setAberta((i) => (i === null ? i : (i + 1) % fotos.length));
      if (e.key === "ArrowLeft") setAberta((i) => (i === null ? i : (i - 1 + fotos.length) % fotos.length));
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberta, fotos.length]);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {fotos.map((f, i) => (
          <li key={f.id} className={`relative overflow-hidden rounded-2xl bg-marinho/5`}>
            <FerramentasItem tipo="foto" id={f.id} dados={f.dados} oculto={f.oculto} primeiro={i === 0} ultimo={i === fotos.length - 1} />
            <button type="button" className="group block w-full" onClick={() => setAberta(i)} aria-label={`Abrir foto${f.dados.legenda ? `: ${f.dados.legenda}` : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/arquivos/${f.dados.imagem}`} alt={f.dados.legenda ?? ""} loading="lazy" className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105" />
              {f.dados.legenda ? (
                <span className="block px-3 py-2 text-left font-corpo text-sm text-marinho">{f.dados.legenda}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {atual ? (
        <div className="fixed inset-0 z-[75] flex flex-col bg-black/90" role="dialog" aria-modal="true" aria-label="Foto ampliada">
          <div className="flex justify-end p-3">
            <button type="button" onClick={() => setAberta(null)} className="grid h-12 w-12 place-items-center rounded-full text-3xl text-white hover:bg-white/10" aria-label="Fechar">
              ×
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/arquivos/${atual.dados.imagem}`} alt={atual.dados.legenda ?? ""} className="max-h-full max-w-full rounded-lg object-contain" />
            {fotos.length > 1 ? (
              <>
                <button type="button" aria-label="Foto anterior" onClick={() => setAberta((i) => ((i ?? 0) - 1 + fotos.length) % fotos.length)} className="absolute left-2 grid h-12 w-12 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/30">
                  ‹
                </button>
                <button type="button" aria-label="Próxima foto" onClick={() => setAberta((i) => ((i ?? 0) + 1) % fotos.length)} className="absolute right-2 grid h-12 w-12 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/30">
                  ›
                </button>
              </>
            ) : null}
          </div>
          <p className="p-4 text-center font-corpo text-white/85">{atual.dados.legenda}&nbsp;</p>
        </div>
      ) : null}
    </>
  );
}
