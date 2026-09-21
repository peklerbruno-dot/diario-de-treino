"use client";

import { useActionState } from "react";
import { acaoDeEntrar } from "../acoes";
import { CascaDoFormulario } from "@/componentes/formulario";
import { Campo, Texto } from "@/componentes/pecas";

export function FormularioDeEntrada() {
  const [estado, agir, esperando] = useActionState(acaoDeEntrar, null);

  return (
    <CascaDoFormulario acao={agir} botao="Entrar" erro={estado?.erro} esperando={esperando}>
      <Campo rotulo="E-mail">
        {/* O e-mail volta preenchido depois de uma recusa; a senha, não. */}
        <Texto
          nome="email"
          tipo="email"
          valor={estado?.valores?.email}
          autoComplete="username"
          obrigatorio
          autoFoco
        />
      </Campo>
      <Campo rotulo="Senha">
        <Texto nome="senha" tipo="password" autoComplete="current-password" obrigatorio />
      </Campo>
    </CascaDoFormulario>
  );
}
