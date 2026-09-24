"use client";

import Link from "next/link";
import { Cartao, Sobrescrito, Titulo } from "@/componentes/pecas";
import { IconeAjustes, IconeAno, IconeFixos } from "@/componentes/icones";

/**
 * O que não é de olhar com o celular na mão.
 *
 * A barra de baixo só comporta cinco nomes antes de virar uma fileira de
 * palavras cortadas, e o app passou de sete telas. A escolha do que fica na
 * barra não é por importância e sim por postura: Hoje, Mês, Totais e O que vem
 * se olham de pé, na fila do mercado. Ano, Fixos e Ajustes se olham sentado, e
 * um toque a mais não custa nada para quem já sentou.
 */
const DESTINOS = [
  {
    href: "/ano",
    Icone: IconeAno,
    titulo: "Ano",
    descricao: "Os doze meses em números, e como o ano fecha.",
  },
  {
    href: "/fixos",
    Icone: IconeFixos,
    titulo: "Fixos",
    descricao: "O que se repete todo mês, e a previsão que nasce daí.",
  },
  {
    href: "/ajustes",
    Icone: IconeAjustes,
    titulo: "Ajustes",
    descricao: "Categorias, saldo de abertura, backup, atalho do iPhone.",
  },
];

export function TelaDoMais() {
  return (
    <div>
      <Sobrescrito>O resto</Sobrescrito>
      <Titulo className="mt-0.5">Mais</Titulo>

      <div className="mt-4 space-y-2 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
        {DESTINOS.map(({ href, Icone, titulo, descricao }) => (
          <Link key={href} href={href} className="block">
            <Cartao className="flex h-full items-center gap-3.5 px-4 py-4 lg:flex-col lg:items-start lg:gap-2">
              <span className="text-grafite">
                <Icone />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-titulo text-[17px] font-semibold tracking-tight">
                  {titulo}
                </span>
                <span className="mt-0.5 block text-[13.5px] leading-snug text-grafite">
                  {descricao}
                </span>
              </span>
              <span aria-hidden className="shrink-0 text-[18px] text-fosco">
                ›
              </span>
            </Cartao>
          </Link>
        ))}
      </div>
    </div>
  );
}
