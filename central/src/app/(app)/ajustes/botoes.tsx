"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { aprenderEstilo, removerConta, removerInstrucao } from "../acoes";

export function RemoverConta({ id, email }: { id: string; email: string }) {
  const [pendente, comecar] = useTransition();
  return (
    <button
      disabled={pendente}
      onClick={() => {
        if (confirm(`Desconectar ${email}? A triagem dessa conta some da Central (nada muda no Gmail).`)) {
          comecar(() => removerConta(id));
        }
      }}
      className="shrink-0 text-sm text-atencao disabled:opacity-50"
    >
      Desconectar
    </button>
  );
}

export function RemoverInstrucao({ id }: { id: string }) {
  const [pendente, comecar] = useTransition();
  return (
    <button disabled={pendente} onClick={() => comecar(() => removerInstrucao(id))} className="shrink-0 text-fosco" aria-label="Remover regra">
      ✕
    </button>
  );
}

export function AprenderEstilo({ id }: { id: string }) {
  const router = useRouter();
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState("");
  return (
    <>
      <button
        type="button"
        disabled={rodando}
        onClick={async () => {
          setRodando(true);
          setErro("");
          const r = await aprenderEstilo(id);
          setRodando(false);
          if (r.ok) router.refresh();
          else setErro(r.erro);
        }}
        className="rounded-xl bg-destaque px-3 py-2 text-sm font-semibold text-destaque-tinta disabled:opacity-60"
      >
        {rodando ? "Lendo seus enviados…" : "Aprender meu estilo"}
      </button>
      {erro && <span className="self-center text-xs text-atencao">{erro}</span>}
    </>
  );
}
