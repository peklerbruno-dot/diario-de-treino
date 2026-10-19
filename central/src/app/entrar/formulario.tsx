"use client";

import { useActionState } from "react";
import { entrarComCodigo } from "./acao";

export function Formulario() {
  const [estado, enviar, pendente] = useActionState(entrarComCodigo, { motivo: "" });
  return (
    <form action={enviar} className="mt-8 space-y-3">
      <input
        name="codigo"
        type="password"
        autoComplete="current-password"
        placeholder="Código de acesso"
        autoFocus
        className="cartao w-full px-4 py-3 outline-none"
      />
      {estado.motivo && <p className="text-sm text-atencao">{estado.motivo}</p>}
      <button
        disabled={pendente}
        className="w-full rounded-full bg-destaque px-4 py-3 font-semibold text-destaque-tinta disabled:opacity-60"
      >
        {pendente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
