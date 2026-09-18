"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PessoaNaSessao } from "@/lib/auth";

/**
 * A casca: o cabeçalho e a navegação.
 *
 * É o único componente de cliente do sistema, e só porque precisa saber em que
 * página está para marcar a aba. Todo o resto é HTML que o servidor manda
 * pronto.
 *
 * A navegação é uma faixa horizontal que rola no celular em vez de virar um
 * menu sanfona. Um menu escondido faz a pessoa clicar duas vezes para ver as
 * opções — e uma opção que ninguém vê é uma tela que ninguém usa.
 */

const ABAS = [
  { href: "/", rotulo: "Painel" },
  { href: "/calendario", rotulo: "Calendário" },
  { href: "/atividades", rotulo: "Atividades" },
  { href: "/reunioes", rotulo: "Reuniões" },
  { href: "/encaminhamentos", rotulo: "Encaminhamentos" },
  { href: "/contatos", rotulo: "Contatos" },
  { href: "/boletins", rotulo: "Boletins" },
  { href: "/relatorio", rotulo: "Relatório" },
  { href: "/equipe", rotulo: "Equipe" },
];

export function Casca({
  pessoa,
  pedemAtencao,
  children,
}: {
  pessoa: PessoaNaSessao;
  /** Quantos encaminhamentos seus já venceram ou vencem hoje. */
  pedemAtencao: number;
  children: React.ReactNode;
}) {
  const caminho = usePathname();

  return (
    <div className="min-h-[100svh]">
      <header className="nao-imprime border-b border-linha bg-cartao">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-3.5">
          <Link href="/" className="min-w-0">
            <span className="block font-titulo text-[17px] font-semibold leading-tight tracking-tight">
              Centro de Estudos Judaicos
            </span>
            <span className="block text-[12px] text-fosco">Universidade de São Paulo</span>
          </Link>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-right text-[13px] leading-tight text-grafite sm:block">
              {pessoa.nome}
            </span>
            <form action="/sair" method="post">
              <button
                type="submit"
                className="rounded-pilula px-3 py-1.5 text-[13px] text-grafite hover:bg-linha"
              >
                Sair
              </button>
            </form>
          </div>
        </div>

        <nav aria-label="Seções" className="mx-auto max-w-6xl px-4">
          <ul className="-mb-px flex gap-1 overflow-x-auto pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ABAS.map(({ href, rotulo }) => {
              const aqui = href === "/" ? caminho === "/" : caminho.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={aqui ? "page" : undefined}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[14px] ${
                      aqui
                        ? "border-realce font-semibold text-tinta"
                        : "border-transparent text-grafite hover:text-tinta"
                    }`}
                  >
                    {rotulo}
                    {href === "/encaminhamentos" && pedemAtencao > 0 && (
                      <span
                        aria-label={`${pedemAtencao} pedindo atenção`}
                        className="tabular inline-flex min-w-[19px] justify-center rounded-pilula bg-vermelho px-1.5 py-[1px] text-[11px] font-bold text-white"
                      >
                        {pedemAtencao}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-7">{children}</main>
    </div>
  );
}
