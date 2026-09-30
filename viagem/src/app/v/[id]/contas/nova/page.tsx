import { exigirMembro } from "@/lib/auth";
import { membrosDaViagem } from "@/lib/consultas";
import { hoje } from "@/lib/datas";
import { Cabecalho, Pagina } from "@/componentes/pecas";
import { FormularioDeDespesa } from "@/componentes/formulario-despesa";

export default async function NovaDespesa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { eu, viagem } = await exigirMembro(id);
  const membros = await membrosDaViagem(id);
  return (
    <Pagina abas>
      <Cabecalho titulo="Nova despesa" voltar={`/v/${id}/contas`} />
      <div className="cartao p-5">
        <FormularioDeDespesa
          viagemId={id}
          membros={membros.map((m) => ({ id: m.id, nome: m.nome, cor: m.cor }))}
          euId={eu.id}
          moedaBase={viagem.moedaBase}
          cambios={(viagem.cambios as Record<string, number>) ?? {}}
          hoje={hoje()}
        />
      </div>
    </Pagina>
  );
}
