"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/historico", rotulo: "Geral" },
  { href: "/historico/calendario", rotulo: "Calendário" },
  { href: "/historico/fotos", rotulo: "Fotos" },
  { href: "/historico/relatorio", rotulo: "Relatório" },
];

/** As abas de cima da tela Progresso. A página de um dia acende "Calendário". */
export function AbasDoProgresso() {
  const caminho = usePathname();
  const ativa = (href: string) =>
    href === "/historico" ? caminho === "/historico" : caminho.startsWith(href) || (href === "/historico/calendario" && caminho.startsWith("/historico/dia"));
  return (
    <nav className="mb-4 flex rounded-folha bg-cartao p-1 shadow-cartao" aria-label="Seções do progresso">
      {ABAS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          aria-current={ativa(a.href) ? "page" : undefined}
          className={`flex-1 rounded-[12px] py-2 text-center text-[14px] ${ativa(a.href) ? "bg-folha font-semibold text-sobre-cor" : "text-grafite"}`}
        >
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}
