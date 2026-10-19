"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { adiar, arquivarNoGmail, concluirTarefa, criarTarefa, marcarResolvida } from "@/app/(app)/acoes";
import { entenderAnotacao } from "@/lib/anotar";
import { Deslizavel, MenuAdiar } from "./deslizar";
import { BotaoDeVoz } from "./voz";
import { Ponto, Prazo } from "./pecas";

export interface ItemDeTarefa {
  /** "t:<id>" para tarefa sua, "c:<id>" para a próxima ação de um e-mail. */
  chave: string;
  titulo: string;
  prazo?: { texto: string; vencido: boolean; perto: boolean } | null;
  /** De onde veio, quando veio de um e-mail: quem escreveu, sobre o quê, a cor da conta. */
  origem?: { quem: string; assunto: string; conta: string; cor: string } | null;
  /** Onde abre o dossiê do item. */
  href: string;
  /** Uma tarefa sua que tem nota (o porquê). */
  comNota?: boolean;
  feita: boolean;
}

/**
 * Uma lista de tarefas com caixinha de marcar, no espírito do Things: marcar
 * risca na hora (sem esperar o servidor). A próxima ação de um e-mail se marca
 * como a conversa resolvida. No celular: deslizar → conclui, ← arquiva o
 * e-mail (ou adia a tarefa), segurar adia.
 */
export function ListaDeTarefas({ itens, vazio, aberta }: { itens: ItemDeTarefa[]; vazio?: string; aberta?: string }) {
  const router = useRouter();
  const [, comecar] = useTransition();
  const [adiando, setAdiando] = useState<ItemDeTarefa | null>(null);
  const [lista, mudar] = useOptimistic(itens, (atual, m: { chave: string; sumir?: boolean }) =>
    m.sumir ? atual.filter((i) => i.chave !== m.chave) : atual.map((i) => (i.chave === m.chave ? { ...i, feita: !i.feita } : i)),
  );

  if (!lista.length) return vazio ? <p className="py-3 text-sm text-fosco">{vazio}</p> : null;

  const fazer = (chave: string, sumir: boolean, f: () => Promise<unknown>) =>
    comecar(async () => {
      mudar({ chave, sumir });
      await f();
      router.refresh();
    });

  return (
    <>
      <ul>
        {lista.map((i) => {
          const [tipo, id] = i.chave.split(":");
          const concluir = (sumir: boolean) =>
            fazer(i.chave, sumir, () => (tipo === "t" ? concluirTarefa(id, !i.feita) : marcarResolvida(id, !i.feita)));
          return (
            <li key={i.chave}>
              <Deslizavel
                className="-mx-3"
                direita={i.feita ? undefined : { rotulo: "Concluir", fundo: "bg-ok", acao: () => concluir(true) }}
                esquerda={
                  i.feita
                    ? undefined
                    : tipo === "c"
                      ? { rotulo: "Arquivar", fundo: "bg-azul", acao: () => fazer(i.chave, true, () => arquivarNoGmail(id)) }
                      : { rotulo: "Adiar", fundo: "bg-alerta", acao: () => setAdiando(i) }
                }
                segurar={i.feita ? undefined : () => setAdiando(i)}
              >
                <div className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 ${aberta === i.chave ? "bg-realce" : "hover:bg-realce"}`}>
                  <button
                    onClick={() => concluir(false)}
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
                  {/* A linha inteira abre o dossiê: de onde veio, por quê, o que houve. */}
                  <Link href={i.href} scroll={false} className="min-w-0 flex-1 select-none lg:select-auto">
                    <p className={`text-[15px] leading-snug ${i.feita ? "text-fosco line-through" : ""}`}>{i.titulo}</p>
                    {(i.origem || i.prazo || i.comNota) && !i.feita && (
                      <p className="mt-0.5 flex items-center gap-2 text-[13px] text-fosco">
                        {i.origem && (
                          <span className="flex min-w-0 items-center gap-2">
                            <Ponto cor={i.origem.cor} titulo={i.origem.conta} />
                            <span className="truncate">
                              {i.origem.quem} · {i.origem.assunto}
                            </span>
                          </span>
                        )}
                        {!i.origem && i.comNota && <span>com nota</span>}
                        {(i.origem || i.comNota) && i.prazo && <span>·</span>}
                        {i.prazo && <Prazo {...i.prazo} />}
                      </p>
                    )}
                  </Link>
                  {/* No computador, o adiar fica à mão sem gesto. */}
                  {!i.feita && (
                    <button
                      onClick={() => setAdiando(i)}
                      className="hidden shrink-0 text-[13px] text-fosco opacity-0 transition-opacity hover:text-tinta group-hover:opacity-100 lg:block"
                    >
                      adiar
                    </button>
                  )}
                </div>
              </Deslizavel>
            </li>
          );
        })}
      </ul>
      {adiando && (
        <MenuAdiar
          titulo={adiando.titulo}
          onFechar={() => setAdiando(null)}
          onEscolher={(dia) => {
            const chave = adiando.chave;
            setAdiando(null);
            fazer(chave, chave.startsWith("c:"), () => adiar(chave, dia));
          }}
        />
      )}
    </>
  );
}

/**
 * O "Anotar": escreva (ou dite) como no WhatsApp — "mandar orçamento pro CEJ
 * até quinta" — e a data sai do próprio texto. O calendário fica para quando
 * você preferir escolher.
 */
export function NovaTarefa() {
  const [titulo, setTitulo] = useState("");
  const [dia, setDia] = useState("");
  const [pendente, comecar] = useTransition();
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const entendido = titulo.trim() && !dia ? entenderAnotacao(titulo, hoje) : null;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!titulo.trim()) return;
        comecar(async () => {
          await criarTarefa(titulo, dia || null);
          setTitulo("");
          setDia("");
        });
      }}
      className="-mx-3 px-3 py-2"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full border border-dashed border-regua text-[12px] leading-none text-fosco">+</span>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Anotar (ex.: mandar orçamento pro CEJ até quinta)"
          className="min-w-0 flex-1 bg-transparent py-0.5 text-[15px] outline-none placeholder:text-fosco"
          enterKeyHint="done"
        />
        <BotaoDeVoz aoFalar={(t) => setTitulo((atual) => (atual ? `${atual} ${t}` : t))} />
      </div>
      {titulo.trim() && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[29px] text-[13px] text-fosco">
          {entendido?.prazo && (
            <span>
              até{" "}
              {new Date(`${entendido.prazo}T12:00:00Z`).toLocaleDateString("pt-BR", {
                timeZone: "UTC",
                weekday: "short",
                day: "numeric",
                month: "numeric",
              })}
            </span>
          )}
          <input
            type="date"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className="bg-transparent text-[13px] text-fosco outline-none"
            aria-label="Escolher prazo"
          />
          <button disabled={pendente} className="ml-auto text-[14px] font-medium text-destaque disabled:opacity-40">
            Salvar
          </button>
        </div>
      )}
    </form>
  );
}
