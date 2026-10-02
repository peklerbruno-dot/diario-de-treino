"use client";

import { useActionState } from "react";
import { acaoDeEntrar } from "../acoes";

export function FormularioDeEntrada() {
  const [estado, agir, esperando] = useActionState(acaoDeEntrar, null);

  return (
    <form action={agir} className="mt-8">
      <label htmlFor="codigo" className="block text-[15px] text-grafite">
        Código de acesso
      </label>
      <input
        id="codigo"
        name="codigo"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        className="mt-2 w-full rounded-folha border border-regua bg-cartao px-4 py-3 outline-none focus:border-folha"
      />

      {estado?.erro && (
        <p role="alert" className="mt-3 text-[15px] text-pulou">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={esperando}
        className="mt-5 w-full rounded-folha bg-folha px-4 py-3 text-[17px] font-medium text-sobre-cor disabled:opacity-60"
      >
        {esperando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
