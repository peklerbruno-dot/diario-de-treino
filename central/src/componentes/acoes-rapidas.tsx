"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { arquivarNoGmail, corrigirCategoria, marcarResolvida } from "@/app/(app)/acoes";
import { CATEGORIAS } from "@/lib/categorias";

/**
 * As ações de uma conversa direto na lista, sem abri-la. No computador, um
 * botão "⋯" que aparece ao passar o mouse; no celular, sempre visível.
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
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => caixa.current && !caixa.current.contains(e.target as Node) && setAberto(false);
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
  return (
    <div ref={caixa} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          setAberto((a) => !a);
        }}
        aria-label="Ações"
        className={`grid h-7 w-7 place-items-center rounded-md text-fosco hover:bg-linha hover:text-tinta lg:opacity-0 lg:group-hover:opacity-100 ${aberto ? "bg-linha text-tinta lg:opacity-100" : ""}`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <circle cx="4.5" cy="10" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="15.5" cy="10" r="1.5" />
        </svg>
      </button>
      {aberto && (
        <div className="absolute right-0 top-8 z-30 w-56 rounded-lg border border-linha bg-superficie py-1 shadow-lg">
          {cobrar && (
            <Link href={cobrar} className={item} onClick={() => setAberto(false)}>
              Rascunhar cobrança
            </Link>
          )}
          <button className={item} disabled={pendente} onClick={() => fazer(() => marcarResolvida(id, !resolvida))}>
            {resolvida ? "Reabrir" : "Marcar como resolvida"}
          </button>
          <button className={item} disabled={pendente} onClick={() => fazer(() => arquivarNoGmail(id))}>
            Arquivar
          </button>
          <a href={linkGmail} target="_blank" rel="noreferrer" className={item}>
            Abrir no Gmail
          </a>
          <div className="my-1 border-t border-linha" />
          <p className="px-3 pb-0.5 pt-1 text-[12px] text-fosco">Mover para</p>
          {CATEGORIAS.filter((c) => c.id !== categoria).map((c) => (
            <button key={c.id} className={item} disabled={pendente} onClick={() => fazer(() => corrigirCategoria(id, c.id))}>
              {c.nome}
            </button>
          ))}
          {erro && <p className="px-3 py-1.5 text-[13px] text-atencao">{erro}</p>}
        </div>
      )}
    </div>
  );
}
