import Link from "next/link";
import { BotaoDeImprimir } from "./imprimir";
import { atividadesEntre } from "@/lib/consultas";
import { comMaiuscula, porBarras, porExtenso } from "@/lib/datas";
import { periodoPedido } from "@/lib/periodo";
import { entraNoRelatorio, resumir } from "@/lib/relatorio";
import { NOME_DO_TIPO } from "@/lib/tipos";
import { Aviso, Cartao, Chamada, Sobrescrito, Subtitulo, Titulo } from "@/componentes/pecas";

export const dynamic = "force-dynamic";

/**
 * O relatório de atividades.
 *
 * Só entra o que está marcado como **realizada**: um relatório que somasse
 * ideias seria um relatório que ninguém pode assinar. É por isso que a tela
 * avisa, em vez de omitir, quando há atividades do período que ficaram para
 * trás sem alguém marcar — o número que falta é sempre pior que o número
 * explicado.
 */
export default async function Relatorio({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const { de, ate } = periodoPedido(await searchParams);

  const todas = await atividadesEntre(de, ate);
  const realizadas = todas.filter(entraNoRelatorio);
  const emAberto = todas.filter((a) => !entraNoRelatorio(a) && a.estado !== "CANCELADA");

  const resumo = resumir(
    realizadas.map((a) => ({ ...a, responsavelNome: a.responsavel?.nome ?? null })),
  );

  return (
    <>
      <div className="mb-6">
        <Sobrescrito>Centro de Estudos Judaicos · USP</Sobrescrito>
        <Titulo className="mt-1">Relatório de atividades</Titulo>
        <Chamada>
          De {porExtenso(de)} a {porExtenso(ate)}.
        </Chamada>
      </div>

      <form className="nao-imprime mb-5 flex flex-wrap items-end gap-2.5">
        <label>
          <span className="sobrescrito">De</span>
          <input
            type="date" name="de" defaultValue={de}
            className="mt-1 block rounded-folha border border-regua bg-cartao px-3 py-2 outline-none focus:border-realce"
          />
        </label>
        <label>
          <span className="sobrescrito">Até</span>
          <input
            type="date" name="ate" defaultValue={ate}
            className="mt-1 block rounded-folha border border-regua bg-cartao px-3 py-2 outline-none focus:border-realce"
          />
        </label>
        <button
          type="submit"
          className="min-h-[42px] rounded-folha bg-heroi px-4 text-[15px] font-semibold text-heroi-tinta"
        >
          Gerar
        </button>
        <BotaoDeImprimir />
        <a
          href={`/api/relatorio?de=${de}&ate=${ate}`}
          className="inline-flex min-h-[42px] items-center rounded-folha bg-cartao px-4 text-[15px] shadow-baixa hover:bg-linha"
        >
          Baixar planilha
        </a>
      </form>

      {emAberto.length > 0 && (
        <div className="nao-imprime mb-5">
          <Aviso tom="atencao">
            <b>{emAberto.length}</b>{" "}
            {emAberto.length === 1 ? "atividade deste período está" : "atividades deste período estão"}{" "}
            em aberto e {emAberto.length === 1 ? "ficou" : "ficaram"} de fora destas contas. Se
            {emAberto.length === 1 ? " ela aconteceu" : " elas aconteceram"}, marque como realizada
            para entrar no relatório:{" "}
            {emAberto.slice(0, 6).map((a, i) => (
              <span key={a.id}>
                {i > 0 && ", "}
                <Link href={`/atividades/${a.id}`} className="text-realce underline">
                  {a.titulo}
                </Link>
              </span>
            ))}
            {emAberto.length > 6 && ` e mais ${emAberto.length - 6}`}.
          </Aviso>
        </div>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Numero rotulo="Atividades realizadas" valor={resumo.total} />
        <Numero
          rotulo="Público somado"
          valor={resumo.publicoTotal}
          detalhe={
            resumo.total === 0
              ? undefined
              : `${resumo.quantasInformaramPublico} de ${resumo.total} informaram`
          }
        />
        <Numero
          rotulo="Convidados"
          valor={resumo.convidadosDistintos}
          detalhe={
            resumo.quantosConvidados !== resumo.convidadosDistintos
              ? `${resumo.quantosConvidados} participações`
              : undefined
          }
        />
        <Numero rotulo="Tipos diferentes" valor={resumo.porTipo.length} />
      </div>

      {resumo.total === 0 ? (
        <Aviso>
          Nenhuma atividade marcada como realizada neste período. O relatório se alimenta do que a
          equipe cadastra ao longo do ano — não há nada a montar aqui até lá.
        </Aviso>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <Cartao como="section">
              <h2 className="sobrescrito border-b border-linha px-4 py-2.5">Por tipo</h2>
              <ul>
                {resumo.porTipo.map((t) => (
                  <Barra key={t.tipo} rotulo={t.nome} valor={t.quantidade} total={resumo.total} />
                ))}
              </ul>
            </Cartao>

            <Cartao como="section">
              <h2 className="sobrescrito border-b border-linha px-4 py-2.5">Ao longo do período</h2>
              <ul>
                {resumo.porMes.map((m) => (
                  <Barra key={m.mes} rotulo={m.nome} valor={m.quantidade} total={resumo.total} />
                ))}
              </ul>
            </Cartao>
          </div>

          <Cartao como="section">
            <h2 className="sobrescrito border-b border-linha px-4 py-2.5">
              As atividades, uma a uma
            </h2>
            <ul>
              {realizadas.map((a) => (
                <li key={a.id} className="border-b border-linha px-4 py-3.5 last:border-b-0">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="tabular text-[13px] text-fosco">
                      {porBarras(a.dia)}
                      {a.diaFinal && ` a ${porBarras(a.diaFinal)}`}
                    </span>
                    <Subtitulo className="!text-[16px]">{a.titulo}</Subtitulo>
                    <span className="text-[13px] text-fosco">{NOME_DO_TIPO[a.tipo]}</span>
                  </div>

                  <p className="mt-1 text-[13.5px] leading-relaxed text-grafite">
                    {[
                      a.local,
                      a.convidados.length
                        ? `Com ${a.convidados.map((c) => (c.instituicao ? `${c.nome} (${c.instituicao})` : c.nome)).join(", ")}`
                        : null,
                      a.parceria ? `Parceria: ${a.parceria}` : null,
                      a.publicoPresente != null ? `${a.publicoPresente} presentes` : null,
                      a.responsavel ? `Responsável: ${a.responsavel.nome}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </Cartao>
        </div>
      )}
    </>
  );
}

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: number; detalhe?: string }) {
  return (
    <Cartao className="p-4">
      <Sobrescrito>{rotulo}</Sobrescrito>
      <p className="tabular mt-1 font-titulo text-[32px] font-semibold leading-none">{valor}</p>
      {detalhe && <p className="mt-1.5 text-[12.5px] text-fosco">{detalhe}</p>}
    </Cartao>
  );
}

/**
 * A barra é proporção, não enfeite: ler "4" e "11" numa coluna não diz o mesmo
 * que ver uma barra com o triplo do tamanho da outra.
 */
function Barra({ rotulo, valor, total }: { rotulo: string; valor: number; total: number }) {
  const parte = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <li className="border-b border-linha px-4 py-2.5 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14.5px]">{comMaiuscula(rotulo)}</span>
        <span className="tabular text-[14.5px] font-semibold">{valor}</span>
      </div>
      <div className="mt-1.5 h-[5px] overflow-hidden rounded-pilula bg-linha">
        <div className="h-full rounded-pilula bg-realce" style={{ width: `${parte}%` }} />
      </div>
    </li>
  );
}
