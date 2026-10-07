"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CATEGORIAS } from "@/lib/categorias";
import { arquivarNoGmail, corrigirCategoria, marcarResolvida, porPrazoNaAgenda } from "../../acoes";

const botao = "rounded-xl bg-cartao px-3 py-2 text-sm font-semibold shadow-cartao disabled:opacity-50";

export function Acoes(p: { id: string; categoria: string; resolvida: boolean; temPrazo: boolean; linkGmail: string }) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [aviso, setAviso] = useState<{ texto: string; link?: string } | null>(null);

  const fazer = (f: () => Promise<unknown>) => comecar(async () => void (await f()));

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <select
          defaultValue={p.categoria}
          disabled={pendente}
          onChange={(e) => fazer(() => corrigirCategoria(p.id, e.target.value))}
          className="rounded-xl bg-cartao px-3 py-2 text-sm shadow-cartao"
          aria-label="Categoria"
        >
          {CATEGORIAS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icone} {c.nome}
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
              else router.push("/caixa");
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
            📅 Pôr prazo na agenda
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
