import { notFound } from "next/navigation";
import { bd } from "@/lib/bd";
import { exigirMembro } from "@/lib/auth";
import { membrosDaViagem } from "@/lib/consultas";
import { hoje } from "@/lib/datas";
import { primeiroNome } from "@/lib/cores";
import { Cabecalho, Pagina } from "@/componentes/pecas";
import { FormularioDeDespesa } from "@/componentes/formulario-despesa";
import { apagarDespesa } from "@/acoes/contas";

export default async function EditarDespesa({ params }: { params: Promise<{ id: string; despesaId: string }> }) {
  const { id, despesaId } = await params;
  const { eu, viagem } = await exigirMembro(id);
  const [despesa, ativos] = await Promise.all([
    bd.despesa.findFirst({ where: { id: despesaId, viagemId: id, apagadoEm: null }, include: { pagadores: true, partes: true, criadoPor: true } }),
    membrosDaViagem(id, true),
  ]);
  if (!despesa) notFound();
  // Quem saiu da viagem continua aparecendo nas despesas em que estava.
  const envolvidos = new Set([...despesa.pagadores, ...despesa.partes].map((p) => p.membroId));
  const membros = ativos.filter((m) => !m.saiuEm || envolvidos.has(m.id));

  return (
    <Pagina abas>
      <Cabecalho
        titulo="Despesa"
        voltar={`/v/${id}/contas`}
        subtitulo={despesa.criadoPor ? `Lançada por ${primeiroNome(despesa.criadoPor.nome)} em ${despesa.criadoEm.toLocaleDateString("pt-BR")}` : undefined}
      />
      <div className="cartao p-5">
        <FormularioDeDespesa
          viagemId={id}
          membros={membros.map((m) => ({ id: m.id, nome: m.nome, cor: m.cor }))}
          euId={eu.id}
          moedaBase={viagem.moedaBase}
          cambios={(viagem.cambios as Record<string, number>) ?? {}}
          hoje={hoje()}
          despesa={despesa}
        />
      </div>
      <form action={apagarDespesa} className="mt-6 text-center">
        <input type="hidden" name="viagemId" value={id} />
        <input type="hidden" name="despesaId" value={despesa.id} />
        <button className="text-[15px] text-vermelho">Apagar esta despesa</button>
      </form>
    </Pagina>
  );
}
