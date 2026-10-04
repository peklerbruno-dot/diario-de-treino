import { exigirMembro } from "@/lib/auth";
import { membrosDaViagem } from "@/lib/consultas";
import { hoje } from "@/lib/datas";
import { Cabecalho, Pagina } from "@/componentes/pecas";
import { FormularioDeAcerto } from "@/componentes/formulario-acerto";
import { BlocoPix } from "@/componentes/pix";
import { codigoPix } from "@/lib/pix";
import { formatar } from "@/lib/dinheiro";

export default async function Acertar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ de?: string; para?: string; valor?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const { eu, viagem } = await exigirMembro(id);
  const membros = await membrosDaViagem(id, true);
  const recebedor = membros.find((m) => m.id === q.para);
  const centavos = Number(q.valor) > 0 ? Math.round(Number(q.valor)) : undefined;
  // O Pix é em reais: o código com valor só sai se a viagem conta em BRL.
  const emReais = viagem.moedaBase === "BRL";
  return (
    <Pagina abas>
      <Cabecalho titulo="Acertar" voltar={`/v/${id}/contas`} subtitulo="Registre um Pix, dinheiro ou transferência entre duas pessoas." />
      {recebedor?.pix && (
        <div className="mb-4">
          <BlocoPix
            nome={recebedor.nome.split(" ")[0]}
            chave={recebedor.pix}
            codigo={codigoPix({ chave: recebedor.pix, nome: recebedor.nome, centavos: emReais ? centavos : undefined, descricao: viagem.nome })}
            valor={centavos ? formatar(centavos, viagem.moedaBase) : ""}
          />
          <p className="mt-2 text-[13px] text-fosco">Depois de pagar no banco, registre aqui embaixo para o saldo zerar.</p>
        </div>
      )}
      {recebedor && !recebedor.pix && (
        <p className="mb-4 text-[14px] text-fosco">{recebedor.nome.split(" ")[0]} ainda não cadastrou a chave Pix (fica em Grupo).</p>
      )}
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
