"use client";

export function Imprimir() {
  return (
    <div className="nao-imprime mb-6 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex min-h-[42px] items-center rounded-folha bg-heroi px-4 text-[15px] font-semibold text-heroi-tinta"
      >
        Imprimir ou salvar em PDF
      </button>
      <span className="text-[13px] text-fosco">
        No diálogo de impressão, escolha &ldquo;Salvar em PDF&rdquo;.
      </span>
    </div>
  );
}
