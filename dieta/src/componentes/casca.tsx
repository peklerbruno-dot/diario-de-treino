"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ConviteParaInstalar } from "./convite-instalar";
import { IconeAjustes, IconeHistorico, IconeHoje, IconePlano, IconeSemana } from "./icones";

const DESTINOS = [
  { href: "/", rotulo: "Hoje", Icone: IconeHoje },
  { href: "/plano", rotulo: "Plano", Icone: IconePlano },
  { href: "/semana", rotulo: "Semana", Icone: IconeSemana },
  { href: "/historico", rotulo: "Progresso", Icone: IconeHistorico },
  { href: "/ajustes", rotulo: "Ajustes", Icone: IconeAjustes },
];

const aceso = (href: string, caminho: string) => (href === "/" ? caminho === "/" : caminho.startsWith(href));

/** A moldura de todas as telas: o conteúdo e a barra de navegação de baixo. */
export function Casca({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();

  // O service worker é o que recebe as notificações com o app fechado, e o que
  // abre o app sem internet. Registrado em toda abertura; o navegador ignora
  // quando já está.
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return (
    <div className="min-h-[100svh]">
      <main
        className="mx-auto max-w-xl px-4 pt-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 104px)" }}
      >
        <ConviteParaInstalar />
        {children}
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 px-3 pt-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
      >
        <ul className="mx-auto flex max-w-xl rounded-[26px] bg-cartao px-1 py-1.5 shadow-cartao">
          {DESTINOS.map(({ href, rotulo, Icone }) => {
            const ativo = aceso(href, caminho);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={ativo ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 rounded-[20px] py-2 text-[11px] ${
                    ativo ? "font-semibold text-folha" : "text-fosco"
                  }`}
                >
                  <Icone />
                  {rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
