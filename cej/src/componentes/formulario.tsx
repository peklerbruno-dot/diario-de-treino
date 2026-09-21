"use client";

import { useActionState } from "react";
import type { Resposta } from "@/app/acoes";
import { Aviso } from "./pecas";

/**
 * A casca dos formulários das telas de fora.
 *
 * Cuida do que é igual nos três: mostrar o erro que o servidor devolveu,
 * desabilitar o botão enquanto a resposta não chega, e o botão em si.
 *
 * Os campos ficam por fora, em cada tela, porque só a tela sabe quais são —
 * e porque não há como um componente de servidor entregar uma função a um de
 * cliente: tentar passar os campos como função de renderização é erro em tempo
 * de execução, não de compilação. Por isso cada formulário que precisa devolver
 * o que foi digitado é, ele todo, um componente de cliente.
 */
export function CascaDoFormulario({
  acao,
  botao,
  erro,
  esperando,
  children,
}: {
  acao: (dados: FormData) => void;
  botao: string;
  erro?: string;
  esperando: boolean;
  children: React.ReactNode;
}) {
  return (
    <form action={acao} className="mt-7 space-y-4">
      {children}

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      <button
        type="submit"
        disabled={esperando}
        className="min-h-[46px] w-full rounded-folha bg-heroi px-4 text-[16px] font-semibold text-heroi-tinta disabled:opacity-60"
      >
        {esperando ? "Um instante…" : botao}
      </button>
    </form>
  );
}

/**
 * O formulário simples: campos fixos, nada a devolver. Serve para a tela de
 * definir senha, onde os únicos campos são senhas — e senha não volta.
 */
export function FormularioComErro({
  acao,
  botao,
  children,
}: {
  acao: (anterior: Resposta, dados: FormData) => Promise<Resposta>;
  botao: string;
  children: React.ReactNode;
}) {
  const [estado, agir, esperando] = useActionState(acao, null);
  return (
    <CascaDoFormulario acao={agir} botao={botao} erro={estado?.erro} esperando={esperando}>
      {children}
    </CascaDoFormulario>
  );
}
