import { exigirMembro } from "@/lib/auth";
import { lerOrcamento } from "@/lib/orcamento";
import { Cabecalho, Pagina } from "@/componentes/pecas";
import { FormularioDeOrcamento } from "@/componentes/formulario-orcamento";

export default async function PaginaOrcamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { viagem } = await exigirMembro(id);
  return (
    <Pagina abas>
      <Cabecalho titulo="Orçamento" voltar={`/v/${id}/contas`} subtitulo="Quanto o grupo combinou gastar." />
      <div className="cartao p-5">
        <FormularioDeOrcamento viagemId={id} orcamento={lerOrcamento(viagem.orcamento)} moeda={viagem.moedaBase} />
      </div>
    </Pagina>
  );
}
