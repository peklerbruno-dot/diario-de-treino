"use client";

import { entrar } from "@/app/acoes-publicas";
import { Formulario } from "@/componentes/formulario";
import { comoVeio } from "@/lib/formulario";

export function FormularioDeEntrada({ volta }: { volta: string }) {
  return (
    <Formulario acao={entrar} botao="Entrar">
      {(e) => (
        <>
          <input type="hidden" name="volta" value={volta} />
          <label className="block">
            <span className="rotulo">E-mail</span>
            <input name="email" type="email" autoComplete="email" required className="campo" defaultValue={comoVeio(e, "email")} />
          </label>
          <label className="block">
            <span className="rotulo">Senha</span>
            <input name="senha" type="password" autoComplete="current-password" required className="campo" />
          </label>
        </>
      )}
    </Formulario>
  );
}
