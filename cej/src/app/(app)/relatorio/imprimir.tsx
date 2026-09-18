"use client";

/**
 * "Salvar em PDF" é o que o diálogo de impressão já faz, em qualquer
 * computador e em qualquer celular — e faz melhor do que qualquer biblioteca de
 * PDF que eu carregasse aqui. O botão só abre esse diálogo.
 */
export function BotaoDeImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-[42px] items-center justify-center rounded-folha bg-cartao px-4 text-[15px] shadow-baixa hover:bg-linha"
    >
      Imprimir ou salvar em PDF
    </button>
  );
}
