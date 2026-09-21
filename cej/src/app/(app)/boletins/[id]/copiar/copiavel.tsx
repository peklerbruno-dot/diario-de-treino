"use client";

import { useState } from "react";

/**
 * Uma caixa de texto com botão de copiar.
 *
 * O botão usa a área de transferência do navegador e, se ela não estiver
 * disponível — acontece fora de HTTPS e em alguns navegadores antigos —,
 * seleciona o texto todo, que é o que permite um Ctrl+C à mão. Um botão de
 * copiar que não copia e não avisa é pior do que não ter botão.
 */
export function Copiavel({
  rotulo,
  valor,
  linhas = 4,
  fonteMono = false,
}: {
  rotulo: string;
  valor: string;
  linhas?: number;
  fonteMono?: boolean;
}) {
  const [recado, setRecado] = useState<string | null>(null);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setRecado("Copiado.");
    } catch {
      const caixa = document.getElementById(`copiavel-${rotulo}`) as HTMLTextAreaElement | null;
      caixa?.select();
      setRecado("Selecionei tudo — agora é Ctrl+C (ou ⌘+C).");
    }
    setTimeout(() => setRecado(null), 4000);
  }

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="sobrescrito">{rotulo}</span>
        <div className="flex items-center gap-2.5">
          {recado && <span className="text-[12.5px] text-verde">{recado}</span>}
          <button
            type="button"
            onClick={() => void copiar()}
            className="rounded-pilula bg-papel px-3 py-1.5 text-[12.5px] font-medium text-tinta ring-1 ring-regua hover:bg-linha"
          >
            Copiar
          </button>
        </div>
      </div>
      <textarea
        id={`copiavel-${rotulo}`}
        readOnly
        rows={linhas}
        value={valor}
        onFocus={(e) => e.currentTarget.select()}
        className={`w-full rounded-folha border border-regua bg-papel px-3.5 py-2.5 text-[13px] leading-relaxed ${
          fonteMono ? "font-mono" : ""
        }`}
      />
    </div>
  );
}
