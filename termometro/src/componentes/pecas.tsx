"use client";

import { useEffect, useId } from "react";
import { comCifrao } from "@/lib/dinheiro";

/** O cartão branco que flutua sobre o fundo. É a única caixa do app. */
export function Cartao({
  children,
  className = "",
  escuro,
}: {
  children: React.ReactNode;
  className?: string;
  /** O cartão preto do saldo: um por tela, no que mais importa. */
  escuro?: boolean;
}) {
  return (
    <div
      className={`rounded-cartao shadow-cartao ${
        escuro ? "bg-heroi text-heroi-tinta" : "bg-cartao"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** O rótulo pequeno em maiúsculas que encabeça um bloco. */
export function Sobrescrito({
  children,
  escuro,
  className = "",
}: {
  children: React.ReactNode;
  escuro?: boolean;
  className?: string;
}) {
  return (
    <p className={`sobrescrito ${escuro ? "!text-heroi-fosco" : ""} ${className}`}>{children}</p>
  );
}

export function Titulo({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1 className={`font-titulo text-[27px] font-semibold tracking-tight ${className}`}>
      {children}
    </h1>
  );
}

export function Subtitulo({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`font-titulo text-[19px] font-semibold tracking-tight ${className}`}>
      {children}
    </h2>
  );
}

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
          ? "text-diario"
          : papel === "saldo"
            ? cents < 0
              ? "text-atencao"
              : ""
            : "";

  const corpo =
    tamanho === "gigante"
      ? "text-[38px] leading-[1.05] font-bold tracking-[-0.025em]"
      : tamanho === "grande"
        ? "text-[21px] leading-tight font-semibold"
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

/** A etiqueta arredondada: "hoje", "previsto". */
export function Selo({
  children,
  tom = "azul",
}: {
  children: React.ReactNode;
  tom?: "azul" | "quieto";
}) {
  const estilo =
    tom === "azul" ? "bg-saldo text-white" : "bg-linha text-grafite";
  return (
    <span
      className={`ml-1.5 inline-block rounded-full px-[7px] py-[2px] align-[1px] text-[9.5px] font-bold uppercase tracking-wide ${estilo}`}
    >
      {children}
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
      <span className="block text-[14px] text-grafite">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-[12.5px] text-fosco">{dica}</span>}
    </label>
  );
}

/**
 * Campo de dinheiro simples, para os lugares em que se digita um número e
 * pronto — o saldo de abertura do ano, por exemplo. O lançamento do dia a dia
 * não usa este campo: usa o teclado do app, que tem a tecla de mais.
 *
 * Não é `type="number"`: no teclado em português a tecla decimal é a vírgula, e
 * um campo numérico descarta o que se digita com ela — "52,5" viraria vazio.
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
      className="tabular mt-1.5 w-full rounded-folha border border-regua bg-cartao px-4 py-3 text-[21px] outline-none focus:border-saldo"
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
      className="mt-1.5 w-full rounded-folha border border-regua bg-cartao px-4 py-3 outline-none focus:border-saldo"
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
      ? "bg-heroi text-heroi-tinta font-semibold shadow-cartao"
      : tipo === "perigo"
        ? "bg-cartao text-atencao shadow-baixa"
        : "bg-cartao text-tinta shadow-baixa";

  return (
    <button
      type={submit ? "submit" : "button"}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[46px] rounded-folha px-4 py-2.5 text-[16px] disabled:opacity-50 ${estilo} ${className}`}
    >
      {children}
    </button>
  );
}

/** A setinha redonda que anda de mês em mês. */
export function Seta({
  rotulo,
  onClick,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={onClick}
      className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-cartao text-[19px] text-grafite shadow-baixa"
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
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="relative max-h-[92svh] w-full max-w-2xl overflow-y-auto rounded-t-[26px] bg-papel px-4 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-regua" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={tituloId} className="font-titulo text-[21px] font-semibold tracking-tight">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            className="min-h-[36px] rounded-full bg-cartao px-4 text-[14px] text-grafite shadow-baixa"
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
      className={`flex items-baseline justify-between gap-3 border-b border-linha py-2.5 last:border-b-0 ${
        forte ? "font-semibold" : ""
      }`}
    >
      <span className="text-[14px] text-grafite">
        {rotulo}
        {detalhe && <span className="ml-2 text-[12px] text-fosco">{detalhe}</span>}
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
    <div
      className={`rounded-folha p-3.5 text-[14.5px] leading-relaxed shadow-baixa ${
        tom === "atencao" ? "bg-cartao text-tinta ring-1 ring-atencao/40" : "bg-cartao text-grafite"
      }`}
    >
      {children}
    </div>
  );
}
