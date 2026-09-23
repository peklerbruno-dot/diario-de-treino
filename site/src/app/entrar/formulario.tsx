"use client";

import { useActionState } from "react";
import { entrarNoSite, type EstadoEntrada } from "./acoes";

const entrada =
  "w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-corpo text-[17px] outline-none focus:border-azul focus:ring-4 focus:ring-azul/20";

export function FormularioEntrada() {
  const [estado, acao, pendente] = useActionState<EstadoEntrada, FormData>(entrarNoSite, {});
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label htmlFor="nome" className="mb-1.5 block font-titulo text-sm font-bold text-marinho">
          Seu nome
        </label>
        <input id="nome" name="nome" required autoComplete="name" defaultValue={estado.nome} placeholder="Como a equipe te chama" className={entrada} />
      </div>
      <div>
        <label htmlFor="codigo" className="mb-1.5 block font-titulo text-sm font-bold text-marinho">
          Código de edição
        </label>
        <input id="codigo" name="codigo" type="password" required autoComplete="current-password" placeholder="Peça para a coordenação" className={entrada} />
      </div>
      {estado.erro ? <p className="rounded-xl bg-red-50 px-4 py-3 font-corpo text-sm font-bold text-red-700">{estado.erro}</p> : null}
      <button type="submit" disabled={pendente} className="w-full rounded-xl bg-marinho px-5 py-3.5 font-titulo text-base font-black text-white hover:bg-azul disabled:opacity-60">
        {pendente ? "Entrando…" : "Entrar e editar o site"}
      </button>
    </form>
  );
}
