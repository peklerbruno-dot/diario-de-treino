import Link from "next/link";
import { iniciais } from "@/lib/cores";

export function Aviso({ tom = "info", children }: { tom?: "info" | "erro" | "ok" | "atencao"; children: React.ReactNode }) {
  const cores = {
    info: "bg-realce-fraco text-tinta",
    erro: "bg-vermelho-fraco text-vermelho",
    ok: "bg-verde-fraco text-verde",
    atencao: "bg-ambar-fraco text-ambar",
  }[tom];
  return (
    <div role={tom === "erro" ? "alert" : "status"} className={`rounded-folha px-3 py-2.5 text-[15px] ${cores}`}>
      {children}
    </div>
  );
}

export function Avatar({ nome, cor, tamanho = 32 }: { nome: string; cor: string; tamanho?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ background: cor, width: tamanho, height: tamanho, fontSize: tamanho * 0.4 }}
    >
      {iniciais(nome)}
    </span>
  );
}

export function Cabecalho({
  titulo,
  subtitulo,
  voltar,
  acao,
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  voltar?: string;
  acao?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start gap-3 pt-[max(env(safe-area-inset-top),12px)]">
      {voltar && (
        <Link href={voltar} aria-label="Voltar" className="-ml-2 mt-1 rounded-full p-2 text-realce">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="font-titulo text-[28px] font-bold leading-tight tracking-tight">{titulo}</h1>
        {subtitulo && <p className="mt-0.5 text-[15px] text-fosco">{subtitulo}</p>}
      </div>
      {acao}
    </header>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <div className="cartao px-5 py-8 text-center">
      <p className="font-semibold">{titulo}</p>
      {children && <div className="mt-1 text-[15px] text-fosco">{children}</div>}
    </div>
  );
}

export function Secao({ titulo, acao, children }: { titulo: string; acao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <div className="mb-2 flex items-end justify-between gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-fosco">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function Pagina({ children, abas = false }: { children: React.ReactNode; abas?: boolean }) {
  return <main className={`mx-auto max-w-2xl px-4 pb-10 ${abas ? "com-abas" : ""}`}>{children}</main>;
}
