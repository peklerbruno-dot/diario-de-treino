"use client";

import { useState, useTransition } from "react";
import { porEventoNaAgenda } from "../acoes";

/** O compromisso que veio no e-mail, com um botão para pô-lo na agenda. */
export function SugestaoDeEvento({ id, texto, jaNaAgenda }: { id: string; texto: string; jaNaAgenda: boolean }) {
  const [pendente, comecar] = useTransition();
  const [feito, setFeito] = useState<{ link?: string; erro?: string } | null>(jaNaAgenda ? {} : null);
  return (
    <p className="mt-4 text-[15px]">
      <span className="text-grafite">{texto}</span>{" "}
      {feito && !feito.erro ? (
        <span className="text-fosco">
          · na agenda
          {feito.link && (
            <>
              {" "}
              <a href={feito.link} target="_blank" rel="noreferrer" className="underline">
                ver
              </a>
            </>
          )}
        </span>
      ) : (
        <button
          disabled={pendente}
          onClick={() =>
            comecar(async () => {
              const r = await porEventoNaAgenda(id);
              setFeito(r.ok ? { link: r.link } : { erro: r.erro });
            })
          }
          className="text-fosco underline hover:text-tinta disabled:opacity-50"
        >
          {pendente ? "pondo…" : "Pôr na agenda"}
        </button>
      )}
      {feito?.erro && <span className="ml-2 text-[14px] text-atencao">{feito.erro}</span>}
    </p>
  );
}
