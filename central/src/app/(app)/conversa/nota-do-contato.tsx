"use client";

import { useState, useTransition } from "react";
import { salvarNotaDoContato } from "../acoes";

/** A sua nota sobre a pessoa: quem é, de onde, o que importa lembrar. Também ajuda o rascunho. */
export function NotaDoContato({ email, nota }: { email: string; nota: string }) {
  const [texto, setTexto] = useState(nota);
  const [editando, setEditando] = useState(false);
  const [pendente, comecar] = useTransition();

  if (!editando) {
    return (
      <p className="mt-2 text-[14px]">
        {texto ? <span className="text-grafite">{texto} </span> : null}
        <button onClick={() => setEditando(true)} className="text-fosco underline hover:text-tinta">
          {texto ? "editar nota" : "Anotar quem é essa pessoa"}
        </button>
      </p>
    );
  }
  return (
    <form
      className="mt-2"
      onSubmit={(e) => {
        e.preventDefault();
        comecar(async () => {
          await salvarNotaDoContato(email, texto);
          setEditando(false);
        });
      }}
    >
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        autoFocus
        placeholder="Ex.: minha orientadora; prefere e-mails curtos; responde à noite."
        className="w-full rounded-lg border border-linha bg-superficie px-3 py-2 text-[15px] outline-none focus:border-destaque"
      />
      <div className="mt-1 flex gap-4 text-[14px]">
        <button disabled={pendente} className="font-medium text-tinta disabled:opacity-50">
          Salvar
        </button>
        <button type="button" onClick={() => setEditando(false)} className="text-fosco hover:text-tinta">
          Cancelar
        </button>
      </div>
    </form>
  );
}
