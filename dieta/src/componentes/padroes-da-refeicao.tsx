"use client";

import { useState, useTransition } from "react";
import { apagarPadrao, salvarPadrao } from "@/app/acoes";
import { campo } from "./pecas";

/**
 * As suas refeições padrão de uma refeição do plano — "Ovos mexidos com pão
 * integral", "Marmita de frango" —, que aparecem a um toque na ficha. Também
 * dá para criar uma direto na ficha, marcando "salvar como refeição padrão".
 */
export function PadroesDaRefeicao({ refeicao, lista }: { refeicao: string; lista: { id: string; texto: string }[] }) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [, iniciar] = useTransition();

  const adicionar = () => {
    const t = texto.trim();
    if (!t) return;
    setTexto("");
    iniciar(() => salvarPadrao(refeicao, t));
  };

  return (
    <div className="mt-3 rounded-folha bg-papel px-3 py-2.5">
      <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
        <span className="text-[14.5px] font-medium">⭐ Minhas refeições padrão {lista.length > 0 && <span className="text-fosco">({lista.length})</span>}</span>
        <span className="text-[13px] text-fosco">{aberto ? "▴" : "▾"}</span>
      </button>
      {aberto && (
        <div className="mt-2">
          {lista.length === 0 && <p className="text-[14px] text-fosco">O que você costuma comer nesta refeição, para marcar com um toque.</p>}
          <ul className="divide-y divide-linha">
            {lista.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-1.5 text-[15px]">
                <span>{p.texto}</span>
                <button type="button" aria-label={`Apagar ${p.texto}`} className="h-7 w-7 shrink-0 rounded-full text-fosco" onClick={() => iniciar(() => apagarPadrao(p.id))}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              adicionar();
            }}
          >
            <input
              className={`${campo} !py-2`}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ex.: ovos mexidos com pão integral"
              aria-label={`Nova refeição padrão de ${refeicao}`}
            />
            <button type="submit" className="shrink-0 rounded-folha bg-folha px-3 text-[15px] font-medium text-sobre-cor disabled:opacity-50" disabled={!texto.trim()}>
              Adicionar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
