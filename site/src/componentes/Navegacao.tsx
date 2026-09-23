"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PAGINAS } from "@/lib/paginas";


const ativo = (atual: string, href: string) => (href === "/" ? atual === "/" : atual.startsWith(href));

export function Navegacao() {
  const atual = usePathname();
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [atual]);

  return (
    <>
      <nav className="hidden lg:block" aria-label="Principal">
        <ul className="flex items-center gap-1">
          {PAGINAS.map((p) => (
            <li key={p.href}>
              <Link
                href={p.href}
                aria-current={ativo(atual, p.href) ? "page" : undefined}
                className={`rounded-full px-3.5 py-2 font-titulo text-[15px] font-bold transition ${
                  ativo(atual, p.href) ? "bg-marinho text-white" : "text-marinho hover:bg-marinho/10"
                }`}
              >
                {p.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <button
        type="button"
        className="grid h-11 w-11 place-items-center rounded-full text-marinho hover:bg-marinho/10 lg:hidden"
        aria-expanded={aberto}
        aria-controls="menu-celular"
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        onClick={() => setAberto((a) => !a)}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          {aberto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {aberto ? (
        <nav id="menu-celular" className="absolute inset-x-0 top-full border-t border-marinho/10 bg-white shadow-xl lg:hidden" aria-label="Principal">
          <ul className="mx-auto max-w-6xl px-4 py-3">
            {PAGINAS.map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  aria-current={ativo(atual, p.href) ? "page" : undefined}
                  className={`block rounded-xl px-4 py-3 font-titulo text-lg font-bold ${
                    ativo(atual, p.href) ? "bg-marinho text-white" : "text-marinho"
                  }`}
                >
                  {p.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </>
  );
}
