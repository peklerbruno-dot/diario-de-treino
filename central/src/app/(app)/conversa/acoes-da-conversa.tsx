"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CATEGORIAS } from "@/lib/categorias";
import { arquivarNoGmail, corrigirCategoria, marcarResolvida, porPrazoNaAgenda } from "../acoes";

const botao = "rounded-md border border-linha bg-superficie px-3 py-1.5 text-sm font-medium hover:bg-realce disabled:opacity-50";

export function Acoes(p: { id: string; categoria: string; resolvida: boolean; temPrazo: boolean; linkGmail: string }) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [aviso, setAviso] = useState<{ texto: string; link?: string } | null>(null);

  const fazer = (f: () => Promise<unknown>) => comecar(async () => void (await f()));

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2">
        <select
          defaultValue={p.categoria}
          disabled={pendente}
          onChange={(e) => fazer(() => corrigirCategoria(p.id, e.target.value))}
          className="rounded-md border border-linha bg-superficie px-2 py-1.5 text-sm"
          aria-label="Categoria"
        >
          {CATEGORIAS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <button className={botao} disabled={pendente} onClick={() => fazer(() => marcarResolvida(p.id, !p.resolvida))}>
          {p.resolvida ? "↺ Reabrir" : "✓ Resolvida"}
        </button>
        <button
          className={botao}
          disabled={pendente}
          onClick={() =>
            fazer(async () => {
              const r = await arquivarNoGmail(p.id);
              if (!r.ok) setAviso({ texto: r.erro });
              else router.refresh();
            })
          }
        >
          Arquivar no Gmail
        </button>
        {p.temPrazo && (
          <button
            className={botao}
            disabled={pendente}
            onClick={() =>
              fazer(async () => {
                const r = await porPrazoNaAgenda(p.id);
                setAviso(r.ok ? { texto: "Prazo posto na agenda.", link: r.link } : { texto: r.erro });
              })
            }
          >
            Pôr prazo na agenda
          </button>
        )}
        <a href={p.linkGmail} target="_blank" rel="noreferrer" className={botao}>
          Abrir no Gmail ↗
        </a>
      </div>
      {aviso && (
        <p className="mt-2 text-sm text-grafite">
          {aviso.texto}{" "}
          {aviso.link && (
            <a href={aviso.link} target="_blank" rel="noreferrer" className="text-destaque">
              Ver
            </a>
          )}
        </p>
      )}
    </div>
  );
}
