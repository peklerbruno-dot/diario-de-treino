"use client";

import { useActionState, useEffect, useRef } from "react";
import { criarEnquete } from "@/acoes/votacoes";
import { BotaoEnviar } from "./formulario";
import { Aviso } from "./pecas";

export function NovaEnquete({ viagemId, lugares }: { viagemId: string; lugares: { id: string; nome: string; cidade: string }[] }) {
  const [estado, agir] = useActionState(criarEnquete, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.valores?.ok) form.current?.reset();
  }, [estado]);
  return (
    <form ref={form} action={agir} className="space-y-3">
      <input type="hidden" name="viagemId" value={viagemId} />
      <label className="block">
        <span className="rotulo">Pergunta</span>
        <input name="pergunta" required className="campo" defaultValue={estado?.erro ? estado.valores?.pergunta : undefined} placeholder="Onde jantamos hoje?" />
      </label>
      {lugares.length > 0 && (
        <details>
          <summary className="cursor-pointer text-[15px] font-semibold text-realce">Escolher lugares da lista</summary>
          <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
            {lugares.map((l) => (
              <label key={l.id} className="flex items-center gap-2 py-1 text-[15px]">
                <input type="checkbox" name="lugar" value={l.id} className="h-5 w-5 accent-[var(--realce)]" />
                <span>{l.nome}{l.cidade && <span className="text-fosco"> · {l.cidade}</span>}</span>
              </label>
            ))}
          </div>
        </details>
      )}
      <label className="block">
        <span className="rotulo">Outras opções (uma por linha)</span>
        <textarea name="opcoes" rows={3} className="campo" defaultValue={estado?.erro ? estado.valores?.opcoes : undefined} placeholder={"Tacos de rua\nPedir no hotel"} />
      </label>
      {estado?.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      {estado?.valores?.ok && <Aviso tom="ok">Votação aberta — o grupo foi avisado.</Aviso>}
      <BotaoEnviar>Abrir votação</BotaoEnviar>
    </form>
  );
}
