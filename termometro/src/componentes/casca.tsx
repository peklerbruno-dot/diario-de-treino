"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { hoje } from "@/lib/datas";
import { loja, RECADO_DA_SITUACAO } from "@/lib/loja";
import { FolhaDeLancamento } from "./folha-de-lancamento";
import { Botao } from "./pecas";
import { useEstado, useIniciarLoja } from "./usar-loja";

const ABAS = [
  { href: "/", rotulo: "Mês" },
  { href: "/ano", rotulo: "Ano" },
  { href: "/fixos", rotulo: "Fixos" },
  { href: "/ajustes", rotulo: "Ajustes" },
];

export function Casca({ children }: { children: React.ReactNode }) {
  useIniciarLoja();
  useRegistrarServiceWorker();
  const montado = useMontado();
  const caminho = usePathname();
  // Lançar faz sentido nas telas de leitura; em Ajustes e na importação a barra
  // só tomaria espaço.
  const temBarraDeLancar = caminho === "/" || caminho === "/ano";

  return (
    <div className="mx-auto flex min-h-[100svh] w-full max-w-2xl flex-col">
      <div className={`flex-1 px-4 pt-3 ${temBarraDeLancar ? "pb-40" : "pb-24"}`}>
        {montado ? children : <Esqueleto />}
      </div>
      {temBarraDeLancar && <BarraDeLancar />}
      <Situacao acimaDaBarra={temBarraDeLancar} />
      <nav
        className="fixed inset-x-0 bottom-0 border-t border-reguafina bg-papel/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="mx-auto flex max-w-2xl">
          {ABAS.map((aba) => {
            const aqui = aba.href === "/" ? caminho === "/" : caminho.startsWith(aba.href);
            return (
              <li key={aba.href} className="flex-1">
                <Link
                  href={aba.href}
                  aria-current={aqui ? "page" : undefined}
                  className={`flex h-14 items-center justify-center text-[15px] ${
                    aqui ? "font-semibold text-tinta" : "text-fosco"
                  }`}
                >
                  {aba.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
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
      <div className="h-8 w-40 rounded-folha bg-reguafina" />
      <div className="h-40 rounded-folha bg-reguafina" />
      <div className="h-64 rounded-folha bg-reguafina" />
    </div>
  );
}

/**
 * O aviso de sincronização só aparece quando há o que dizer. Um selo permanente
 * de "tudo certo" vira ruído: o normal não precisa de aviso.
 */
/**
 * O botão que abre o lançamento, numa barra opaca acima da navegação.
 *
 * Não é um botão redondo flutuando: o redondo pousava justamente sobre a coluna
 * do saldo — o número que a tela existe para mostrar.
 */
function BarraDeLancar() {
  const [lancando, setLancando] = useState(false);
  return (
    <>
      <div
        className="fixed inset-x-0 bottom-14 z-20 border-t border-reguafina bg-papel px-4 py-2"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
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

function Situacao({ acimaDaBarra }: { acimaDaBarra: boolean }) {
  const { situacao, pendentes } = useEstado();
  if (situacao === "guardado") return null;

  const cor = situacao === "erro" ? "text-atencao" : "text-grafite";
  const quantos = pendentes.length;

  return (
    <div
      className={`fixed inset-x-0 z-30 px-4 pb-1 ${acimaDaBarra ? "bottom-[7.5rem]" : "bottom-14"}`}
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-folha border border-reguafina bg-cartao px-3 py-2 text-[13px]">
        <span className={cor}>
          {RECADO_DA_SITUACAO[situacao]}
          {quantos > 0 && situacao !== "enviando" ? ` · ${quantos} para enviar` : ""}
        </span>
        {situacao !== "enviando" && (
          <button
            type="button"
            onClick={() => void loja.sincronizar()}
            className="rounded-full border border-regua px-3 py-1 text-tinta"
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
