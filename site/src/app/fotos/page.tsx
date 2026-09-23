import type { Metadata } from "next";
import { sessao } from "@/lib/auth";
import { listar } from "@/lib/conteudo";
import { AdicionarItem } from "@/componentes/edicao/Editaveis";
import { CapaPagina } from "@/componentes/Pecas";
import { Galeria } from "@/componentes/Galeria";

export const metadata: Metadata = { title: "Fotos" };

export default async function Fotos() {
  const equipe = !!(await sessao());
  const fotos = await listar("foto", equipe);
  return (
    <>
      <CapaPagina sobre="Momentos" titulo="Fotos">
        Peulot, machanot e tudo o que a gente vive junto.
      </CapaPagina>
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <div className="mb-5 max-w-sm">
          <AdicionarItem tipo="foto" />
        </div>
        {fotos.length ? <Galeria fotos={fotos} /> : <p className="font-corpo text-lg text-slate-600">As fotos chegam em breve.</p>}
      </section>
    </>
  );
}
