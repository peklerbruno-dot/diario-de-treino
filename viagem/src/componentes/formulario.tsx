"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ComValores } from "@/lib/formulario";
import { Aviso } from "./pecas";

export function BotaoEnviar({ children, className = "botao w-full", espera = "Um instante…" }: { children: React.ReactNode; className?: string; espera?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? espera : children}
    </button>
  );
}

/**
 * Um formulário que mostra o erro devolvido pelo servidor e, com `campos`,
 * renasce preenchido com o que foi digitado (ver `src/lib/formulario.ts`).
 */
export function Formulario({
  acao,
  botao,
  children,
  className = "space-y-4",
}: {
  acao: (anterior: ComValores, dados: FormData) => Promise<ComValores>;
  botao: string;
  children: (estado: ComValores) => React.ReactNode;
  className?: string;
}) {
  const [estado, agir] = useActionState(acao, null);
  return (
    <form action={agir} className={className}>
      {children(estado)}
      {estado?.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      <BotaoEnviar>{botao}</BotaoEnviar>
    </form>
  );
}
