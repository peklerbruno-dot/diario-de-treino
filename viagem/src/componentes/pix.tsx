"use client";

import { useState } from "react";

/** O bloco "pague por Pix": chave, código copia-e-cola e o valor, com botões de copiar. */
export function BlocoPix({ nome, chave, codigo, valor }: { nome: string; chave: string; codigo: string | null; valor: string }) {
  const [copiado, setCopiado] = useState("");
  const copiar = async (o: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(o);
      setTimeout(() => setCopiado(""), 2000);
    } catch {
      /* sem permissão de área de transferência */
    }
  };
  return (
    <div className="space-y-2 rounded-folha bg-verde-fraco p-3">
      <p className="text-[15px]">
        <strong>Pix de {nome}</strong>
        {valor && <> · {valor}</>}
      </p>
      {codigo && (
        <button type="button" onClick={() => copiar("codigo", codigo)} className="botao w-full">
          {copiado === "codigo" ? "Copiado! Cole no app do banco" : "Copiar Pix copia-e-cola"}
        </button>
      )}
      <button type="button" onClick={() => copiar("chave", chave)} className="botao-leve w-full text-[15px]">
        {copiado === "chave" ? "Chave copiada!" : `Copiar só a chave (${chave})`}
      </button>
    </div>
  );
}
