import Link from "next/link";
import { bd } from "@/lib/bd";
import { exigirMembro } from "@/lib/auth";
import { contasDaViagem } from "@/lib/consultas";
import { curta, diferencaEmDias, hoje, periodo, porExtenso } from "@/lib/datas";
import { formatar } from "@/lib/dinheiro";
import { infoCategoria, linkDaRotaDoDia } from "@/lib/lugares";
import { primeiroNome } from "@/lib/cores";
import { Cabecalho, Pagina, Secao } from "@/componentes/pecas";

export default async function Visao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { eu, viagem } = await exigirMembro(id);
  const dia = hoje();

  const antes = dia < viagem.inicio;
  const depois = dia > viagem.fim;
  // Antes da viagem mostra o primeiro dia; durante, o de hoje.
  const diaEmFoco = antes || depois ? viagem.inicio : dia;

  const [itens, contas, maisQueridos, pendentes, totalLugares, enquetesAbertas, minhasTarefas, totalDocs] = await Promise.all([
    bd.itemRoteiro.findMany({
      where: { viagemId: id, dia: diaEmFoco },
      include: { lugar: true },
      orderBy: [{ hora: "asc" }, { ordem: "asc" }],
    }),
    contasDaViagem(id),
    bd.lugar.findMany({
      where: { viagemId: id, apagadoEm: null, fomos: false },
      include: { _count: { select: { votos: true } } },
      orderBy: [{ votos: { _count: "desc" } }, { criadoEm: "desc" }],
      take: 4,
    }),
    bd.importacao.count({ where: { viagemId: id, estado: { in: ["pronta", "falhou"] } } }),
    bd.lugar.count({ where: { viagemId: id, apagadoEm: null } }),
    bd.enquete.findMany({
      where: { viagemId: id, encerrada: false },
      select: { id: true, pergunta: true, votos: { where: { membroId: eu.id }, select: { membroId: true } } },
      orderBy: { criadoEm: "desc" },
    }),
    bd.tarefa.findMany({ where: { viagemId: id, feita: false, responsavelId: eu.id }, orderBy: [{ prazo: "asc" }, { criadoEm: "asc" }], take: 4 }),
    bd.documento.count({ where: { viagemId: id, apagadoEm: null } }),
  ]);
  const semMeuVoto = enquetesAbertas.filter((e) => e.votos.length === 0);

  const meu = contas.saldos.find((s) => s.membroId === eu.id);
  const falta = diferencaEmDias(dia, viagem.inicio);
  const rota = linkDaRotaDoDia(itens.filter((i) => i.lugar).map((i) => i.lugar!));
  const nome = (mid: string) => primeiroNome(contas.membros.find((m) => m.id === mid)?.nome ?? "?");
  const minhas = contas.simplificadas.filter((t) => t.deId === eu.id || t.paraId === eu.id);

  return (
    <Pagina abas>
      <Cabecalho
        titulo={viagem.nome}
        subtitulo={
          <>
            {periodo(viagem.inicio, viagem.fim)}
            {antes && ` · faltam ${falta} ${falta === 1 ? "dia" : "dias"}`}
            {!antes && !depois && ` · dia ${diferencaEmDias(viagem.inicio, dia) + 1}`}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <Link href={`/v/${id}/adicionar`} className="cartao flex flex-col gap-1 p-4">
          <span className="text-2xl" aria-hidden>📲</span>
          <span className="font-semibold">Adicionar lugar</span>
          <span className="text-[13px] text-fosco">Link, reel, print ou nome</span>
        </Link>
        <Link href={`/v/${id}/contas/nova`} className="cartao flex flex-col gap-1 p-4">
          <span className="text-2xl" aria-hidden>💸</span>
          <span className="font-semibold">Nova despesa</span>
          <span className="text-[13px] text-fosco">Quem pagou, e como divide</span>
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[12px]">
        {[
          { href: `/v/${id}/votacoes`, emoji: "🗳️", nome: "Votações", n: semMeuVoto.length },
          { href: `/v/${id}/tarefas`, emoji: "✅", nome: "Tarefas", n: minhasTarefas.length },
          { href: `/v/${id}/documentos`, emoji: "📄", nome: "Documentos", n: 0, total: totalDocs },
          { href: `/v/${id}/contas/orcamento`, emoji: "🎯", nome: "Orçamento", n: 0 },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="cartao relative flex flex-col items-center gap-1 px-1 py-3">
            <span className="text-2xl" aria-hidden>{a.emoji}</span>
            <span className="font-medium text-grafite">{a.nome}</span>
            {a.n > 0 && (
              <span className="absolute right-1.5 top-1.5 min-w-[18px] rounded-full bg-realce px-1 text-[11px] font-bold leading-[18px] text-realce-tinta">{a.n}</span>
            )}
          </Link>
        ))}
      </div>

      {semMeuVoto.length > 0 && (
        <Link href={`/v/${id}/votacoes#${semMeuVoto[0].id}`} className="mt-3 flex items-center justify-between gap-2 rounded-cartao bg-realce-fraco px-4 py-3">
          <span className="min-w-0 truncate">🗳️ Falta seu voto: <strong>{semMeuVoto[0].pergunta}</strong></span>
          <span className="shrink-0 font-semibold text-realce">Votar →</span>
        </Link>
      )}

      {minhasTarefas.length > 0 && (
        <Secao titulo="Suas tarefas" acao={<Link href={`/v/${id}/tarefas?minhas=1`} className="text-[15px] font-semibold text-realce">Ver todas</Link>}>
          <ul className="cartao divide-y divide-linha">
            {minhasTarefas.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3 text-[15px]">
                <span aria-hidden>☐</span>
                <span className="min-w-0 flex-1">{t.texto}</span>
                {t.prazo && <span className={`shrink-0 text-[13px] ${t.prazo < dia ? "font-semibold text-vermelho" : "text-fosco"}`}>até {curta(t.prazo)}</span>}
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {pendentes > 0 && (
        <Link href={`/v/${id}/caixa`} className="mt-3 flex items-center justify-between rounded-cartao bg-realce-fraco px-4 py-3">
          <span><strong>{pendentes}</strong> {pendentes === 1 ? "post lido esperando" : "posts lidos esperando"} revisão</span>
          <span className="font-semibold text-realce">Revisar →</span>
        </Link>
      )}

      <Secao titulo="Seu saldo" acao={<Link href={`/v/${id}/contas`} className="text-[15px] font-semibold text-realce">Contas</Link>}>
        <div className="cartao p-4">
          {!meu || meu.liquido === 0 ? (
            <p className="text-[17px]"><strong>Tudo certo</strong> — você não deve nem tem a receber.</p>
          ) : meu.liquido > 0 ? (
            <p className="text-[17px]">Você tem <strong className="text-verde">{formatar(meu.liquido, viagem.moedaBase)}</strong> a receber.</p>
          ) : (
            <p className="text-[17px]">Você deve <strong className="text-vermelho">{formatar(-meu.liquido, viagem.moedaBase)}</strong>.</p>
          )}
          {minhas.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[15px] text-grafite">
              {minhas.map((t, i) => (
                <li key={i}>
                  {t.deId === eu.id ? `Você paga ${nome(t.paraId)}` : `${nome(t.deId)} te paga`}: {formatar(t.valor, viagem.moedaBase)}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[13px] text-fosco">O grupo já gastou {formatar(contas.totalDoGrupo, viagem.moedaBase)}.</p>
        </div>
      </Secao>

      <Secao
        titulo={antes || depois ? `Primeiro dia · ${porExtenso(diaEmFoco)}` : `Hoje · ${porExtenso(diaEmFoco)}`}
        acao={<Link href={`/v/${id}/roteiro#${diaEmFoco}`} className="text-[15px] font-semibold text-realce">Roteiro</Link>}
      >
        <div className="cartao divide-y divide-linha">
          {itens.length === 0 ? (
            <p className="p-4 text-[15px] text-fosco">Nada marcado para esse dia ainda.</p>
          ) : (
            itens.map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-12 shrink-0 text-[14px] font-semibold tabular-nums text-fosco">{i.hora || "—"}</span>
                <span className="min-w-0 flex-1 truncate">{i.titulo}</span>
              </div>
            ))
          )}
          {rota && (
            <a href={rota} target="_blank" rel="noreferrer" className="block px-4 py-3 text-center font-semibold text-realce">
              🧭 Rota do dia no Google Maps
            </a>
          )}
        </div>
      </Secao>

      <Secao
        titulo="O grupo quer ir"
        acao={<Link href={`/v/${id}/lugares`} className="text-[15px] font-semibold text-realce">{totalLugares} lugares</Link>}
      >
        {maisQueridos.length === 0 ? (
          <div className="cartao p-4 text-[15px] text-fosco">
            Nenhum lugar ainda. Mande o primeiro reel em <Link href={`/v/${id}/adicionar`} className="font-semibold text-realce">Adicionar</Link>.
          </div>
        ) : (
          <ul className="cartao divide-y divide-linha">
            {maisQueridos.map((l) => (
              <li key={l.id}>
                <Link href={`/v/${id}/lugares/${l.id}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl" aria-hidden>{infoCategoria(l.categoria).emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{l.nome}</span>
                    {l.cidade && <span className="block truncate text-[13px] text-fosco">{l.cidade}</span>}
                  </span>
                  {l._count.votos > 0 && <span className="text-[14px] text-realce">♥ {l._count.votos}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </Pagina>
  );
}
