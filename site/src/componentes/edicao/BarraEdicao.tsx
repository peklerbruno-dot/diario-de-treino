"use client";

import Link from "next/link";
import { useEdicao } from "./Provedor";

/** A faixa amarela que lembra a equipe de que o site está em modo de edição. */
export function BarraEdicao() {
  const { equipe, comoVisitante, alternarVisitante } = useEdicao();
  if (!equipe) return null;
  return (
    <div className="relative z-[60] bg-edicao font-corpo text-marinho shadow">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 text-sm">
        <span className="font-bold">
          {comoVisitante ? "👀 Você está vendo o site como um visitante" : `✏️ Olá, ${equipe.nome}! Clique em “Editar” em qualquer parte do site.`}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={alternarVisitante}
            className="rounded-lg border-2 border-marinho px-3 py-1 font-bold hover:bg-marinho hover:text-edicao"
          >
            {comoVisitante ? "Voltar a editar" : "Ver como visitante"}
          </button>
          <Link href="/painel" className="rounded-lg px-3 py-1 font-bold underline-offset-2 hover:underline">
            Painel e ajuda
          </Link>
          <form action="/sair" method="post">
            <button type="submit" className="rounded-lg px-3 py-1 font-bold underline-offset-2 hover:underline">
              Sair
            </button>
          </form>
        </span>
      </div>
    </div>
  );
}
