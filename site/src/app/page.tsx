import Link from "next/link";
import { sessao } from "@/lib/auth";
import { agenda, lerBlocos, listar } from "@/lib/conteudo";
import { BlocoEditavel, AdicionarItem, Vazio } from "@/componentes/edicao/Editaveis";
import { Simbolo } from "@/componentes/Logo";
import { Texto, urlArquivo } from "@/componentes/Texto";
import {
  CartaoEvento,
  CartaoNoticia,
  CartaoPilar,
  LinkInteligente,
  TituloSecao,
  classeBotao,
  corDe,
  posicao,
} from "@/componentes/Pecas";

export default async function Inicio() {
  const equipe = !!(await sessao());
  const [blocos, pilares, { proximos }, noticias, shichvot, fotos] = await Promise.all([
    lerBlocos(["inicio.capa", "inicio.chamada"]),
    listar("pilar", equipe),
    agenda(equipe),
    listar("noticia", equipe),
    listar("shichva", equipe),
    listar("foto", equipe),
  ]);
  const capa = blocos["inicio.capa"];
  const chamada = blocos["inicio.chamada"];

  return (
    <>
      {/* Capa */}
      <BlocoEditavel chave="inicio.capa" dados={capa}>
        <section className="relative overflow-hidden bg-marinho text-white">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <span className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-azul/50" />
            <span className="absolute bottom-10 left-[45%] hidden h-16 w-16 rounded-full bg-rosa md:block" />
            <span className="absolute -bottom-16 left-1/4 h-40 w-40 rotate-12 rounded-[2rem] bg-turquesa/30" />
            <span className="absolute right-6 top-8 h-10 w-10 rounded-full bg-verde/80" />
          </div>
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 md:grid-cols-[1.15fr_1fr] md:pb-24 md:pt-20">
            <div>
              <h1 className="font-titulo text-[2.6rem] font-black uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                {capa.titulo}
              </h1>
              {capa.subtitulo ? (
                <Texto valor={capa.subtitulo} className="prosa mt-6 max-w-xl font-corpo text-lg leading-relaxed text-white/85 sm:text-xl" />
              ) : null}
              <div className="mt-8 flex flex-wrap gap-3">
                {capa.textoBotao ? (
                  <LinkInteligente href={capa.linkBotao || "/contato"} className={classeBotao.claro}>
                    {capa.textoBotao} →
                  </LinkInteligente>
                ) : null}
                <Link href="/a-chazit" className="inline-flex items-center rounded-full border-2 border-white/40 px-6 py-3.5 font-titulo text-base font-bold text-white transition hover:border-white hover:bg-white/10">
                  Conheça a Chazit
                </Link>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-md">
              {capa.imagem ? (
                <div className="relative">
                  <span aria-hidden="true" className="absolute -inset-3 rotate-3 rounded-[2.5rem] bg-azul" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urlArquivo(capa.imagem)} alt="" className="relative aspect-[4/5] w-full rounded-[2.2rem] object-cover shadow-2xl" />
                </div>
              ) : (
                <div className="relative grid aspect-square place-items-center">
                  <span aria-hidden="true" className="absolute inset-4 rounded-full bg-white/10" />
                  <Simbolo variante="branco" className="relative w-3/4 drop-shadow-2xl" />
                </div>
              )}
            </div>
          </div>
        </section>
      </BlocoEditavel>

      {/* Pilares */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:pt-20">
        <TituloSecao sobre="No que acreditamos">Nossos pilares</TituloSecao>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {pilares.map((p, i) => (
            <CartaoPilar key={p.id} item={p} {...posicao(i, pilares.length)} />
          ))}
          <AdicionarItem tipo="pilar" />
        </div>
      </section>

      {/* Agenda */}
      <section className="mx-auto max-w-6xl px-4 pt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <TituloSecao sobre="Agenda">Próximas atividades</TituloSecao>
          <Link href="/agenda" className={classeBotao.contorno}>Ver agenda completa →</Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {proximos.slice(0, 3).map((e) => (
            <CartaoEvento key={e.id} item={e} />
          ))}
          <AdicionarItem tipo="evento" />
        </div>
        {!proximos.length ? (
          <p className="mt-2 font-corpo text-slate-600">
            Em breve, novas atividades. Siga a gente nas redes para ficar sabendo!
          </p>
        ) : null}
      </section>

      {/* Shichvot */}
      {shichvot.length ? (
        <section className="mt-20 bg-amarelo/60 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <TituloSecao sobre="Para todas as idades">Shichvot</TituloSecao>
              <Link href="/shichvot" className={classeBotao.contorno}>Conheça cada shichvá →</Link>
            </div>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {shichvot.map((s) => (
                <li key={s.id}>
                  <Link href="/shichvot" className="block h-full rounded-3xl p-6 text-marinho ring-marinho/0 transition hover:-translate-y-1 hover:ring-4 hover:ring-marinho/20" style={{ background: corDe(s.dados.cor) }}>
                    <span className="font-titulo text-xs font-bold uppercase tracking-wider text-marinho/70">{s.dados.idade}</span>
                    <span className="mt-1 block font-titulo text-2xl font-black uppercase tracking-tight">{s.dados.nome}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Chadashot */}
      <section className="mx-auto max-w-6xl px-4 pt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <TituloSecao sobre="Chadashot">Notícias</TituloSecao>
          <Link href="/chadashot" className={classeBotao.contorno}>Todas as notícias →</Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {noticias.slice(0, 3).map((n) => (
            <CartaoNoticia key={n.id} item={n} />
          ))}
          <AdicionarItem tipo="noticia" />
        </div>
      </section>

      {/* Fotos */}
      {fotos.length ? (
        <section className="mx-auto max-w-6xl px-4 pt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <TituloSecao sobre="Momentos">Fotos</TituloSecao>
            <Link href="/fotos" className={classeBotao.contorno}>Ver todas →</Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {fotos.slice(0, 8).map((f) => (
              <li key={f.id}>
                <Link href="/fotos" className="block overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urlArquivo(f.dados.imagem ?? "")} alt={f.dados.legenda ?? ""} loading="lazy" className="aspect-square w-full object-cover transition duration-300 hover:scale-105" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="mx-auto max-w-6xl px-4 pt-12">
          <Vazio>
            As fotos que vocês adicionarem em <Link href="/fotos" className="font-bold underline">Fotos</Link> aparecem aqui também.
          </Vazio>
        </div>
      )}

      {/* Convite */}
      <div className="mx-auto max-w-6xl px-4 pt-20">
        <BlocoEditavel chave="inicio.chamada" dados={chamada} className="rounded-[2.5rem]">
          <section className="relative overflow-hidden rounded-[2.5rem] bg-azul px-6 py-14 text-center text-white sm:px-12">
            <span aria-hidden="true" className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-marinho/30" />
            <span aria-hidden="true" className="absolute -bottom-14 -right-6 h-48 w-48 rounded-full bg-celeste/40" />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="font-titulo text-4xl font-black uppercase tracking-tight sm:text-5xl">{chamada.titulo}</h2>
              {chamada.texto ? <Texto valor={chamada.texto} className="prosa mt-4 font-corpo text-lg leading-relaxed text-white/90" /> : null}
              {chamada.textoBotao ? (
                <LinkInteligente href={chamada.linkBotao || "/contato"} className={`${classeBotao.claro} mt-8`}>
                  {chamada.textoBotao} →
                </LinkInteligente>
              ) : null}
            </div>
          </section>
        </BlocoEditavel>
      </div>
    </>
  );
}
