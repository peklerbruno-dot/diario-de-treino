import Link from "next/link";
import { CORES, type Cor, type Dados } from "@/lib/esquema";
import { dataPorExtenso, horaLegivel, seloData, dataCurta } from "@/lib/datas";
import { ehExterno } from "@/lib/links";
import type { ItemSite } from "@/lib/conteudo";
import { FerramentasItem } from "./edicao/Editaveis";
import { Texto, urlArquivo } from "./Texto";
import { IconeLocal, IconeRelogio } from "./Icones";

export const corDe = (c: string | undefined) => CORES[(c as Cor) in CORES ? (c as Cor) : "amarelo"].fundo;

/** Link que sabe se é do próprio site ou de fora. */
export function LinkInteligente({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  if (ehExterno(href) || href.startsWith("mailto:")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href || "/"} className={className}>
      {children}
    </Link>
  );
}

export const classeBotao = {
  claro:
    "inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-titulo text-base font-black text-marinho shadow-lg transition hover:-translate-y-0.5 hover:bg-amarelo",
  escuro:
    "inline-flex items-center gap-2 rounded-full bg-marinho px-6 py-3.5 font-titulo text-base font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-azul",
  contorno:
    "inline-flex items-center gap-2 rounded-full border-2 border-marinho px-5 py-3 font-titulo text-[15px] font-bold text-marinho transition hover:bg-marinho hover:text-white",
};

/** Título de seção: sobretítulo pequeno e o título grande em Montserrat Black. */
export function TituloSecao({ sobre, children, claro = false }: { sobre?: string; children: React.ReactNode; claro?: boolean }) {
  return (
    <div>
      {sobre ? (
        <p className={`font-titulo text-sm font-bold uppercase tracking-[0.18em] ${claro ? "text-celeste" : "text-azul"}`}>{sobre}</p>
      ) : null}
      <h2 className={`mt-1 font-titulo text-3xl font-black uppercase leading-[1.05] tracking-tight sm:text-4xl ${claro ? "text-white" : "text-marinho"}`}>
        {children}
      </h2>
    </div>
  );
}

/** Capa das páginas internas. */
export function CapaPagina({ titulo, sobre, children }: { titulo: string; sobre?: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-marinho text-white">
      <Formas />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
        {sobre ? <p className="font-titulo text-sm font-bold uppercase tracking-[0.18em] text-celeste">{sobre}</p> : null}
        <h1 className="mt-2 font-titulo text-4xl font-black uppercase leading-none tracking-tight sm:text-6xl">{titulo}</h1>
        {children ? <div className="mt-5 max-w-2xl font-corpo text-lg text-white/85">{children}</div> : null}
      </div>
    </section>
  );
}

/** As formas coloridas de fundo, nas cores de apoio do manual. */
export function Formas() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-azul/60" />
      <span className="absolute -bottom-24 right-40 h-48 w-48 rotate-12 rounded-[2.5rem] bg-rosa/25" />
      <span className="absolute right-10 top-1/2 hidden h-20 w-20 rounded-full bg-verde/40 sm:block" />
      <span className="absolute -left-10 bottom-6 h-24 w-24 rounded-full border-[10px] border-turquesa/40" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cartões
// ---------------------------------------------------------------------------

type Posicao = { primeiro?: boolean; ultimo?: boolean };

export function CartaoEvento({ item, passado = false }: { item: ItemSite; passado?: boolean }) {
  const d = item.dados;
  const selo = seloData(d.data ?? "");
  return (
    <article className={`relative flex flex-col overflow-hidden rounded-3xl border-2 border-marinho/10 bg-white shadow-sm ${passado ? "opacity-75" : ""}`}>
      <FerramentasItem tipo="evento" id={item.id} dados={d} oculto={item.oculto} />
      {d.imagem ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={urlArquivo(d.imagem)} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
      ) : null}
      <div className="flex flex-1 gap-4 p-5">
        <div className="flex h-[4.75rem] w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-marinho text-white">
          <span className="font-titulo text-[11px] font-bold uppercase text-celeste">{selo.mes}</span>
          <span className="font-titulo text-3xl font-black leading-none">{selo.dia}</span>
          <span className="mt-0.5 font-corpo text-[10px] uppercase text-white/70">{selo.semana}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-titulo text-lg font-black leading-tight text-marinho">{d.titulo}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-corpo text-sm text-slate-600">
            <span className="inline-flex items-center gap-1">
              <IconeRelogio className="h-4 w-4 text-azul" />
              {dataPorExtenso(d.data ?? "", false)}
              {d.hora ? `, ${horaLegivel(d.hora)}` : ""}
            </span>
            {d.local ? (
              <span className="inline-flex items-center gap-1">
                <IconeLocal className="h-4 w-4 text-azul" />
                {d.local}
              </span>
            ) : null}
          </p>
          {d.texto ? <Texto valor={d.texto} className="prosa mt-3 font-corpo text-[15px] leading-relaxed text-slate-700" /> : null}
          {d.linkInscricao && !passado ? (
            <LinkInteligente href={d.linkInscricao} className={`${classeBotao.escuro} mt-4 px-5 py-2.5 text-sm`}>
              Inscreva-se →
            </LinkInteligente>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function CartaoNoticia({ item }: { item: ItemSite }) {
  const d = item.dados;
  return (
    <article className={`group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-2 ring-marinho/10`}>
      <FerramentasItem tipo="noticia" id={item.id} dados={d} oculto={item.oculto} />
      <Link href={`/chadashot/${item.id}`} className="flex flex-1 flex-col">
        {d.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlArquivo(d.imagem)} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid aspect-[16/10] w-full place-items-center bg-celeste">
            <span className="font-titulo text-5xl font-black text-marinho/20">חדשות</span>
          </div>
        )}
        <div className="flex flex-1 flex-col p-5">
          <p className="font-corpo text-sm font-bold text-azul">{dataCurta(d.data ?? "")}</p>
          <h3 className="mt-1 font-titulo text-xl font-black leading-tight text-marinho group-hover:underline">{d.titulo}</h3>
          {d.resumo ? <p className="mt-2 line-clamp-3 font-corpo text-[15px] leading-relaxed text-slate-600">{d.resumo}</p> : null}
          <span className="mt-auto pt-4 font-titulo text-sm font-bold text-marinho">Ler mais →</span>
        </div>
      </Link>
    </article>
  );
}

export function CartaoShichva({ item, primeiro, ultimo }: { item: ItemSite } & Posicao) {
  const d = item.dados;
  return (
    <article className={`relative flex flex-col overflow-hidden rounded-3xl text-marinho`} style={{ background: corDe(d.cor) }}>
      <FerramentasItem tipo="shichva" id={item.id} dados={d} oculto={item.oculto} primeiro={primeiro} ultimo={ultimo} />
      {d.imagem ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={urlArquivo(d.imagem)} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
      ) : null}
      <div className="flex flex-1 flex-col p-6">
        {d.idade ? (
          <span className="self-start rounded-full bg-marinho px-3 py-1 font-titulo text-xs font-bold uppercase tracking-wider text-white">{d.idade}</span>
        ) : null}
        <h3 className="mt-3 font-titulo text-2xl font-black uppercase tracking-tight">{d.nome}</h3>
        {d.texto ? <Texto valor={d.texto} className="prosa mt-2 font-corpo text-[15px] leading-relaxed text-marinho/85" /> : null}
      </div>
    </article>
  );
}

export function CartaoPilar({ item, primeiro, ultimo }: { item: ItemSite } & Posicao) {
  const d = item.dados;
  return (
    <article className={`relative overflow-hidden rounded-3xl text-marinho`} style={{ background: corDe(d.cor) }}>
      <FerramentasItem tipo="pilar" id={item.id} dados={d} oculto={item.oculto} primeiro={primeiro} ultimo={ultimo} />
      <div className="p-6">
      <h3 className="font-titulo text-xl font-black uppercase tracking-tight">{d.titulo}</h3>
      {d.texto ? <Texto valor={d.texto} className="prosa mt-2 font-corpo text-[15px] leading-relaxed text-marinho/85" /> : null}
      </div>
    </article>
  );
}

/** Para passar à lista: primeiro e último, para desligar as setas. */
export const posicao = (i: number, total: number): Posicao => ({ primeiro: i === 0, ultimo: i === total - 1 });

export type { Dados };
