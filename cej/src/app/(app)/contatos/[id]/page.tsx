import Link from "next/link";
import { notFound } from "next/navigation";
import { apagarContato, mudarEstadoDoContato } from "../acoes";
import { contato as buscarContato } from "@/lib/consultas-contatos";
import { curto } from "@/lib/datas";
import {
  NOME_DO_ESTADO_DO_CONTATO, NOME_DO_VINCULO,
  type EstadoDoContato, type VinculoDoContato,
} from "@/lib/contatos";
import { NOME_DO_TIPO, type TipoDeAtividade } from "@/lib/tipos";
import { FormularioDeContato } from "../formulario";
import { Botao, Cartao, Selo, Sobrescrito, Subtitulo, Titulo } from "@/componentes/pecas";

export const dynamic = "force-dynamic";

const ESTADOS: EstadoDoContato[] = ["ATIVO", "DESCADASTRADO", "INVALIDO"];

export default async function FichaDoContato({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await buscarContato(id);
  if (!c) notFound();

  const recebe = c.estado === "ATIVO" && c.consentimentoEm != null;

  return (
    <>
      <div className="mb-6">
        <Sobrescrito>{NOME_DO_VINCULO[c.vinculo as VinculoDoContato]}</Sobrescrito>
        <Titulo className="mt-1">{c.nome}</Titulo>
        <p className="mt-1.5 text-[15px] text-grafite">
          {c.email}
          {c.telefone && ` · ${c.telefone}`}
          {c.instituicao && ` · ${c.instituicao}`}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <FormularioDeContato
            contato={{
              ...c,
              etiquetas: c.etiquetas.map((e) => e.etiqueta.nome).join(", "),
            }}
          />
        </div>

        <div className="space-y-5">
          <Cartao className="p-4">
            <Sobrescrito>Boletins</Sobrescrito>
            <p className={`mt-1.5 text-[15px] font-medium ${recebe ? "text-verde" : "text-ambar"}`}>
              {recebe ? "Recebe os boletins" : "Fora dos envios"}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-fosco">
              {c.estado === "DESCADASTRADO"
                ? "Esta pessoa pediu para sair da lista. Só ela mesma pode voltar, pelo link de um e-mail antigo — ou dizendo a vocês que mudou de ideia, e aí alguém marca aqui."
                : c.estado === "INVALIDO"
                  ? "O e-mail voltou. Confira o endereço e volte a situação para ativo."
                  : recebe
                    ? `Consentimento registrado em ${c.consentimentoEm!.toLocaleDateString("pt-BR")}.`
                    : "Falta marcar o consentimento, ao lado."}
            </p>
            {c.origem && (
              <p className="mt-2.5 border-t border-linha pt-2.5 text-[13px] text-grafite">
                <b>De onde veio:</b> {c.origem}
              </p>
            )}
          </Cartao>

          <Cartao className="p-4">
            <Sobrescrito>Situação</Sobrescrito>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ESTADOS.map((e) => (
                <form action={mudarEstadoDoContato} key={e}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="estado" value={e} />
                  <button
                    type="submit"
                    className={`rounded-pilula px-3 py-1.5 text-[13px] ${
                      e === c.estado
                        ? "bg-heroi font-semibold text-heroi-tinta"
                        : "bg-papel text-grafite hover:bg-linha"
                    }`}
                  >
                    {NOME_DO_ESTADO_DO_CONTATO[e]}
                  </button>
                </form>
              ))}
            </div>
          </Cartao>

          <Cartao como="section">
            <div className="border-b border-linha px-4 py-3">
              <Subtitulo>Esteve em</Subtitulo>
            </div>
            {c.participacoes.length === 0 ? (
              <p className="px-4 py-3 text-[14px] text-fosco">
                Nenhuma atividade registrada para esta pessoa.
              </p>
            ) : (
              <ul>
                {c.participacoes.map((p) => (
                  <li key={p.id} className="border-b border-linha last:border-b-0">
                    <Link href={`/atividades/${p.atividade.id}`} className="flex items-baseline gap-3 px-4 py-2.5 hover:bg-linha/60">
                      <span className="tabular w-[62px] shrink-0 text-[12.5px] text-fosco">
                        {curto(p.atividade.dia)}
                      </span>
                      <span className="min-w-0 flex-1 text-[14px]">
                        {p.atividade.titulo}
                        <span className="block text-[12px] text-fosco">
                          {NOME_DO_TIPO[p.atividade.tipo as TipoDeAtividade]}
                        </span>
                      </span>
                      {p.compareceu ? (
                        <Selo cor="var(--tinta-verde)">presente</Selo>
                      ) : (
                        <Selo cor="var(--fosco)">inscrito</Selo>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          <details className="rounded-folha px-4 py-3 text-[13.5px] text-fosco ring-1 ring-regua">
            <summary className="cursor-pointer">Apagar este contato</summary>
            <p className="mt-2 leading-relaxed">
              Some das listas e dos envios. Se a pessoa pediu para não receber mais, o certo é{" "}
              <b>Descadastrar</b> e não apagar: descadastrado, o sistema se lembra de nunca mais
              escrever para ela — inclusive se a planilha antiga for importada de novo.
            </p>
            <form action={apagarContato} className="mt-3">
              <input type="hidden" name="id" value={c.id} />
              <Botao tipo="perigo">Apagar mesmo assim</Botao>
            </form>
          </details>
        </div>
      </div>
    </>
  );
}
