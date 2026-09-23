import type { Metadata } from "next";
import { sessao } from "@/lib/auth";
import { agenda } from "@/lib/conteudo";
import { AdicionarItem } from "@/componentes/edicao/Editaveis";
import { CapaPagina, CartaoEvento, TituloSecao } from "@/componentes/Pecas";

export const metadata: Metadata = { title: "Agenda" };

export default async function Agenda() {
  const equipe = !!(await sessao());
  const { proximos, passados } = await agenda(equipe);

  return (
    <>
      <CapaPagina sobre="Agenda" titulo="Próximas atividades">
        Peulot, machanot, seminários e eventos da Chazit Hanoar São Paulo.
      </CapaPagina>
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {proximos.map((e) => (
            <CartaoEvento key={e.id} item={e} />
          ))}
          <AdicionarItem tipo="evento" />
        </div>
        {!proximos.length ? (
          <p className="font-corpo text-lg text-slate-600">Nenhuma atividade marcada por enquanto. Volte logo!</p>
        ) : null}
      </section>
      {passados.length ? (
        <section className="mx-auto max-w-6xl px-4 pt-20">
          <TituloSecao sobre="Já aconteceu">Atividades anteriores</TituloSecao>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {passados.slice(0, 12).map((e) => (
              <CartaoEvento key={e.id} item={e} passado />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
