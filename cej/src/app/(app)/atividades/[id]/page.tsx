import Link from "next/link";
import { notFound } from "next/navigation";
import { adicionarConvidado, apagarAtividade, mudarEstadoDaAtividade, removerConvidado } from "../acoes";
import { atividade as buscarAtividade, equipeAtiva } from "@/lib/consultas";
import { comDiaDaSemana, comMaiuscula, porExtenso } from "@/lib/datas";
import { linkDoGoogle } from "@/lib/agenda";
import { ESTADOS_DA_ATIVIDADE, EXPLICACAO_DO_ESTADO, NOME_DO_ESTADO, NOME_DO_TIPO } from "@/lib/tipos";
import { ItemDeEncaminhamento, NovoEncaminhamento } from "@/componentes/encaminhamentos";
import { BotoesDeEstado } from "@/componentes/estados";
import {
  Botao, BotaoLink, Cartao, Selo, SeloDoEstado, Sobrescrito, Subtitulo, Titulo,
} from "@/componentes/pecas";

export const dynamic = "force-dynamic";

export default async function FichaDaAtividade({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [a, equipe] = await Promise.all([buscarAtividade(id), equipeAtiva()]);
  if (!a) notFound();

  const quando = a.diaFinal
    ? `De ${porExtenso(a.dia)} a ${porExtenso(a.diaFinal)}`
    : comMaiuscula(comDiaDaSemana(a.dia));

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <Sobrescrito>{NOME_DO_TIPO[a.tipo]}</Sobrescrito>
          <SeloDoEstado estado={a.estado} />
        </div>
        <Titulo className="mt-1.5">{a.titulo}</Titulo>
        <p className="mt-1.5 text-[15px] text-grafite">
          {quando}
          {a.hora && `, às ${a.hora}`}
          {a.horaFinal && ` — ${a.horaFinal}`}
          {a.local && ` · ${a.local}`}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          {a.resumo && (
            <Cartao como="section" className="p-5">
              <Sobrescrito>Ementa</Sobrescrito>
              <p className="escrito mt-2 max-w-leitura text-[15.5px] leading-relaxed">{a.resumo}</p>
            </Cartao>
          )}

          <Cartao como="section">
            <div className="border-b border-linha px-4 py-3">
              <Subtitulo>Quem fala</Subtitulo>
            </div>
            {a.convidados.length === 0 ? (
              <p className="px-4 py-3 text-[14px] text-fosco">Ninguém cadastrado ainda.</p>
            ) : (
              <ul>
                {a.convidados.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-baseline gap-3 border-b border-linha px-4 py-2.5 last:border-b-0"
                  >
                    <span className="flex-1 text-[15px]">
                      {c.nome}
                      {c.instituicao && <span className="text-[13px] text-fosco"> · {c.instituicao}</span>}
                    </span>
                    {c.funcao && <Selo>{c.funcao}</Selo>}
                    <form action={removerConvidado} className="nao-imprime">
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        aria-label={`Remover ${c.nome}`}
                        className="rounded-pilula px-2 py-1 text-[12px] text-fosco hover:bg-linha hover:text-vermelho"
                      >
                        remover
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <form
              action={adicionarConvidado}
              className="nao-imprime flex flex-wrap items-end gap-2 border-t border-linha bg-papel px-4 py-3"
            >
              <input type="hidden" name="atividadeId" value={a.id} />
              <label className="min-w-[160px] flex-[2]">
                <span className="sobrescrito">Nome</span>
                <input name="nome" required className="mt-1 w-full rounded-folha border border-regua bg-cartao px-3 py-2 outline-none focus:border-realce" />
              </label>
              <label className="min-w-[140px] flex-1">
                <span className="sobrescrito">Instituição</span>
                <input name="instituicao" className="mt-1 w-full rounded-folha border border-regua bg-cartao px-3 py-2 outline-none focus:border-realce" />
              </label>
              <label className="min-w-[110px]">
                <span className="sobrescrito">Função</span>
                <input name="funcao" placeholder="palestrante" className="mt-1 w-full rounded-folha border border-regua bg-cartao px-3 py-2 outline-none focus:border-realce" />
              </label>
              <Botao>Acrescentar</Botao>
            </form>
          </Cartao>

          <Cartao como="section">
            <div className="border-b border-linha px-4 py-3">
              <Subtitulo>Encaminhamentos</Subtitulo>
              <p className="mt-0.5 text-[13px] text-grafite">O que falta fazer para esta atividade acontecer.</p>
            </div>
            {a.encaminhamentos.length === 0 ? (
              <p className="px-4 py-3 text-[14px] text-fosco">Nada anotado ainda.</p>
            ) : (
              <ul>
                {a.encaminhamentos.map((e) => (
                  <ItemDeEncaminhamento key={e.id} item={e} />
                ))}
              </ul>
            )}
            <NovoEncaminhamento equipe={equipe} atividadeId={a.id} />
          </Cartao>

          {a.avaliacao && (
            <Cartao como="section" className="p-5">
              <Sobrescrito>Avaliação</Sobrescrito>
              <p className="escrito mt-2 max-w-leitura text-[15px] leading-relaxed">{a.avaliacao}</p>
            </Cartao>
          )}
        </div>

        <div className="space-y-5">
          <Cartao como="section" className="nao-imprime p-4">
            <Sobrescrito>Em que pé está</Sobrescrito>
            <BotoesDeEstado
              acao={mudarEstadoDaAtividade}
              id={a.id}
              atual={a.estado}
              opcoes={ESTADOS_DA_ATIVIDADE}
              nomes={NOME_DO_ESTADO}
            />
            <p className="mt-2.5 text-[13px] leading-relaxed text-fosco">
              {EXPLICACAO_DO_ESTADO[a.estado]}
            </p>
          </Cartao>

          <Cartao como="section" className="p-4">
            <Sobrescrito>Ficha</Sobrescrito>
            <dl className="mt-2 space-y-2 text-[14px]">
              <Item rotulo="Responsável">{a.responsavel?.nome ?? "—"}</Item>
              <Item rotulo="Público-alvo">{a.publicoAlvo ?? "—"}</Item>
              <Item rotulo="Parceria">{a.parceria ?? "—"}</Item>
              <Item rotulo="Público presente">
                {a.publicoPresente != null ? `${a.publicoPresente} pessoas` : "— ainda não informado"}
              </Item>
            </dl>
          </Cartao>

          {(a.pastaNoDrive || a.linkDeInscricao || a.linkDaDivulgacao) && (
            <Cartao como="section" className="nao-imprime p-4">
              <Sobrescrito>Links</Sobrescrito>
              <ul className="mt-2 space-y-1.5 text-[14px]">
                {a.pastaNoDrive && <Externo href={a.pastaNoDrive}>Pasta no Google Drive</Externo>}
                {a.linkDeInscricao && <Externo href={a.linkDeInscricao}>Formulário de inscrição</Externo>}
                {a.linkDaDivulgacao && <Externo href={a.linkDaDivulgacao}>Arte da divulgação</Externo>}
              </ul>
            </Cartao>
          )}

          <Cartao como="section" className="nao-imprime p-4">
            <Sobrescrito>Agenda</Sobrescrito>
            <p className="mt-2 text-[13.5px] leading-relaxed text-grafite">
              Esta atividade já está no calendário do Centro. Este link serve para mandar o evento a
              quem não faz parte da equipe — um palestrante, um professor convidado.
            </p>
            <a
              href={linkDoGoogle({
                uid: a.id,
                titulo: a.titulo,
                dia: a.dia,
                hora: a.hora,
                diaFinal: a.diaFinal,
                horaFinal: a.horaFinal,
                local: a.local,
                descricao: a.resumo,
                cancelado: a.estado === "CANCELADA",
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-[40px] items-center rounded-folha bg-papel px-3.5 text-[14px] hover:bg-linha"
            >
              Adicionar ao Google Agenda ↗
            </a>
          </Cartao>

          <div className="nao-imprime flex flex-wrap gap-2">
            <BotaoLink href={`/atividades/${a.id}/editar`} tipo="primario">
              Editar
            </BotaoLink>
            <BotaoLink href="/atividades">Voltar à lista</BotaoLink>
          </div>

          <details className="nao-imprime rounded-folha px-4 py-3 text-[13.5px] text-fosco ring-1 ring-regua">
            <summary className="cursor-pointer">Apagar esta atividade</summary>
            <p className="mt-2 leading-relaxed">
              Ela sai das listas e do calendário, mas continua guardada no banco — nada se perde de
              verdade. Para trazê-la de volta é preciso alguém com acesso ao banco.
            </p>
            <form action={apagarAtividade} className="mt-3">
              <input type="hidden" name="id" value={a.id} />
              <Botao tipo="perigo">Apagar mesmo assim</Botao>
            </form>
          </details>
        </div>
      </div>
    </>
  );
}

function Item({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-linha pb-2 last:border-b-0">
      <dt className="text-grafite">{rotulo}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function Externo({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} target="_blank" rel="noopener noreferrer" className="text-realce hover:underline">
        {children} ↗
      </Link>
    </li>
  );
}
