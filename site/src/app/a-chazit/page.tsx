import type { Metadata } from "next";
import { sessao } from "@/lib/auth";
import { lerBlocos, listar } from "@/lib/conteudo";
import { AdicionarItem, BlocoEditavel, FerramentasItem, Vazio } from "@/componentes/edicao/Editaveis";
import { CapaPagina, CartaoPilar, TituloSecao, posicao } from "@/componentes/Pecas";
import { Texto, urlArquivo } from "@/componentes/Texto";
import type { Dados } from "@/lib/esquema";
import type { ChaveBloco } from "@/lib/esquema";

export const metadata: Metadata = { title: "A Chazit" };

export default async function AChazit() {
  const equipe = !!(await sessao());
  const [blocos, pilares, documentos] = await Promise.all([
    lerBlocos(["chazit.quemSomos", "chazit.historia"]),
    listar("pilar", equipe),
    listar("documento", equipe),
  ]);

  return (
    <>
      <CapaPagina sobre="Quem somos" titulo="A Chazit" />

      <Bloco chave="chazit.quemSomos" dados={blocos["chazit.quemSomos"]} />

      <section className="bg-marinho/[0.04] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <TituloSecao sobre="No que acreditamos">Nossos pilares</TituloSecao>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pilares.map((p, i) => (
              <CartaoPilar key={p.id} item={p} {...posicao(i, pilares.length)} />
            ))}
            <AdicionarItem tipo="pilar" />
          </div>
        </div>
      </section>

      <Bloco chave="chazit.historia" dados={blocos["chazit.historia"]} invertido />

      <section className="mx-auto max-w-6xl px-4 pt-4">
        {documentos.length ? <TituloSecao sobre="Para consultar">Nossos documentos</TituloSecao> : null}
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {documentos.map((d, i) => {
            const href = d.dados.arquivo ? urlArquivo(d.dados.arquivo) : d.dados.link;
            return (
              <li key={d.id} className={`relative overflow-hidden rounded-3xl bg-white ring-2 ring-marinho/10`}>
                <FerramentasItem tipo="documento" id={d.id} dados={d.dados} oculto={d.oculto} {...posicao(i, documentos.length)} />
                <a href={href || "#"} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 p-5 hover:bg-amarelo/40">
                  <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-marinho text-xl text-white">📄</span>
                  <span>
                    <span className="block font-titulo text-lg font-black text-marinho">{d.dados.titulo}</span>
                    {d.dados.descricao ? <span className="mt-1 block font-corpo text-[15px] text-slate-600">{d.dados.descricao}</span> : null}
                    <span className="mt-2 block font-titulo text-sm font-bold text-azul">Abrir documento →</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 max-w-xl">
          <Vazio>Estatuto, carta de princípios, decisões políticas: os documentos que vocês adicionarem aparecem aqui.</Vazio>
          <div className="mt-4">
            <AdicionarItem tipo="documento" />
          </div>
        </div>
      </section>
    </>
  );
}

function Bloco({ chave, dados, invertido = false }: { chave: ChaveBloco; dados: Dados; invertido?: boolean }) {
  return (
    <BlocoEditavel chave={chave} dados={dados}>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className={`grid items-center gap-10 ${dados.imagem ? "md:grid-cols-2" : ""}`}>
          <div className={invertido && dados.imagem ? "md:order-2" : ""}>
            <TituloSecao>{dados.titulo}</TituloSecao>
            {dados.texto ? <Texto valor={dados.texto} className="prosa mt-6 max-w-3xl font-corpo text-lg leading-relaxed text-slate-700" /> : null}
          </div>
          {dados.imagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urlArquivo(dados.imagem)} alt="" className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-xl" />
          ) : null}
        </div>
      </section>
    </BlocoEditavel>
  );
}
