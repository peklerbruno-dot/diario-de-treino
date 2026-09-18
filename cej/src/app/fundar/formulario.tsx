"use client";

import { useActionState } from "react";
import { acaoDeFundar } from "../acoes";
import { CascaDoFormulario } from "@/componentes/formulario";
import { Campo, Texto } from "@/componentes/pecas";

export function FormularioDeFundacao() {
  const [estado, agir, esperando] = useActionState(acaoDeFundar, null);
  const v = estado?.valores ?? {};

  return (
    <CascaDoFormulario
      acao={agir}
      botao="Criar a conta e entrar"
      erro={estado?.erro}
      esperando={esperando}
    >
      <Campo rotulo="Nome">
        <Texto nome="nome" valor={v.nome} obrigatorio autoFoco autoComplete="name" />
      </Campo>
      <Campo rotulo="E-mail">
        <Texto nome="email" tipo="email" valor={v.email} obrigatorio autoComplete="username" />
      </Campo>
      <Campo rotulo="Senha" dica="Pelo menos 10 letras ou números.">
        <Texto nome="senha" tipo="password" obrigatorio autoComplete="new-password" />
      </Campo>
      <Campo
        rotulo="Código de fundação"
        dica="É a variável CODIGO_DE_FUNDACAO que você cadastrou na Vercel. Serve uma vez só."
      >
        <Texto nome="codigo" tipo="password" obrigatorio />
      </Campo>
    </CascaDoFormulario>
  );
}
