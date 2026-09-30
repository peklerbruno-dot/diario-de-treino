"use client";

import { criarConta } from "@/app/acoes-publicas";
import { Formulario } from "@/componentes/formulario";
import { CamposDeConta } from "@/componentes/campos-de-conta";

export function FormularioDeConta() {
  return (
    <Formulario acao={criarConta} botao="Criar conta">
      {(e) => (
        <>
          <label className="block">
            <span className="rotulo">Código de criação</span>
            <input name="codigo" required className="campo" autoCapitalize="none" placeholder="O que está no CODIGO_DE_FUNDACAO" />
          </label>
          <CamposDeConta estado={e} />
        </>
      )}
    </Formulario>
  );
}
