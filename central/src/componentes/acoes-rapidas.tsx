"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { adiar, arquivarNoGmail, corrigirCategoria, marcarResolvida } from "@/app/(app)/acoes";
import { MenuAdiar } from "./deslizar";
import { createPortal } from "react-dom";
import { CATEGORIAS, COR_DO_TOM } from "@/lib/categorias";

/**
 * As ações de uma conversa direto na lista, sem abri-la: as principais
 * (resolver, arquivar, abrir no Gmail — e cobrar, quando espera resposta)
 * sempre à vista; mudar de categoria no "⋯".
 */
export function AcoesRapidas({
  id,
  categoria,
  resolvida,
  linkGmail,
  cobrar,
}: {
  id: string;
  categoria: string;
  resolvida: boolean;
  linkGmail: string;
  /** Endereço para rascunhar a cobrança, quando a conversa espera resposta. */
  cobrar?: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [pendente, comecar] = useTransition();
  const [erro, setErro] = useState("");
  const [adiando, setAdiando] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    // Só no computador: no celular o menu é a folha de baixo, que fecha sozinha
    // (e um toque nela contaria como "fora" da linha).
    const fora = (e: MouseEvent) =>
      window.matchMedia("(min-width: 1024px)").matches && caixa.current && !caixa.current.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const fazer = (f: () => Promise<unknown>) =>
    comecar(async () => {
      setErro("");
      const r = (await f()) as { ok?: boolean; erro?: string } | void;
      if (r && r.ok === false) setErro(r.erro ?? "Não deu certo.");
      else {
        setAberto(false);
        router.refresh();
      }
    });

  const item = "block w-full px-3 py-1.5 text-left text-[14px] hover:bg-realce disabled:opacity-40";
  const botao =
    "rounded-full border border-linha bg-fundo px-3 py-1 text-[13px] text-grafite hover:border-regua hover:text-tinta disabled:opacity-40";
  return (
    <div ref={caixa} className="relative flex flex-wrap items-center gap-1.5">
      {/* Os principais, sempre à vista. */}
      {cobrar && (
        <Link href={cobrar} className={botao}>
          Cobrar
        </Link>
      )}
      <button className={botao} disabled={pendente} onClick={() => fazer(() => marcarResolvida(id, !resolvida))}>
        {resolvida ? "Reabrir" : "Resolver"}
      </button>
      <button className={botao} disabled={pendente} onClick={() => fazer(() => arquivarNoGmail(id))}>
        Arquivar
      </button>
      <a href={linkGmail} target="_blank" rel="noreferrer" className={botao}>
        Abrir no Gmail
      </a>
      {/* O resto (mudar de categoria) no "⋯". */}
      <button
        onClick={() => setAberto((a) => !a)}
        aria-label="Mais ações"
        title="Mover para outra categoria"
        className={`grid h-7 w-7 place-items-center rounded-full border border-linha bg-fundo text-fosco hover:border-regua hover:text-tinta ${aberto ? "border-regua text-tinta" : ""}`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <circle cx="4.5" cy="10" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="15.5" cy="10" r="1.5" />
        </svg>
      </button>
      {pendente && <span className="text-[13px] text-fosco">…</span>}
      {erro && <span className="text-[13px] text-atencao">{erro}</span>}
      {/* No celular, o "⋯" sobe de baixo, por cima de tudo (a linha corta o que sai dela). */}
      {aberto &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end bg-black/30 lg:hidden" onClick={() => setAberto(false)}>
            <div className="seguro-embaixo w-full rounded-t-2xl bg-superficie px-5 pb-6 pt-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <button
                className="w-full py-3 text-left text-[16px]"
                onClick={() => {
                  setAberto(false);
                  setAdiando(true);
                }}
              >
                Adiar…
              </button>
              <p className="border-t border-linha pb-1 pt-3 text-[13px] font-semibold text-fosco">Mover para</p>
              <div className="divide-y divide-linha">
                {CATEGORIAS.filter((c) => c.id !== categoria).map((c) => (
                  <button
                    key={c.id}
                    disabled={pendente}
                    onClick={() => fazer(() => corrigirCategoria(id, c.id))}
                    className="flex w-full items-center gap-3 py-3 text-left text-[16px] disabled:opacity-40"
                  >
                    <span className={`h-2 w-2 rounded-full ${COR_DO_TOM[c.tom]}`} />
                    {c.nome}
                  </button>
                ))}
              </div>
              <button onClick={() => setAberto(false)} className="mt-2 w-full py-2 text-[15px] text-fosco">
                Cancelar
              </button>
            </div>
          </div>,
          document.body,
        )}
      {aberto && (
        <div className="absolute left-0 top-9 z-30 hidden w-52 rounded-lg border border-linha bg-superficie py-1 shadow-lg lg:block">
          <button
            className={item}
            onClick={() => {
              setAberto(false);
              setAdiando(true);
            }}
          >
            Adiar…
          </button>
          <p className="mt-1 border-t border-linha px-3 pb-0.5 pt-2 text-[12px] text-fosco">Mover para</p>
          {CATEGORIAS.filter((c) => c.id !== categoria).map((c) => (
            <button key={c.id} className={item} disabled={pendente} onClick={() => fazer(() => corrigirCategoria(id, c.id))}>
              {c.nome}
            </button>
          ))}
        </div>
      )}
      {adiando && (
        <MenuAdiar
          titulo="Esta conversa some das listas até o dia escolhido, ou até chegar mensagem nova."
          onFechar={() => setAdiando(false)}
          onEscolher={(dia) => {
            setAdiando(false);
            fazer(() => adiar(`c:${id}`, dia));
          }}
        />
      )}
    </div>
  );
}
