import type { ButtonHTMLAttributes, ReactNode } from "react";

/** As peças pequenas que toda tela usa. */

export function Cartao({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`rounded-cartao bg-cartao p-4 shadow-cartao ${className}`}>
      {children}
    </section>
  );
}

type Tipo = "primario" | "secundario" | "fantasma" | "perigo";
const TIPOS: Record<Tipo, string> = {
  primario: "bg-folha text-sobre-cor",
  secundario: "bg-papel text-tinta",
  fantasma: "text-grafite",
  perigo: "bg-pulou-clara text-pulou",
};

export function Botao({
  tipo = "secundario",
  className = "",
  children,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { tipo?: Tipo }) {
  return (
    <button
      type="button"
      {...resto}
      className={`rounded-folha px-4 py-2.5 text-[16px] font-medium transition-opacity active:opacity-70 disabled:opacity-50 ${TIPOS[tipo]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Titulo({ children, depois }: { children: ReactNode; depois?: ReactNode }) {
  return (
    <header className="mb-4 mt-2 flex items-end justify-between gap-3">
      <h1 className="font-titulo text-[30px] font-semibold leading-tight tracking-tight">{children}</h1>
      {depois}
    </header>
  );
}

export function Chave({ ligado, aoMudar, rotulo }: { ligado: boolean; aoMudar: (v: boolean) => void; rotulo: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={() => aoMudar(!ligado)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${ligado ? "bg-folha" : "bg-regua"}`}
    >
      <span
        className={`absolute left-0 top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${
          ligado ? "translate-x-[22px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

export const campo =
  "w-full rounded-folha border border-regua bg-cartao px-3.5 py-2.5 outline-none focus:border-folha";
