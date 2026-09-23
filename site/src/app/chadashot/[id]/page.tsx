import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sessao } from "@/lib/auth";
import { lerItem } from "@/lib/conteudo";
import { dataPorExtenso } from "@/lib/datas";
import { FerramentasItem } from "@/componentes/edicao/Editaveis";
import { Texto, urlArquivo } from "@/componentes/Texto";

type P = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { id } = await params;
  const n = await lerItem("noticia", id, false);
  return n ? { title: n.dados.titulo, description: n.dados.resumo } : {};
}

export default async function Noticia({ params }: P) {
  const { id } = await params;
  const equipe = !!(await sessao());
  const n = await lerItem("noticia", id, equipe);
  if (!n) notFound();
  const d = n.dados;

  return (
    <article className="mx-auto max-w-3xl px-4 pt-10">
      <Link href="/chadashot" className="font-titulo text-sm font-bold text-azul hover:underline">
        ← Todas as notícias
      </Link>
      <div className="relative mt-6 overflow-hidden rounded-3xl">
        <FerramentasItem tipo="noticia" id={n.id} dados={d} oculto={n.oculto} />
      </div>
      <p className="mt-4 font-corpo font-bold text-azul">{dataPorExtenso(d.data ?? "")}</p>
      <h1 className="mt-2 font-titulo text-4xl font-black leading-tight tracking-tight text-marinho sm:text-5xl">{d.titulo}</h1>
      {d.resumo ? <p className="mt-4 font-corpo text-xl leading-relaxed text-slate-600">{d.resumo}</p> : null}
      {d.imagem ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={urlArquivo(d.imagem)} alt="" className="mt-8 w-full rounded-3xl object-cover" />
      ) : null}
      {d.texto ? <Texto valor={d.texto} className="prosa mt-8 font-corpo text-lg leading-relaxed text-slate-800" /> : null}
    </article>
  );
}
