"use client";

import { useEffect, useId, useRef } from "react";
import { comCifrao } from "@/lib/dinheiro";

/** Um número de dinheiro, com o sinal quando ele quer dizer alguma coisa. */
export function Dinheiro({
  cents,
  papel = "neutro",
  tamanho = "normal",
  className = "",
}: {
  cents: number;
  papel?: "neutro" | "entrada" | "saida" | "diario" | "saldo";
  tamanho?: "normal" | "grande" | "gigante";
  className?: string;
}) {
  const cor =
    papel === "entrada"
      ? "text-entrada"
      : papel === "saida"
        ? "text-saida"
        : papel === "diario"
          ? "text-grafite"
          : papel === "saldo"
            ? cents < 0
              ? "text-atencao"
              : "text-tinta"
            : "text-tinta";

  const corpo =
    tamanho === "gigante"
      ? "text-[40px] leading-none font-semibold tracking-tight"
      : tamanho === "grande"
        ? "text-[22px] leading-tight font-medium"
        : "text-[15px]";

  // O sinal é a segunda pista, além da cor: quem não distingue verde de
  // vermelho continua lendo a tela.
  const sinal = papel === "entrada" ? "+" : papel === "saida" || papel === "diario" ? "−" : "";

  return (
    <span className={`tabular ${cor} ${corpo} ${className}`}>
      {sinal}
      {comCifrao(Math.abs(cents))}
    </span>
  );
}

export function Campo({
  rotulo,
  dica,
  children,
}: {
  rotulo: string;
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[15px] text-grafite">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-[13px] text-fosco">{dica}</span>}
    </label>
  );
}

/**
 * O campo de dinheiro.
 *
 * Não é `type="number"` de propósito: no teclado do iPhone em português a tecla
 * decimal é a vírgula, e um campo numérico descarta o que se digita com ela —
 * "52,5" viraria vazio. Este é um campo de texto com `inputMode`, que abre o
 * mesmo teclado, aceita a vírgula, e ainda deixa somar ("195+15+83") como se
 * fazia dentro da célula da planilha.
 */
export function CampoDeValor({
  valor,
  aoMudar,
  autoFocus,
  id,
}: {
  valor: string;
  aoMudar: (v: string) => void;
  autoFocus?: boolean;
  id?: string;
}) {
  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      enterKeyHint="done"
      autoFocus={autoFocus}
      placeholder="0,00"
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
      className="mt-1 w-full rounded-folha border border-regua bg-cartao px-4 py-3 text-[22px] tabular outline-none focus:border-saldo"
    />
  );
}

export function CampoDeTexto({
  valor,
  aoMudar,
  placeholder,
  id,
}: {
  valor: string;
  aoMudar: (v: string) => void;
  placeholder?: string;
  id?: string;
}) {
  return (
    <input
      id={id}
      type="text"
      value={valor}
      placeholder={placeholder}
      onChange={(e) => aoMudar(e.target.value)}
      className="mt-1 w-full rounded-folha border border-regua bg-cartao px-4 py-3 outline-none focus:border-saldo"
    />
  );
}

export function Botao({
  children,
  onClick,
  tipo = "secundario",
  disabled,
  submit,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tipo?: "primario" | "secundario" | "perigo";
  disabled?: boolean;
  submit?: boolean;
  className?: string;
}) {
  const estilo =
    tipo === "primario"
      ? "bg-tinta text-papel border-tinta"
      : tipo === "perigo"
        ? "bg-transparent text-atencao border-atencao/50"
        : "bg-cartao text-tinta border-regua";

  return (
    <button
      type={submit ? "submit" : "button"}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[44px] rounded-folha border px-4 py-2.5 text-[17px] disabled:opacity-50 ${estilo} ${className}`}
    >
      {children}
    </button>
  );
}

/** A folha que sobe de baixo — o jeito do iPhone de pedir uma coisa de cada vez. */
export function Folha({
  titulo,
  aoFechar,
  children,
}: {
  titulo: string;
  aoFechar: () => void;
  children: React.ReactNode;
}) {
  const tituloId = useId();
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = "";
    };
  }, [aoFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={aoFechar}
        className="absolute inset-0 bg-black/30"
      />
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="relative max-h-[88svh] w-full max-w-2xl overflow-y-auto rounded-t-[22px] border-t border-reguafina bg-papel px-4 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-regua" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={tituloId} className="text-[20px] font-semibold tracking-tight">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            className="min-h-[36px] rounded-full border border-regua px-3 text-[15px] text-grafite"
          >
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Linha de rodapé: um rótulo à esquerda, um número à direita. */
export function Linha({
  rotulo,
  detalhe,
  children,
  forte,
}: {
  rotulo: string;
  detalhe?: string;
  children: React.ReactNode;
  forte?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-b border-reguafina py-2.5 ${
        forte ? "font-medium" : ""
      }`}
    >
      <span className="text-[15px] text-grafite">
        {rotulo}
        {detalhe && <span className="ml-2 text-[13px] text-fosco">{detalhe}</span>}
      </span>
      {children}
    </div>
  );
}

export function Aviso({
  children,
  tom = "neutro",
}: {
  children: React.ReactNode;
  tom?: "neutro" | "atencao";
}) {
  return (
    <p
      className={`rounded-folha border p-3 text-[15px] leading-relaxed ${
        tom === "atencao" ? "border-atencao/40 text-tinta" : "border-reguafina text-grafite"
      }`}
    >
      {children}
    </p>
  );
}
