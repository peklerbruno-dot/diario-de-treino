import { Secao, Titulo } from "@/componentes/pecas";
import { ListaDeTarefas, NovaTarefa } from "@/componentes/tarefas";
import { tarefasAgrupadas } from "@/lib/tarefas";

export const dynamic = "force-dynamic";

export default async function Tarefas() {
  const g = await tarefasAgrupadas();
  const grupos = [
    { titulo: "Atrasadas", itens: g.atrasadas },
    { titulo: "Hoje", itens: g.hoje },
    { titulo: "Próximos 7 dias", itens: g.semana },
    { titulo: "Mais adiante", itens: g.depois },
    { titulo: "Sem data", itens: g.semData },
    { titulo: "Feitas há pouco", itens: g.feitas },
  ].filter((x) => x.itens.length);
  return (
    <div className="mx-auto max-w-[680px]">
      <Titulo>Tarefas</Titulo>
      <div className="mb-10">
        <NovaTarefa />
      </div>
      {grupos.map((x) => (
        <Secao key={x.titulo} titulo={x.titulo}>
          <ListaDeTarefas itens={x.itens} />
        </Secao>
      ))}
      {!grupos.length && <p className="text-[15px] text-fosco">Nenhuma tarefa. Escreva uma acima.</p>}
    </div>
  );
}
