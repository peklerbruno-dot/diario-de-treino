import { exigirMembro } from "@/lib/auth";
import { membrosDaViagem } from "@/lib/consultas";
import { hoje } from "@/lib/datas";
import { Cabecalho, Pagina } from "@/componentes/pecas";
import { FormularioDeAcerto } from "@/componentes/formulario-acerto";

export default async function Acertar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ de?: string; para?: string; valor?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const { eu, viagem } = await exigirMembro(id);
  const membros = await membrosDaViagem(id, true);
  return (
    <Pagina abas>
      <Cabecalho titulo="Acertar" voltar={`/v/${id}/contas`} subtitulo="Registre um Pix, dinheiro ou transferência entre duas pessoas." />
      <div className="cartao p-5">
        <FormularioDeAcerto
          viagemId={id}
          membros={membros.filter((m) => !m.saiuEm || m.id === q.de || m.id === q.para).map((m) => ({ id: m.id, nome: m.id === eu.id ? `${m.nome} (você)` : m.nome }))}
          de={q.de ?? eu.id}
          para={q.para ?? ""}
          valor={q.valor ? (Number(q.valor) / 100).toFixed(2).replace(".", ",") : ""}
          moedaBase={viagem.moedaBase}
          hoje={hoje()}
        />
      </div>
    </Pagina>
  );
}
