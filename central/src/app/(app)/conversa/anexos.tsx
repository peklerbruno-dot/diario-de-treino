"use client";

import { useState } from "react";
import type { Anexo } from "@/lib/gmail";
import { salvarAnexo } from "../acoes";

const tamanho = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`);

export function Anexos({ id, anexos }: { id: string; anexos: Anexo[] }) {
  const [estado, setEstado] = useState<Record<string, { rodando?: boolean; link?: string; erro?: string }>>({});

  async function salvar(a: Anexo) {
    setEstado((s) => ({ ...s, [a.anexoId]: { rodando: true } }));
    const r = await salvarAnexo(id, a);
    setEstado((s) => ({ ...s, [a.anexoId]: r.ok ? { link: r.link } : { erro: r.erro } }));
  }

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-[13px] font-semibold text-fosco">Anexos</h2>
      <div>
        {anexos.map((a) => {
          const e = estado[a.anexoId] ?? {};
          return (
            <div key={a.anexoId} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{a.nome}</span>
              <span className="shrink-0 text-[13px] text-fosco">{tamanho(a.tamanho)}</span>
              {e.link ? (
                <a href={e.link} target="_blank" rel="noreferrer" className="shrink-0 text-[14px] text-grafite">
                  No Drive ↗
                </a>
              ) : (
                <button onClick={() => salvar(a)} disabled={e.rodando} className="shrink-0 text-[14px] text-fosco hover:text-tinta disabled:opacity-50">
                  {e.rodando ? "Salvando…" : "Salvar no Drive"}
                </button>
              )}
              {e.erro && <span className="text-[13px] text-atencao">{e.erro}</span>}
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-[13px] text-fosco">Nada é salvo sozinho. “Salvar no Drive” guarda o arquivo na pasta Central/&lt;categoria&gt; do Drive desta conta.</p>
    </section>
  );
}
