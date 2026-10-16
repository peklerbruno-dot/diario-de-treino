import { Secao, Titulo } from "@/componentes/pecas";
import { ListaDeTarefas, NovaTarefa } from "@/componentes/tarefas";
import { tarefasAgrupadas } from "@/lib/tarefas";

export const dynamic = "force-dynamic";

export default async function Tarefas() {
  const g = await tarefasAgrupadas();
  const total = g.atrasadas.length + g.hoje.length + g.semana.length + g.depois.length + g.semData.length;
  return (
    <div className="mx-auto max-w-3xl">
      <Titulo sub={`${total} em aberto · as suas e as que vieram dos e-mails`}>Tarefas</Titulo>
      <div className="mb-8">
        <NovaTarefa />
      </div>
      {g.atrasadas.length > 0 && (
        <Secao titulo="Atrasadas" conta={g.atrasadas.length}>
          <ListaDeTarefas itens={g.atrasadas} />
        </Secao>
      )}
      <Secao titulo="Hoje" conta={g.hoje.length}>
        <ListaDeTarefas itens={g.hoje} vazio="Nada com prazo para hoje." />
      </Secao>
      {g.semana.length > 0 && (
        <Secao titulo="Próximos 7 dias" conta={g.semana.length}>
          <ListaDeTarefas itens={g.semana} />
        </Secao>
      )}
      {g.depois.length > 0 && (
        <Secao titulo="Mais adiante" conta={g.depois.length}>
          <ListaDeTarefas itens={g.depois} />
        </Secao>
      )}
      {g.semData.length > 0 && (
        <Secao titulo="Sem data" conta={g.semData.length}>
          <ListaDeTarefas itens={g.semData} />
        </Secao>
      )}
      {g.feitas.length > 0 && (
        <Secao titulo="Feitas nos últimos dias">
          <ListaDeTarefas itens={g.feitas} />
        </Secao>
      )}
    </div>
  );
}
