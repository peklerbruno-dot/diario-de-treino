import type { Metadata } from "next";
import { sessao } from "@/lib/auth";
import { lerBlocos, listar } from "@/lib/conteudo";
import { AdicionarItem, BlocoEditavel } from "@/componentes/edicao/Editaveis";
import { CapaPagina, CartaoShichva, posicao } from "@/componentes/Pecas";
import { Texto } from "@/componentes/Texto";

export const metadata: Metadata = { title: "Shichvot" };

export default async function Shichvot() {
  const equipe = !!(await sessao());
  const [blocos, shichvot] = await Promise.all([lerBlocos(["shichvot.intro"]), listar("shichva", equipe)]);
  const intro = blocos["shichvot.intro"];

  return (
    <>
      <BlocoEditavel chave="shichvot.intro" dados={intro}>
        <CapaPagina sobre="Tochnit" titulo={intro.titulo ?? "Shichvot"}>
          {intro.texto ? <Texto valor={intro.texto} className="prosa" /> : null}
        </CapaPagina>
      </BlocoEditavel>
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shichvot.map((s, i) => (
            <CartaoShichva key={s.id} item={s} {...posicao(i, shichvot.length)} />
          ))}
          <AdicionarItem tipo="shichva" />
        </div>
      </section>
    </>
  );
}
