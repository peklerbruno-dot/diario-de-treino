"use client";

import { useActionState } from "react";
import { trocarMinhaSenha, type RespostaDaSenha } from "./acoes";
import { Aviso, Botao, Campo, Texto } from "@/componentes/pecas";

export function TrocarSenha() {
  const [estado, agir, esperando] = useActionState(trocarMinhaSenha, null as RespostaDaSenha);

  return (
    <form action={agir} className="grid gap-4 p-4 sm:grid-cols-3">
      <Campo rotulo="Senha atual">
        <Texto nome="atual" tipo="password" obrigatorio autoComplete="current-password" />
      </Campo>
      <Campo rotulo="Nova senha" dica="Pelo menos 10 letras ou números.">
        <Texto nome="nova" tipo="password" obrigatorio autoComplete="new-password" />
      </Campo>
      <Campo rotulo="Repita a nova">
        <Texto nome="repetida" tipo="password" obrigatorio autoComplete="new-password" />
      </Campo>

      {estado?.erro && (
        <div className="sm:col-span-3">
          <Aviso tom="erro">{estado.erro}</Aviso>
        </div>
      )}
      {estado?.pronto && (
        <div className="sm:col-span-3">
          <Aviso tom="bom">Senha trocada. Ela já vale para a próxima vez que você entrar.</Aviso>
        </div>
      )}

      <div className="sm:col-span-3">
        <Botao disabled={esperando}>{esperando ? "Trocando…" : "Trocar a senha"}</Botao>
      </div>
    </form>
  );
}
