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
    `flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] transition-colors ${
      sel ? "cartao font-semibold text-destaque" : "text-grafite hover:text-tinta"
    }`;
  return (
    <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col border-r border-linha px-4 py-7 lg:flex">
      <Link href="/" className="serifa mb-8 px-3 text-[22px]">
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

/** A barra de abas do celular: um cartão flutuante, sem selos de número. */
export function Abas() {
  const pathname = usePathname();
  return (
    <nav className="cartao fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),10px)] z-20 flex !rounded-[26px] py-1.5 lg:hidden">
      {[...ITENS, { href: "/ajustes", nome: "Ajustes", Icone: IconeAjustes }].map(({ href, nome, Icone }) => (
        <Link
          key={href}
          href={href}
          className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] ${ativo(pathname, href) ? "font-semibold text-destaque" : "text-fosco"}`}
        >
          <Icone className="h-[22px] w-[22px]" />
          {nome}
        </Link>
      ))}
    </nav>
  );
}
