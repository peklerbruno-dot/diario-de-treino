"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { apagarTarefa, concluirTarefa, criarTarefa, marcarResolvida } from "@/app/(app)/acoes";
import { Ponto, Prazo } from "./pecas";

export interface ItemDeTarefa {
  /** "t:<id>" para tarefa sua, "c:<id>" para a próxima ação de um e-mail. */
  chave: string;
  titulo: string;
  prazo?: { texto: string; vencido: boolean; perto: boolean } | null;
  /** De onde veio, quando veio de um e-mail: quem escreveu, a cor da conta. */
  origem?: { quem: string; conta: string; cor: string; href: string } | null;
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
          <li key={i.chave} className="group -mx-3 flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-realce">
            <button
              onClick={alternar}
              aria-label={i.feita ? "Desmarcar" : "Marcar como feita"}
              className={`mt-[3px] grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full border transition-colors ${
                i.feita ? "border-fosco bg-fosco text-fundo" : "border-regua hover:border-grafite"
              }`}
            >
              {i.feita && (
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <path d="m2.5 6.2 2.3 2.3 4.7-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-[15px] leading-snug ${i.feita ? "text-fosco line-through" : ""}`}>{i.titulo}</p>
              {(i.origem || i.prazo) && !i.feita && (
                <p className="mt-0.5 flex items-center gap-2 text-[13px] text-fosco">
                  {i.origem && (
                    <Link href={i.origem.href} className="flex min-w-0 items-center gap-2 hover:text-tinta">
                      <Ponto cor={i.origem.cor} titulo={i.origem.conta} />
                      <span className="truncate">{i.origem.quem}</span>
                    </Link>
                  )}
                  {i.origem && i.prazo && <span>·</span>}
                  {i.prazo && <Prazo {...i.prazo} />}
                </p>
              )}
            </div>
            {tipo === "t" && (
              <button
                onClick={() => comecar(() => apagarTarefa(id))}
                className="text-[13px] text-fosco opacity-0 transition-opacity hover:text-atencao group-hover:opacity-100"
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
      className="-mx-3 flex items-center gap-3 px-3 py-2"
    >
      <span className="grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full border border-dashed border-regua text-[12px] leading-none text-fosco">+</span>
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Adicionar tarefa"
        className="min-w-0 flex-1 bg-transparent py-0.5 text-[15px] outline-none placeholder:text-fosco"
      />
      {titulo.trim() && (
        <>
          <input
            type="date"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className="bg-transparent text-[13px] text-fosco outline-none"
            aria-label="Prazo"
          />
          <button disabled={pendente} className="text-[13px] font-medium text-destaque disabled:opacity-40">
            Salvar
          </button>
        </>
      )}
    </form>
  );
}
