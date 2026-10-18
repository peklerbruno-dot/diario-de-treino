"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconeAgenda, IconeAjustes, IconeEmails, IconeHoje } from "./icones";

const ITENS = [
  { href: "/", nome: "Hoje", Icone: IconeHoje },
  { href: "/agenda", nome: "Agenda", Icone: IconeAgenda },
  { href: "/caixa", nome: "E-mails", Icone: IconeEmails },
];

const ativo = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/** A lateral do computador: três lugares e os ajustes. Nada de contadores. */
export function Lateral({ rodape }: { rodape: React.ReactNode }) {
  const pathname = usePathname();
  const item = (sel: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] transition-colors ${
      sel ? "bg-realce font-medium text-tinta" : "text-grafite hover:text-tinta"
    }`;
  return (
    <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col border-r border-linha px-4 py-7 lg:flex">
      <Link href="/" className="mb-8 px-3 text-[15px] font-semibold tracking-tight">
        Central
      </Link>
      <nav className="space-y-1">
        {ITENS.map(({ href, nome, Icone }) => (
          <Link key={href} href={href} className={item(ativo(pathname, href))}>
            <Icone className="h-[18px] w-[18px] opacity-80" />
            {nome}
          </Link>
        ))}
      </nav>
      <div className="mt-auto space-y-4">
        <Link href="/ajustes" className={item(pathname.startsWith("/ajustes"))}>
          <IconeAjustes className="h-[18px] w-[18px] opacity-80" />
          Ajustes
        </Link>
        <div className="px-3">{rodape}</div>
      </div>
    </aside>
  );
}

/** A barra de abas do celular, sem selos de número. */
export function Abas() {
  const pathname = usePathname();
  return (
    <nav className="seguro-embaixo fixed inset-x-0 bottom-0 z-20 flex border-t border-linha bg-fundo lg:hidden">
      {[...ITENS, { href: "/ajustes", nome: "Ajustes", Icone: IconeAjustes }].map(({ href, nome, Icone }) => (
        <Link
          key={href}
          href={href}
          className={`flex flex-1 flex-col items-center gap-0.5 pt-2 text-[10.5px] ${ativo(pathname, href) ? "text-tinta" : "text-fosco"}`}
        >
          <Icone className="h-[22px] w-[22px]" />
          {nome}
        </Link>
      ))}
    </nav>
  );
}
