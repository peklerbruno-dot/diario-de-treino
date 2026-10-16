"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { apagarTarefa, concluirTarefa, criarTarefa, marcarResolvida } from "@/app/(app)/acoes";

export interface ItemDeTarefa {
  /** "t:<id>" para tarefa sua, "c:<id>" para a próxima ação de um e-mail. */
  chave: string;
  titulo: string;
  prazo?: { texto: string; vencido: boolean; perto: boolean } | null;
  origem?: { rotulo: string; cor: string; href: string } | null;
  feita: boolean;
}

/**
 * Uma lista de tarefas com caixinha de marcar, no espírito do Things: marcar
 * risca na hora (sem esperar o servidor). A próxima ação de um e-mail se marca
 * como a conversa resolvida.
 */
export function ListaDeTarefas({ itens, vazio }: { itens: ItemDeTarefa[]; vazio?: string }) {
  const [, comecar] = useTransition();
  const [lista, marcar] = useOptimistic(itens, (atual, chave: string) =>
    atual.map((i) => (i.chave === chave ? { ...i, feita: !i.feita } : i)),
  );

  if (!lista.length) return vazio ? <p className="py-3 text-sm text-fosco">{vazio}</p> : null;

  return (
    <ul>
      {lista.map((i) => {
        const [tipo, id] = i.chave.split(":");
        const alternar = () =>
          comecar(async () => {
            marcar(i.chave);
            if (tipo === "t") await concluirTarefa(id, !i.feita);
            else await marcarResolvida(id, !i.feita);
          });
        return (
          <li key={i.chave} className="group flex items-start gap-3 border-b border-linha py-2.5">
            <button
              onClick={alternar}
              aria-label={i.feita ? "Desmarcar" : "Marcar como feita"}
              className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors ${
                i.feita ? "border-destaque bg-destaque text-destaque-tinta" : "border-regua hover:border-destaque"
              }`}
            >
              {i.feita && (
                <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="m2.5 6.2 2.3 2.3 4.7-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-[15px] leading-snug lg:text-sm ${i.feita ? "text-fosco line-through" : ""}`}>{i.titulo}</p>
              {(i.origem || i.prazo) && (
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-mini">
                  {i.origem && (
                    <Link href={i.origem.href} className="font-semibold uppercase tracking-wide hover:underline" style={{ color: i.origem.cor }}>
                      E-mail · {i.origem.rotulo}
                    </Link>
                  )}
                  {i.prazo && (
                    <span className={`numeros font-medium ${i.prazo.vencido || i.prazo.perto ? "text-atencao" : "text-alerta"}`}>
                      {i.prazo.texto}
                    </span>
                  )}
                </p>
              )}
            </div>
            {tipo === "t" && (
              <button
                onClick={() => comecar(() => apagarTarefa(id))}
                className="text-mini text-fosco opacity-0 transition-opacity hover:text-atencao group-hover:opacity-100"
                aria-label="Apagar tarefa"
              >
                apagar
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Uma linha para escrever uma tarefa nova, com data opcional. */
export function NovaTarefa({ diaPadrao }: { diaPadrao?: string }) {
  const [titulo, setTitulo] = useState("");
  const [dia, setDia] = useState(diaPadrao ?? "");
  const [pendente, comecar] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!titulo.trim()) return;
        comecar(async () => {
          await criarTarefa(titulo, dia || null);
          setTitulo("");
        });
      }}
      className="flex items-center gap-2 border-b border-linha py-2"
    >
      <span className="grid h-[18px] w-[18px] shrink-0 place-items-center text-fosco">+</span>
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Nova tarefa"
        className="min-w-0 flex-1 bg-transparent py-1 outline-none placeholder:text-fosco"
      />
      <input
        type="date"
        value={dia}
        onChange={(e) => setDia(e.target.value)}
        className="rounded-md bg-transparent px-1 py-1 text-sm text-grafite outline-none"
        aria-label="Prazo"
      />
      <button disabled={pendente || !titulo.trim()} className="rounded-md bg-destaque px-3 py-1.5 text-sm font-semibold text-destaque-tinta disabled:opacity-40">
        Adicionar
      </button>
    </form>
  );
}
