import { notFound } from "next/navigation";
import { alternarPresenca, apagarReuniao, mudarEstadoDaReuniao, salvarTexto } from "../acoes";
import { equipeAtiva, reuniao as buscarReuniao } from "@/lib/consultas";
import { comDiaDaSemana, comMaiuscula } from "@/lib/datas";
import { linkDoGoogle } from "@/lib/agenda";
import { NOME_DO_ESTADO_DA_REUNIAO, type EstadoDaReuniao } from "@/lib/tipos";
import { ItemDeEncaminhamento, NovoEncaminhamento } from "@/componentes/encaminhamentos";
import { BotoesDeEstado } from "@/componentes/estados";
import {
  AreaDeTexto, Botao, BotaoLink, Cartao, SeloDaReuniao, Sobrescrito, Subtitulo, Titulo,
} from "@/componentes/pecas";

export const dynamic = "force-dynamic";

const ESTADOS: EstadoDaReuniao[] = ["AGENDADA", "REALIZADA", "CANCELADA"];

/**
 * A página da reunião.
 *
 * Pauta e ata são dois blocos de texto que gravam cada um por si. Ficam sempre
 * em modo de edição, sem botão de "editar" antes: a ata se escreve enquanto a
 * reunião acontece, e um clique a mais é o clique em que a frase se perde.
 *
 * A lista de presença fica ao lado, e não dentro da ata, porque é ela que
 * escreve sozinha a linha "presentes: fulano, beltrano" que toda ata tem.
 */
export default async function PaginaDaReuniao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r, equipe] = await Promise.all([buscarReuniao(id), equipeAtiva()]);
  if (!r) notFound();

  const presentes = r.presencas.filter((p) => p.compareceu);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Sobrescrito>Reunião</Sobrescrito>
            <SeloDaReuniao estado={r.estado} />
          </div>
          <Titulo className="mt-1.5">{r.titulo}</Titulo>
          <p className="mt-1.5 text-[15px] text-grafite">
            {comMaiuscula(comDiaDaSemana(r.dia))}
            {r.hora && `, às ${r.hora}`}
            {r.local && ` · ${r.local}`}
            {r.convocou && ` · convocada por ${r.convocou.nome}`}
          </p>
        </div>
        <div className="nao-imprime flex gap-2">
          <BotaoLink href={`/reunioes/${r.id}/editar`}>Editar</BotaoLink>
          <a
            href={linkDoGoogle({
              uid: r.id, titulo: r.titulo, dia: r.dia, hora: r.hora,
              diaFinal: null, horaFinal: null, local: r.local,
              descricao: r.pauta, cancelado: r.estado === "CANCELADA", prefixo: "Reunião",
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[42px] items-center rounded-folha bg-cartao px-4 text-[15px] shadow-baixa hover:bg-linha"
          >
            Google Agenda ↗
          </a>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <BlocoDeTexto
            id={r.id}
            campo="pauta"
            titulo="Pauta"
            chamada="Escrita antes. Uma pauta que só existe na cabeça de quem convocou faz a reunião durar o dobro."
            valor={r.pauta}
            placeholder={"1. Calendário do segundo semestre\n2. Orçamento da mostra\n3. Convites pendentes"}
          />

          <BlocoDeTexto
            id={r.id}
            campo="ata"
            titulo="Ata"
            chamada="Escrita depois. Daqui a dois anos, é o único lugar onde vai estar por que se decidiu o que se decidiu."
            valor={r.ata}
            linhas={12}
          />

          <Cartao como="section">
            <div className="border-b border-linha px-4 py-3">
              <Subtitulo>Encaminhamentos</Subtitulo>
              <p className="mt-0.5 text-[13px] text-grafite">
                O que sobra da reunião. Cada linha com o quê, quem e até quando — é o que aparece no
                painel de cada pessoa.
              </p>
            </div>
            {r.encaminhamentos.length === 0 ? (
              <p className="px-4 py-3 text-[14px] text-fosco">Nada anotado ainda.</p>
            ) : (
              <ul>
                {r.encaminhamentos.map((e) => (
                  <ItemDeEncaminhamento key={e.id} item={e} />
                ))}
              </ul>
            )}
            <NovoEncaminhamento equipe={equipe} reuniaoId={r.id} />
          </Cartao>
        </div>

        <div className="space-y-5">
          <Cartao como="section">
            <div className="border-b border-linha px-4 py-3">
              <Subtitulo>Presença</Subtitulo>
              <p className="mt-0.5 text-[13px] text-grafite">
                {presentes.length === 0
                  ? "Ninguém marcado ainda."
                  : `${presentes.length} de ${r.presencas.length} convocados.`}
              </p>
            </div>
            <ul className="nao-imprime">
              {r.presencas
                .slice()
                .sort((a, b) => a.pessoa.nome.localeCompare(b.pessoa.nome, "pt-BR"))
                .map((p) => (
                  <li key={p.pessoaId} className="border-b border-linha last:border-b-0">
                    <form action={alternarPresenca}>
                      <input type="hidden" name="reuniaoId" value={r.id} />
                      <input type="hidden" name="pessoaId" value={p.pessoaId} />
                      <button
                        type="submit"
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-linha/60"
                      >
                        <span
                          aria-hidden
                          className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[6px] border text-[12px] font-bold ${
                            p.compareceu ? "border-verde bg-verde text-white" : "border-regua"
                          }`}
                        >
                          {p.compareceu ? "✓" : ""}
                        </span>
                        <span className="text-[15px]">{p.pessoa.nome}</span>
                        <span className="sr-only">
                          {p.compareceu ? "marcar como ausente" : "marcar como presente"}
                        </span>
                      </button>
                    </form>
                  </li>
                ))}
            </ul>

            {/* Na versão impressa da ata, a presença vira a linha de sempre. */}
            <p className="so-impresso px-4 py-3 text-[14px]">
              <b>Presentes:</b>{" "}
              {presentes.map((p) => p.pessoa.nome).join(", ") || "—"}
            </p>
          </Cartao>

          <Cartao como="section" className="nao-imprime p-4">
            <Sobrescrito>Situação</Sobrescrito>
            <BotoesDeEstado
              acao={mudarEstadoDaReuniao}
              id={r.id}
              atual={r.estado}
              opcoes={ESTADOS}
              nomes={NOME_DO_ESTADO_DA_REUNIAO}
            />
          </Cartao>

          <details className="nao-imprime rounded-folha px-4 py-3 text-[13.5px] text-fosco ring-1 ring-regua">
            <summary className="cursor-pointer">Apagar esta reunião</summary>
            <p className="mt-2 leading-relaxed">
              A ata e os encaminhamentos saem das listas junto. Continua tudo guardado no banco, mas
              fora do alcance de quem usa o sistema.
            </p>
            <form action={apagarReuniao} className="mt-3">
              <input type="hidden" name="id" value={r.id} />
              <Botao tipo="perigo">Apagar mesmo assim</Botao>
            </form>
          </details>
        </div>
      </div>
    </>
  );
}

function BlocoDeTexto({
  id,
  campo,
  titulo,
  chamada,
  valor,
  linhas = 8,
  placeholder,
}: {
  id: string;
  campo: "pauta" | "ata";
  titulo: string;
  chamada: string;
  valor: string | null;
  linhas?: number;
  placeholder?: string;
}) {
  return (
    <Cartao como="section" className="p-5">
      <Subtitulo>{titulo}</Subtitulo>
      <p className="nao-imprime mt-0.5 max-w-leitura text-[13px] leading-relaxed text-grafite">
        {chamada}
      </p>

      <form action={salvarTexto} className="nao-imprime mt-3">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="campo" value={campo} />
        <AreaDeTexto nome="valor" valor={valor} linhas={linhas} placeholder={placeholder} />
        <div className="mt-2.5">
          <Botao>Guardar {titulo.toLocaleLowerCase("pt-BR")}</Botao>
        </div>
      </form>

      {/* Impresso, o campo vira texto: uma ata em caixa de formulário não é ata. */}
      {valor && <p className="escrito so-impresso mt-2 text-[15px] leading-relaxed">{valor}</p>}
    </Cartao>
  );
}
