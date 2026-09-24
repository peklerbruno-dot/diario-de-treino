"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { hoje } from "@/lib/datas";
import { loja, RECADO_DA_SITUACAO } from "@/lib/loja";
import { FolhaDeLancamento } from "./folha-de-lancamento";
import {
  IconeAgenda,
  IconeAjustes,
  IconeAno,
  IconeFixos,
  IconeHoje,
  IconeMais,
  IconeMes,
  IconeTotais,
} from "./icones";
import { Botao } from "./pecas";
import { useEstado, useIniciarLoja } from "./usar-loja";

/**
 * As alturas do rodapé, num lugar só.
 *
 * Elas precisam concordar entre três coisas — o espaço que o conteúdo reserva,
 * onde o botão de lançar pousa e onde o aviso de sincronização aparece — e
 * precisam contar a faixa do gesto do iPhone, que muda de aparelho para
 * aparelho. Enquanto eram três números soltos em `bottom-[76px]`, o iPhone com
 * faixa empurrava a navegação para cima e ela cobria o botão de lançar: o botão
 * existia, aparecia na tela, e não dava para tocar.
 */
const FAIXA = "env(safe-area-inset-bottom, 0px)";
const ALTURA = {
  /** Do fim da tela até o topo da barra de navegação. */
  navegacao: `calc(${FAIXA} + 86px)`,
  /** Onde o botão de lançar pousa: logo acima da navegação. */
  barraDeLancar: `calc(${FAIXA} + 94px)`,
  /** O aviso de sincronização, acima de tudo o que houver. */
  avisoAcimaDaBarra: `calc(${FAIXA} + 152px)`,
  avisoSozinho: `calc(${FAIXA} + 94px)`,
  /** O que o conteúdo reserva embaixo para não terminar atrás do rodapé. */
  semBarra: `calc(${FAIXA} + 102px)`,
  comBarra: `calc(${FAIXA} + 164px)`,
};

/**
 * Os destinos, e quais deles cabem na barra do celular.
 *
 * `naBarra` existe porque as duas telas têm orçamentos diferentes: a barra do
 * iPhone comporta cinco nomes antes de virar uma fileira de palavras cortadas,
 * e a lateral do computador comporta todos com folga. Esconder Ano, Fixos e
 * Ajustes atrás de "Mais" é uma conta do celular — repeti-la num monitor de mil
 * e quatrocentos pixels seria economizar espaço que sobra.
 */
const DESTINOS = [
  { href: "/", rotulo: "Hoje", Icone: IconeHoje, naBarra: true },
  { href: "/mes", rotulo: "Mês", Icone: IconeMes, naBarra: true },
  { href: "/totais", rotulo: "Totais", Icone: IconeTotais, naBarra: true },
  { href: "/agenda", rotulo: "O que vem", Icone: IconeAgenda, naBarra: true },
  { href: "/mais", rotulo: "Mais", Icone: IconeMais, naBarra: true },
  { href: "/ano", rotulo: "Ano", Icone: IconeAno, naBarra: false },
  { href: "/fixos", rotulo: "Fixos", Icone: IconeFixos, naBarra: false },
  { href: "/ajustes", rotulo: "Ajustes", Icone: IconeAjustes, naBarra: false },
];

/** "Mais" acende quando se está em qualquer uma das telas que ele guarda. */
const GUARDADAS_POR_MAIS = [
  "/mais",
  "/ano",
  "/fixos",
  "/ajustes",
  "/atalho",
  "/importar",
  "/classificar",
];

const aqui = (href: string, caminho: string, naLateral: boolean) => {
  if (href === "/") return caminho === "/";
  if (href === "/mais") {
    // Na lateral, Ano/Fixos/Ajustes têm item próprio e acendem sozinhos; "Mais"
    // só responde por si. Na barra, ele responde por todos.
    return naLateral ? caminho === "/mais" : GUARDADAS_POR_MAIS.some((r) => caminho.startsWith(r));
  }
  return caminho.startsWith(href);
};

export function Casca({ children }: { children: React.ReactNode }) {
  useIniciarLoja();
  useRegistrarServiceWorker();
  const montado = useMontado();
  const caminho = usePathname();

  // A aba Hoje tem os próprios botões de lançar; nas telas de leitura, a barra.
  // No computador o botão mora na lateral e vale para todas, porque lá ele não
  // disputa espaço com nada.
  const temBarraDeLancar = caminho === "/mes" || caminho === "/ano";

  return (
    <div className="min-h-[100svh] lg:flex">
      <Lateral caminho={caminho} />

      <div className="flex min-h-[100svh] w-full flex-col lg:min-h-0 lg:flex-1">
        <div
          // As alturas vão por variável, e não por estilo em linha: estilo em
          // linha ganha de classe, e o `lg:pb-14` do computador nunca conseguia
          // anular o espaço reservado para a barra do celular.
          style={
            {
              "--fundo": temBarraDeLancar ? ALTURA.comBarra : ALTURA.semBarra,
            } as React.CSSProperties
          }
          className="flex-1 px-4 pb-[var(--fundo)] pt-4 lg:mx-auto lg:w-full lg:max-w-5xl lg:px-10 lg:pb-14 lg:pt-8"
        >
          {montado ? (
            <>
              <ConviteParaInstalar />
              {children}
            </>
          ) : (
            <Esqueleto />
          )}
        </div>
        {temBarraDeLancar && <BarraDeLancar />}
        <Situacao acimaDaBarra={temBarraDeLancar} />
        <Navegacao caminho={caminho} />
      </div>
    </div>
  );
}

/**
 * O menu do computador.
 *
 * Substitui a barra de baixo a partir de 1024 px, e não convive com ela: duas
 * navegações na mesma tela são duas respostas para "onde eu estou". Aqui cabem
 * todos os destinos, o nome do app e o botão de lançar — que na lateral vale
 * para qualquer tela, em vez de aparecer só em duas.
 */
function Lateral({ caminho }: { caminho: string }) {
  const [lancando, setLancando] = useState(false);

  return (
    <>
      <aside className="sticky top-0 hidden h-[100svh] w-[236px] shrink-0 flex-col border-r border-linha bg-cartao px-3 py-6 lg:flex">
        <p className="px-3 font-titulo text-[21px] font-semibold tracking-tight">Termômetro</p>

        <Botao tipo="primario" onClick={() => setLancando(true)} className="mx-1 mt-5">
          Lançar
        </Botao>

        <nav className="mt-6">
          <ul className="space-y-0.5">
            {DESTINOS.map(({ href, rotulo, Icone }) => {
              const aceso = aqui(href, caminho, true);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={aceso ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-folha px-3 py-2.5 text-[14.5px] ${
                      aceso ? "bg-papel font-semibold text-tinta" : "text-grafite hover:bg-papel"
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
      </aside>

      {lancando && <FolhaDeLancamento data={hoje()} aoFechar={() => setLancando(false)} />}
    </>
  );
}

/** A barra flutuante de baixo, com ícone e nome em cada aba. */
function Navegacao({ caminho }: { caminho: string }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 px-3 pt-2 lg:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
    >
      <ul className="mx-auto flex max-w-2xl rounded-[26px] bg-cartao px-1 py-1.5 shadow-cartao">
        {DESTINOS.filter((d) => d.naBarra).map(({ href, rotulo, Icone }) => {
          const aceso = aqui(href, caminho, false);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={aceso ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-[20px] py-2 text-[10px] ${
                  aceso ? "font-semibold text-tinta" : "text-fosco"
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
 * O aviso de que isto aqui ainda é o navegador, e não o app.
 *
 * A diferença é invisível para quem não trabalha com isso: a mesma tela, os
 * mesmos números, mas com uma barra de endereço em cima e a barra do Safari
 * embaixo, comendo espaço e deixando cara de site. Quem abre o endereço por um
 * link cai aqui sem perceber, e fica achando que o app é assim mesmo.
 *
 * Então o app diz, em vez de esperar que se adivinhe — e só enquanto for
 * verdade: instalado, o aviso nunca mais aparece, porque `navigator.standalone`
 * passa a ser verdadeiro. É um aviso que sabe a hora de sumir.
 */
const CHAVE_DO_CONVITE = "termometro.conviteDeInstalar";

/** A etiqueta sem a qual o iPhone abre o ícone dentro do Safari. */
const ETIQUETA_DO_MODO_APP = 'meta[name="apple-mobile-web-app-capable"]';

/**
 * Apaga tudo o que estiver guardado e busca a página de novo, do servidor.
 *
 * Existe porque o contrário — "apague o ícone e adicione de novo" — é um
 * conselho que a pessoa cumpre no escuro: se a página que ela tem na tela ainda
 * for a versão velha, o ícone novo nasce velho igual, e não há como saber antes
 * de terminar. Este botão tira a dúvida em vez de repeti-la.
 */
async function buscarAVersaoNova() {
  try {
    if ("serviceWorker" in navigator) {
      const registros = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registros.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const nomes = await caches.keys();
      await Promise.all(nomes.map((n) => caches.delete(n)));
    }
  } catch {
    // Se não deu para limpar, a recarga abaixo ainda pode resolver.
  }
  window.location.reload();
}

/**
 * O aviso de que isto aqui ainda é o navegador, e não o app.
 *
 * A diferença é invisível para quem não trabalha com isso: a mesma tela, os
 * mesmos números, mas com uma barra de endereço em cima e a do Safari embaixo.
 * Quem abre o endereço por um link cai aqui sem perceber.
 *
 * O cartão também confere, na própria página aberta, se a etiqueta que faz o
 * modo app funcionar já chegou — porque o iPhone tira uma cópia dela no instante
 * em que o ícone é criado, e um ícone feito a partir de uma página velha nasce
 * quebrado sem dar nenhum sinal. Saber disso antes de instalar é a diferença
 * entre consertar e tentar de novo.
 */
function ConviteParaInstalar() {
  const [mostrar, setMostrar] = useState(false);
  const [paginaPronta, setPaginaPronta] = useState(true);

  useEffect(() => {
    const ua = navigator.userAgent;
    // O iPad novo se apresenta como Mac; o toque é o que o entrega.
    const ehIPhoneOuIPad =
      /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);

    const comoApp =
      ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone)) ||
      window.matchMedia("(display-mode: standalone)").matches;

    let dispensado = false;
    try {
      dispensado = localStorage.getItem(CHAVE_DO_CONVITE) === "fechado";
    } catch {
      // Sem acesso ao armazenamento o aviso aparece de novo. Melhor repetir do
      // que sumir para quem ainda precisa dele.
    }

    setPaginaPronta(Boolean(document.querySelector(ETIQUETA_DO_MODO_APP)));
    setMostrar(ehIPhoneOuIPad && !comoApp && !dispensado);
  }, []);

  if (!mostrar) return null;

  function fechar() {
    setMostrar(false);
    try {
      localStorage.setItem(CHAVE_DO_CONVITE, "fechado");
    } catch {
      // Sem onde guardar, ele volta na próxima abertura. Tudo bem.
    }
  }

  return (
    <div className="mb-4 rounded-cartao bg-cartao p-4 shadow-cartao">
      <div className="flex items-start justify-between gap-3">
        <p className="font-titulo text-[17px] font-semibold tracking-tight">
          Isto ainda é o navegador
        </p>
        <button
          type="button"
          onClick={fechar}
          aria-label="Dispensar este aviso"
          className="-mr-1 -mt-1 shrink-0 rounded-full px-2 py-1 text-[13px] text-fosco"
        >
          Dispensar
        </button>
      </div>

      {paginaPronta ? (
        <>
          <p className="mt-1.5 flex items-start gap-2 text-[13.5px] leading-snug text-entrada">
            <span aria-hidden>✓</span>
            <span>
              <b>Esta página já está na versão nova.</b> Pode instalar agora — o ícone vai nascer
              certo.
            </span>
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-grafite">
            Toque em <b className="text-tinta">Compartilhar</b> (o quadradinho com a seta para cima,
            na barra de baixo) e escolha <b className="text-tinta">Adicionar à Tela de Início</b>.
            Depois abra sempre por esse ícone.
          </p>
          <p className="mt-2 text-[12.5px] leading-snug text-fosco">
            Já tem um ícone de antes? Apague ele primeiro. O iPhone copia os ajustes do app no
            instante em que o ícone é criado, e um ícone antigo carrega os ajustes antigos para
            sempre.
          </p>
        </>
      ) : (
        <>
          <p className="mt-1.5 flex items-start gap-2 text-[13.5px] leading-snug text-atencao">
            <span aria-hidden>▲</span>
            <span>
              <b>Esta página ainda é a versão antiga.</b> Se você instalar agora, o ícone nasce
              quebrado de novo.
            </span>
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-grafite">
            Toque abaixo para buscar a versão nova. Quando este aviso ficar verde, aí sim:{" "}
            <b className="text-tinta">Compartilhar</b> →{" "}
            <b className="text-tinta">Adicionar à Tela de Início</b>.
          </p>
          <Botao tipo="primario" onClick={() => void buscarAVersaoNova()} className="mt-3 w-full">
            Buscar a versão nova
          </Botao>
          <p className="mt-2 text-[12.5px] leading-snug text-fosco">
            Isso só apaga o que estava guardado para abrir sem internet. Seus lançamentos não são
            tocados — eles estão no servidor e voltam sozinhos.
          </p>
        </>
      )}
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
      <div className="h-8 w-40 rounded-folha bg-linha" />
      <div className="h-36 rounded-cartao bg-linha" />
      <div className="h-64 rounded-cartao bg-linha" />
    </div>
  );
}

/**
 * O botão que abre o lançamento, numa barra acima da navegação.
 *
 * Não é um botão comCifrao flutuando: o comCifrao pousava justamente sobre a coluna
 * do saldo — o número que a tela existe para mostrar.
 */
function BarraDeLancar() {
  const [lancando, setLancando] = useState(false);
  return (
    <>
      <div
        style={{ "--baixo": ALTURA.barraDeLancar } as React.CSSProperties}
        className="fixed inset-x-0 bottom-[var(--baixo)] z-20 px-4 lg:hidden"
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
      style={
        {
          "--baixo": acimaDaBarra ? ALTURA.avisoAcimaDaBarra : ALTURA.avisoSozinho,
        } as React.CSSProperties
      }
      className="fixed inset-x-0 bottom-[var(--baixo)] z-30 px-4 lg:bottom-5 lg:left-[236px]"
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
