"use client";

import Link from "next/link";
import { useState } from "react";
import { apagarItem, moverItem } from "@/acoes/roteiro";
import { FormularioDeItem } from "./formulario-item";

type Item = { id: string; dia: string; hora: string; titulo: string; notas: string; lugarId: string | null };

export function ItemDoRoteiro({
  viagemId,
  dias,
  lugares,
  item,
  emoji,
  hrefLugar,
  rota,
}: {
  viagemId: string;
  dias: string[];
  lugares: { id: string; nome: string }[];
  item: Item;
  emoji: string;
  hrefLugar: string | null;
  rota: string | null;
}) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <div className="p-4">
        <FormularioDeItem viagemId={viagemId} dias={dias} lugares={lugares} item={item} aoSalvar={() => setEditando(false)} />
        <div className="mt-3 flex justify-between text-[15px]">
          <button type="button" onClick={() => setEditando(false)} className="text-fosco">Cancelar</button>
          <form action={apagarItem}>
            <input type="hidden" name="viagemId" value={viagemId} />
            <input type="hidden" name="itemId" value={item.id} />
            <button className="text-vermelho">Tirar do roteiro</button>
          </form>
        </div>
      </div>
    );
  }

  const mover = (direcao: "cima" | "baixo", rotulo: string, seta: string) => (
    <form action={moverItem}>
      <input type="hidden" name="viagemId" value={viagemId} />
      <input type="hidden" name="itemId" value={item.id} />
      <input type="hidden" name="direcao" value={direcao} />
      <button aria-label={rotulo} className="h-7 w-7 rounded-full text-fosco">{seta}</button>
    </form>
  );

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="w-12 shrink-0 pt-0.5 text-[14px] font-semibold tabular-nums text-fosco">{item.hora || "—"}</span>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => setEditando(true)} className="block text-left font-medium leading-snug">
          {emoji && <span className="mr-1" aria-hidden>{emoji}</span>}
          {item.titulo}
        </button>
        {item.notas && <p className="text-[14px] text-fosco">{item.notas}</p>}
        {(hrefLugar || rota) && (
          <div className="mt-1 flex gap-3 text-[14px]">
            {hrefLugar && <Link href={hrefLugar} className="text-realce">Ver lugar</Link>}
            {rota && <a href={rota} target="_blank" rel="noreferrer" className="text-realce">Como chegar</a>}
          </div>
        )}
      </div>
      {!item.hora && (
        <div className="flex flex-col">
          {mover("cima", "Subir", "▲")}
          {mover("baixo", "Descer", "▼")}
        </div>
      )}
    </div>
  );
}
