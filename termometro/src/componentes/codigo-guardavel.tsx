"use client";

import { useState } from "react";

/**
 * O código de acesso recém-gerado, mostrado uma vez só.
 *
 * O banco guarda apenas a impressão dele: depois que esta tela fecha, nem o
 * app sabe mais qual é. Por isso o recado é de guardar já — e o botão de
 * copiar está ali para o código ir direto para as Notas ou para o gerenciador
 * de senhas do iPhone.
 */
export function CodigoGuardavel({ codigo }: { codigo: string }) {
  const [copiou, setCopiou] = useState(false);
  return (
    <div className="rounded-folha bg-cartao p-4 shadow-cartao">
      <p className="text-[14px] text-grafite">Seu código de acesso</p>
      <p
        data-codigo
        className="tabular mt-1 select-all break-all font-titulo text-[24px] font-semibold tracking-tight"
      >
        {codigo}
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-atencao">
        Guarde agora: ele só aparece esta vez. Se perder, dá para gerar outro em Ajustes.
      </p>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(codigo);
            setCopiou(true);
          } catch {
            setCopiou(false);
          }
        }}
        className="mt-3 min-h-[44px] rounded-folha bg-papel px-4 text-[15px] shadow-baixa"
      >
        {copiou ? "Copiado" : "Copiar o código"}
      </button>
    </div>
  );
}
