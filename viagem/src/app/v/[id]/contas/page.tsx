import Link from "next/link";
import { exigirMembro } from "@/lib/auth";
import { contasDaViagem } from "@/lib/consultas";
import { curta } from "@/lib/datas";
import { formatar } from "@/lib/dinheiro";
import { infoCategoriaDeDespesa, naBase } from "@/lib/contas";
import { primeiroNome } from "@/lib/cores";
import { Avatar, Cabecalho, Pagina, Secao, Vazio } from "@/componentes/pecas";
import { apagarPagamento } from "@/acoes/contas";

export default async function Contas({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ver?: string }> }) {
  const { id } = await params;
  const { ver = "simples" } = await searchParams;
  const { eu, viagem } = await exigirMembro(id);
  const c = await contasDaViagem(id);
  const base = viagem.moedaBase;
  const membro = (mid: string) => c.membros.find((m) => m.id === mid);
  const nome = (mid: string) => (mid === eu.id ? "Você" : primeiroNome(membro(mid)?.nome ?? "?"));
  const transferencias = ver === "pares" ? c.porPar : c.simplificadas;

  // Lista única, despesas e acertos juntos, do mais novo para o mais velho.
  const movimentos = [
    ...c.despesas.map((d) => ({ tipo: "despesa" as const, data: d.data, criado: d.criadoEm.getTime(), d })),
    ...c.pagamentos.map((p) => ({ tipo: "pagamento" as const, data: p.data, criado: p.criadoEm.getTime(), p })),
  ].sort((a, b) => b.data.localeCompare(a.data) || b.criado - a.criado);

  return (
    <Pagina abas>
      <Cabecalho titulo="Contas" subtitulo={`O grupo gastou ${formatar(c.totalDoGrupo, base)}`} />

      <div className="grid grid-cols-2 gap-2">
        <Link href={`/v/${id}/contas/nova`} className="botao">+ Despesa</Link>
        <Link href={`/v/${id}/contas/acertar`} className="botao-leve">Acertar</Link>
      </div>

      <Secao titulo="Saldos">
        <ul className="cartao divide-y divide-linha">
          {c.saldos
            .filter((s) => !membro(s.membroId)?.saiuEm || s.liquido !== 0)
            .map((s) => {
              const m = membro(s.membroId);
              return (
                <li key={s.membroId} className="flex items-center gap-3 px-4 py-3">
                  <Avatar nome={m?.nome ?? "?"} cor={m?.cor ?? "#999"} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{nome(s.membroId)}</span>
                    <span className="block text-[13px] text-fosco">
                      pagou {formatar(s.pagou, base)} · consumiu {formatar(s.consumiu, base)}
                    </span>
                  </span>
                  <span className="text-right">
                    {s.liquido === 0 ? (
                      <span className="text-[14px] text-fosco">quite</span>
                    ) : s.liquido > 0 ? (
                      <>
                        <span className="block text-[12px] text-verde">recebe</span>
                        <span className="font-semibold tabular-nums text-verde">{formatar(s.liquido, base)}</span>
                      </>
                    ) : (
                      <>
                        <span className="block text-[12px] text-vermelho">deve</span>
                        <span className="font-semibold tabular-nums text-vermelho">{formatar(-s.liquido, base)}</span>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
        </ul>
      </Secao>

      <Secao
        titulo="Quem paga quem"
        acao={
          <div className="flex gap-1 text-[13px]">
            <Link href={`/v/${id}/contas`} className={`pilula whitespace-nowrap px-2.5 py-1 ${ver !== "pares" ? "pilula-ativa" : ""}`}>Simplificado</Link>
            <Link href={`/v/${id}/contas?ver=pares`} className={`pilula whitespace-nowrap px-2.5 py-1 ${ver === "pares" ? "pilula-ativa" : ""}`}>Por pessoa</Link>
          </div>
        }
      >
        {transferencias.length === 0 ? (
          <div className="cartao p-4 text-[15px] text-fosco">Ninguém deve nada. 🎉</div>
        ) : (
          <ul className="cartao divide-y divide-linha">
            {transferencias.map((t, i) => {
              const minha = t.deId === eu.id || t.paraId === eu.id;
              return (
                <li key={i} className={`flex items-center gap-3 px-4 py-3 ${minha ? "bg-realce-fraco/60" : ""}`}>
                  <span className="min-w-0 flex-1">
                    <strong>{nome(t.deId)}</strong> paga <strong>{nome(t.paraId)}</strong>
                  </span>
                  <span className="font-semibold tabular-nums">{formatar(t.valor, base)}</span>
                  <Link
                    href={`/v/${id}/contas/acertar?de=${t.deId}&para=${t.paraId}&valor=${t.valor}`}
                    className="text-[14px] font-semibold text-realce"
                  >
                    Acertar
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-[13px] text-fosco">
          {ver === "pares"
            ? "Cada dívida como ela nasceu, compensando as de mão dupla."
            : "O menor número de transferências que zera todo mundo — como o “simplificar dívidas” do Splitwise."}
        </p>
      </Secao>

      {c.porCategoria.length > 0 && (
        <Secao titulo="Para onde foi">
          <ul className="cartao divide-y divide-linha">
            {c.porCategoria.map(([cat, valor]) => {
              const info = infoCategoriaDeDespesa(cat);
              const pct = c.totalDoGrupo ? Math.round((valor / c.totalDoGrupo) * 100) : 0;
              return (
                <li key={cat} className="px-4 py-2.5">
                  <div className="flex justify-between text-[15px]">
                    <span>{info.emoji} {info.nome}</span>
                    <span className="tabular-nums">{formatar(valor, base)} <span className="text-fosco">· {pct}%</span></span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-linha">
                    <div className="h-1.5 rounded-full bg-realce" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Secao>
      )}

      <Secao titulo="Movimentos">
        {movimentos.length === 0 ? (
          <Vazio titulo="Nenhuma despesa ainda">A primeira que alguém pagar entra aqui.</Vazio>
        ) : (
          <ul className="cartao divide-y divide-linha">
            {movimentos.map((mv) => {
              if (mv.tipo === "pagamento") {
                const p = mv.p;
                return (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xl" aria-hidden>🤝</span>
                    <span className="min-w-0 flex-1">
                      <span className="block">{nome(p.deId)} pagou {nome(p.paraId)}</span>
                      <span className="block text-[13px] text-fosco">{curta(p.data)}{p.notas && ` · ${p.notas}`}</span>
                    </span>
                    <span className="tabular-nums text-fosco">{formatar(p.valor, base)}</span>
                    <form action={apagarPagamento}>
                      <input type="hidden" name="viagemId" value={id} />
                      <input type="hidden" name="pagamentoId" value={p.id} />
                      <button aria-label="Desfazer acerto" className="px-1 text-fosco">×</button>
                    </form>
                  </li>
                );
              }
              const d = mv.d;
              const b = naBase(d);
              const minhaParte = b.partes.find((p) => p.membroId === eu.id)?.valor ?? 0;
              const paguei = b.pagadores.find((p) => p.membroId === eu.id)?.valor ?? 0;
              const efeito = paguei - minhaParte;
              const quemPagou = d.pagadores.length > 1 ? `${d.pagadores.length} pessoas` : nome(d.pagadores[0]?.membroId ?? "");
              return (
                <li key={d.id}>
                  <Link href={`/v/${id}/contas/${d.id}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xl" aria-hidden>{infoCategoriaDeDespesa(d.categoria).emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{d.descricao}</span>
                      <span className="block text-[13px] text-fosco">
                        {curta(d.data)} · {quemPagou} {d.pagadores.length > 1 ? "pagaram" : "pagou"} {formatar(d.valor, d.moeda)}
                      </span>
                    </span>
                    <span className="text-right text-[13px]">
                      {efeito > 0 ? (
                        <span className="text-verde">você recebe<br /><strong className="text-[15px]">{formatar(efeito, base)}</strong></span>
                      ) : efeito < 0 ? (
                        <span className="text-vermelho">você deve<br /><strong className="text-[15px]">{formatar(-efeito, base)}</strong></span>
                      ) : (
                        <span className="text-fosco">não é<br />com você</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Secao>
    </Pagina>
  );
}
