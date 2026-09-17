"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { hoje } from "@/lib/datas";
import { loja, RECADO_DA_SITUACAO } from "@/lib/loja";
import { FolhaDeLancamento } from "./folha-de-lancamento";
import {
  IconeAjustes,
  IconeAno,
  IconeFixos,
  IconeHoje,
  IconeMes,
} from "./icones";
import { Botao } from "./pecas";
import { useEstado, useIniciarLoja } from "./usar-loja";

const ABAS = [
  { href: "/", rotulo: "Hoje", Icone: IconeHoje },
  { href: "/mes", rotulo: "Mês", Icone: IconeMes },
  { href: "/ano", rotulo: "Ano", Icone: IconeAno },
  { href: "/fixos", rotulo: "Fixos", Icone: IconeFixos },
  { href: "/ajustes", rotulo: "Ajustes", Icone: IconeAjustes },
];

export function Casca({ children }: { children: React.ReactNode }) {
  useIniciarLoja();
  useRegistrarServiceWorker();
  const montado = useMontado();
  const caminho = usePathname();

  // A aba Hoje tem os próprios botões de lançar; nas telas de leitura, a barra.
  const temBarraDeLancar = caminho === "/mes" || caminho === "/ano";

  return (
    <div className="mx-auto flex min-h-[100svh] w-full max-w-2xl flex-col">
      <div className={`flex-1 px-4 pt-4 ${temBarraDeLancar ? "pb-44" : "pb-28"}`}>
        {montado ? children : <Esqueleto />}
      </div>
      {temBarraDeLancar && <BarraDeLancar />}
      <Situacao acimaDaBarra={temBarraDeLancar} />
      <Navegacao caminho={caminho} />
    </div>
  );
}

/** A barra flutuante de baixo, com ícone e nome em cada aba. */
function Navegacao({ caminho }: { caminho: string }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 px-3 pt-2"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
    >
      <ul className="mx-auto flex max-w-2xl rounded-[26px] bg-cartao px-1.5 py-1.5 shadow-cartao">
        {ABAS.map(({ href, rotulo, Icone }) => {
          const aqui = href === "/" ? caminho === "/" : caminho.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={aqui ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-[20px] py-2 text-[10.5px] ${
                  aqui ? "font-semibold text-tinta" : "text-fosco"
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
  );
}

/**
 * O conteúdo só é montado no aparelho, nunca no servidor.
 *
 * Duas razões, e qualquer uma bastaria. A primeira: os dados moram no aparelho,
 * então o servidor só saberia desenhar um mês vazio — e o vazio piscaria antes
 * dos números. A segunda é mais sorrateira: "hoje" no servidor é o dia em UTC,
 * e no seu iPhone é o dia em Brasília. Entre nove da noite e a meia-noite os
 * dois discordam, e o React, ao achar "15" onde tinha escrito "14", apagava a
 * tela inteira e desenhava de novo.
 */
function useMontado(): boolean {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  return montado;
}

/** O lugar dos números enquanto eles não chegam — sem pulo de layout. */
function Esqueleto() {
  return (
    <div aria-hidden className="animate-pulse space-y-3 pt-2">
      <div className="h-8 w-40 rounded-folha bg-linha" />
      <div className="h-36 rounded-cartao bg-linha" />
      <div className="h-64 rounded-cartao bg-linha" />
    </div>
  );
}

/**
 * O botão que abre o lançamento, numa barra acima da navegação.
 *
 * Não é um botão redondo flutuando: o redondo pousava justamente sobre a coluna
 * do saldo — o número que a tela existe para mostrar.
 */
function BarraDeLancar() {
  const [lancando, setLancando] = useState(false);
  return (
    <>
      <div className="fixed inset-x-0 bottom-[76px] z-20 px-4">
        <div className="mx-auto max-w-2xl">
          <Botao tipo="primario" onClick={() => setLancando(true)} className="w-full">
            Lançar
          </Botao>
        </div>
      </div>
      {lancando && <FolhaDeLancamento data={hoje()} aoFechar={() => setLancando(false)} />}
    </>
  );
}

/**
 * O aviso de sincronização só aparece quando há o que dizer. Um selo permanente
 * de "tudo certo" vira ruído: o normal não precisa de aviso.
 */
function Situacao({ acimaDaBarra }: { acimaDaBarra: boolean }) {
  const { situacao, pendentes } = useEstado();
  if (situacao === "guardado") return null;

  const quantos = pendentes.length;

  return (
    <div
      className={`fixed inset-x-0 z-30 px-4 ${acimaDaBarra ? "bottom-[134px]" : "bottom-[76px]"}`}
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-folha bg-cartao px-3.5 py-2.5 text-[12.5px] shadow-cartao">
        <span className={situacao === "erro" ? "text-atencao" : "text-grafite"}>
          {RECADO_DA_SITUACAO[situacao]}
          {quantos > 0 && situacao !== "enviando" ? ` · ${quantos} para enviar` : ""}
        </span>
        {situacao !== "enviando" && (
          <button
            type="button"
            onClick={() => void loja.sincronizar()}
            className="rounded-full bg-linha px-3 py-1 font-medium text-tinta"
          >
            Tentar agora
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * O app guarda a casca no aparelho para abrir sem internet. A versão nova entra
 * na abertura seguinte, nunca recarregando a página por conta própria: um
 * lançamento em digitação não pode se perder porque saiu um deploy.
 */
function useRegistrarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem service worker o app continua inteiro; só não abre offline.
    });
  }, []);
}
