import Link from "next/link";
import { anosComAtividade, buscarAtividades } from "@/lib/consultas";
import { hoje, nomeDoMesCompleto, mesDe } from "@/lib/datas";
import { ESTADOS_DA_ATIVIDADE, NOME_DO_ESTADO } from "@/lib/tipos";
import { LinhaDeAtividade } from "@/componentes/itens";
import { BotaoLink, Cartao, Topo, Vazio } from "@/componentes/pecas";

export const dynamic = "force-dynamic";

/**
 * A lista de atividades.
 *
 * Ordenada da mais recente para a mais antiga e agrupada por mês. Poderia ser
 * uma tabela; não é, porque uma tabela de vinte colunas é o formato em que se
 * guarda coisa e não o formato em que se lê. O que a equipe precisa ver de
 * relance é quando, o quê e em que pé está.
 */
export default async function Atividades({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; ano?: string; busca?: string; tudo?: string }>;
}) {
  const filtro = await searchParams;
  const apenasAbertas = !filtro.tudo && !filtro.estado && !filtro.ano && !filtro.busca;

  const [lista, anos] = await Promise.all([
    buscarAtividades({ ...filtro, apenasAbertas }),
    anosComAtividade(),
  ]);

  const porMes = agruparPorMes(lista);

  return (
    <>
      <Topo
        titulo="Atividades"
        chamada="Tudo o que o Centro faz: palestras, cursos, oficinas, congressos. Cadastre ainda como ideia — é o cadastro que faz a atividade existir para a equipe inteira."
        acao={<BotaoLink href="/atividades/nova" tipo="primario">Nova atividade</BotaoLink>}
      />

      <form className="nao-imprime mb-5 flex flex-wrap items-end gap-2.5">
        <label className="min-w-[180px] flex-1">
          <span className="sobrescrito">Procurar no título</span>
          <input
            name="busca"
            defaultValue={filtro.busca ?? ""}
            placeholder="exílio, Talmude, congresso…"
            className="mt-1 w-full rounded-folha border border-regua bg-cartao px-3 py-2 outline-none focus:border-realce"
          />
        </label>

        <label>
          <span className="sobrescrito">Situação</span>
          <select
            name="estado"
            defaultValue={filtro.estado ?? ""}
            className="mt-1 rounded-folha border border-regua bg-cartao px-3 py-2 outline-none focus:border-realce"
          >
            <option value="">Todas</option>
            {ESTADOS_DA_ATIVIDADE.map((e) => (
              <option key={e} value={e}>
                {NOME_DO_ESTADO[e]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sobrescrito">Ano</span>
          <select
            name="ano"
            defaultValue={filtro.ano ?? ""}
            className="mt-1 rounded-folha border border-regua bg-cartao px-3 py-2 outline-none focus:border-realce"
          >
            <option value="">Todos</option>
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <input type="hidden" name="tudo" value="1" />
        <button
          type="submit"
          className="min-h-[40px] rounded-folha bg-cartao px-4 text-[15px] shadow-baixa hover:bg-linha"
        >
          Filtrar
        </button>
        {!apenasAbertas && (
          <Link href="/atividades" className="pb-2.5 text-[14px] text-realce hover:underline">
            limpar
          </Link>
        )}
      </form>

      {apenasAbertas && lista.length > 0 && (
        <p className="nao-imprime mb-3 text-[13.5px] text-fosco">
          Mostrando o que ainda está em aberto.{" "}
          <Link href="/atividades?tudo=1" className="text-realce hover:underline">
            Ver também as realizadas e canceladas
          </Link>
          .
        </p>
      )}

      {lista.length === 0 ? (
        <Vazio acao={<BotaoLink href="/atividades/nova" tipo="primario">Cadastrar a primeira</BotaoLink>}>
          {filtro.busca || filtro.estado || filtro.ano
            ? "Nenhuma atividade com esses filtros."
            : "Nenhuma atividade cadastrada ainda."}
        </Vazio>
      ) : (
        <div className="space-y-5">
          {porMes.map(({ mes, itens }) => (
            <Cartao key={mes} como="section">
              <h2 className="sobrescrito border-b border-linha px-4 py-2.5">
                {nomeDoMesCompleto(mes)}
                {mes === mesDe(hoje()) && <span className="ml-2 text-realce">· este mês</span>}
              </h2>
              <ul>
                {itens.map((a) => (
                  <LinhaDeAtividade key={a.id} atividade={a} />
                ))}
              </ul>
            </Cartao>
          ))}
        </div>
      )}
    </>
  );
}

function agruparPorMes<T extends { dia: string }>(itens: T[]) {
  const caixas = new Map<string, T[]>();
  for (const item of itens) {
    const mes = mesDe(item.dia);
    if (!caixas.has(mes)) caixas.set(mes, []);
    caixas.get(mes)!.push(item);
  }
  return [...caixas.entries()].map(([mes, itens]) => ({ mes, itens }));
}
