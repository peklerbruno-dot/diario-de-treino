"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Resultado {
  contas: number;
  conversas: number;
  triadas: number;
  naFila: number;
  erros: string[];
  erro?: string;
}

/** Busca o que chegou nas contas e tria o que é novo. */
export function Atualizar() {
  const router = useRouter();
  const [estado, setEstado] = useState<"parado" | "rodando">("parado");
  const [aviso, setAviso] = useState<{ texto: string; ruim: boolean } | null>(null);

  async function rodar() {
    setEstado("rodando");
    setAviso(null);
    try {
      const r = await fetch("/api/sincronizar", { method: "POST" });
      const j = (await r.json()) as Resultado;
      if (!r.ok) throw new Error(j.erro ?? `Erro ${r.status}`);
      const base =
        j.contas === 0
          ? "Nenhuma conta conectada ainda."
          : j.triadas
            ? `${j.triadas} conversa${j.triadas > 1 ? "s" : ""} nova${j.triadas > 1 ? "s" : ""} triada${j.triadas > 1 ? "s" : ""}.`
            : "Nada novo.";
      const fila = j.naFila ? `Ainda há ${j.naFila} na fila: toque em Atualizar de novo.` : "";
      setAviso({ texto: [base, fila, ...j.erros].filter(Boolean).join(" "), ruim: j.erros.length > 0 });
      router.refresh();
    } catch (e) {
      setAviso({ texto: `Não deu para atualizar: ${(e as Error).message}`, ruim: true });
    } finally {
      setEstado("parado");
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={rodar}
        disabled={estado === "rodando"}
        className="rounded-full bg-destaque px-4 py-2 text-sm font-semibold text-destaque-tinta disabled:opacity-60"
      >
        {estado === "rodando" ? "Atualizando…" : "Atualizar"}
      </button>
      {estado === "rodando" && <p className="mt-1 text-xs text-fosco">Lendo as caixas e triando. Pode levar um minuto.</p>}
      {aviso && <p className={`mt-1 max-w-xs text-right text-xs ${aviso.ruim ? "text-atencao" : "text-fosco"}`}>{aviso.texto}</p>}
    </div>
  );
}
