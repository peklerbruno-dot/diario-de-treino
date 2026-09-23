import type { Metadata } from "next";
import { sessao } from "@/lib/auth";
import { listar } from "@/lib/conteudo";
import { AdicionarItem } from "@/componentes/edicao/Editaveis";
import { CapaPagina, CartaoNoticia } from "@/componentes/Pecas";

export const metadata: Metadata = { title: "Chadashot" };

export default async function Chadashot() {
  const equipe = !!(await sessao());
  const noticias = await listar("noticia", equipe);
  return (
    <>
      <CapaPagina sobre="Chadashot" titulo="Notícias">
        O que está acontecendo na Chazit.
      </CapaPagina>
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <AdicionarItem tipo="noticia" />
          {noticias.map((n) => (
            <CartaoNoticia key={n.id} item={n} />
          ))}
        </div>
        {!noticias.length ? <p className="font-corpo text-lg text-slate-600">Nenhuma notícia por enquanto.</p> : null}
      </section>
    </>
  );
}
