"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { IconeAgenda, IconeAjustes, IconeEmails, IconeHoje, IconeTarefas } from "./icones";

export interface ResumoNav {
  hoje: number;
  tarefas: number;
  fluxos: { id: string; nome: string; n: number }[];
  contas: { id: string; rotulo: string; email: string; cor: string; erro: boolean }[];
}

const ITENS = [
  { href: "/", nome: "Hoje", Icone: IconeHoje, chave: "hoje" as const },
  { href: "/agenda", nome: "Agenda", Icone: IconeAgenda, chave: null },
  { href: "/tarefas", nome: "Tarefas", Icone: IconeTarefas, chave: "tarefas" as const },
  { href: "/caixa", nome: "E-mails", Icone: IconeEmails, chave: null },
];

function ativo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** A lateral do computador: navegação, fluxos dos e-mails e contas. */
export function Lateral({ resumo, rodape }: { resumo: ResumoNav; rodape: React.ReactNode }) {
  const pathname = usePathname();
  const busca = useSearchParams();
  const item = (sel: boolean) =>
    `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
      sel ? "bg-realce font-semibold text-tinta" : "text-grafite hover:bg-realce hover:text-tinta"
    }`;
  return (
    <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-linha bg-lateral px-3 py-5 lg:flex">
      <Link href="/" className="mb-6 px-2.5 text-[15px] font-semibold tracking-tight">
        Central
      </Link>
      <nav className="space-y-0.5">
        {ITENS.map(({ href, nome, Icone, chave }) => (
          <Link key={href} href={href} className={item(ativo(pathname, href))}>
            <Icone />
            <span className="flex-1">{nome}</span>
            {chave && resumo[chave] > 0 && <span className="numeros text-mini text-fosco">{resumo[chave]}</span>}
          </Link>
        ))}
      </nav>

      <p className="mb-1 mt-6 px-2.5 text-mini font-semibold uppercase tracking-[0.08em] text-fosco">E-mails</p>
      <nav className="space-y-0.5">
        {resumo.fluxos.map((f) => {
          const sel = pathname.startsWith("/caixa") && (busca.get("fluxo") ?? "voce") === f.id && !busca.get("resolvidas");
          return (
            <Link key={f.id} href={`/caixa?fluxo=${f.id}`} className={item(sel)}>
              <span className="flex-1 pl-[28px]">{f.nome}</span>
              {f.n > 0 && <span className="numeros text-mini text-fosco">{f.n}</span>}
            </Link>
          );
        })}
      </nav>

      <p className="mb-1 mt-6 px-2.5 text-mini font-semibold uppercase tracking-[0.08em] text-fosco">Contas</p>
      <div className="space-y-0.5">
        {resumo.contas.map((c) => (
          <Link key={c.id} href={`/caixa?conta=${c.id}`} className={item(busca.get("conta") === c.id)} title={c.email}>
            <span className="ml-1 h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: c.cor }} />
            <span className="flex-1 truncate pl-1">{c.rotulo}</span>
            {c.erro && <span className="text-mini font-semibold text-atencao">reconectar</span>}
          </Link>
        ))}
      </div>

      <div className="mt-auto space-y-3">
        <Link href="/ajustes" className={item(pathname.startsWith("/ajustes"))}>
          <IconeAjustes />
          Ajustes
        </Link>
        <div className="px-2.5">{rodape}</div>
      </div>
    </aside>
  );
}

/** A barra de abas do celular. */
export function Abas({ resumo }: { resumo: ResumoNav }) {
  const pathname = usePathname();
  const todos = [...ITENS, { href: "/ajustes", nome: "Ajustes", Icone: IconeAjustes, chave: null }];
  return (
    <nav className="seguro-embaixo fixed inset-x-0 bottom-0 z-20 flex border-t border-linha bg-superficie backdrop-blur lg:hidden">
      {todos.map(({ href, nome, Icone, chave }) => {
        const sel = ativo(pathname, href);
        const n = chave ? resumo[chave] : 0;
        return (
          <Link key={href} href={href} className={`relative flex flex-1 flex-col items-center gap-0.5 pt-2 text-[10.5px] ${sel ? "text-destaque" : "text-fosco"}`}>
            <Icone className="h-[22px] w-[22px]" />
            {nome}
            {n > 0 && (
              <span className="numeros absolute right-[calc(50%-20px)] top-1 rounded-full bg-atencao px-1 text-[9.5px] font-semibold leading-[15px] text-white">
                {n}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
