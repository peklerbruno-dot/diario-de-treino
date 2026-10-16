import Link from "next/link";
import { LinhaConversa } from "@/componentes/linha-conversa";
import { Prazo, Secao, Titulo, Vazio } from "@/componentes/pecas";
import { ListaDeTarefas, NovaTarefa } from "@/componentes/tarefas";
import { compromissos, porDia, type Compromisso } from "@/lib/agenda";
import { bd } from "@/lib/bd";
import { DEPENDEM_DE_MIM } from "@/lib/categorias";
import { ORDEM, VISIVEL } from "@/lib/consultas";
import { corDaConta } from "@/lib/cores";
import { agoraPorExtenso, diaEmSaoPaulo, diasDesde, horaCurta, prazoPorExtenso, somarDias } from "@/lib/datas";
import { tarefasAgrupadas } from "@/lib/tarefas";

export const dynamic = "force-dynamic";

const DIAS_PARA_COBRAR = 3;

/**
 * Hoje: a resposta a "o que eu faço agora?". À esquerda, o que depende de
 * você (e-mails e tarefas); à direita, o dia na agenda, os prazos que vêm e
 * quem está te devendo resposta.
 */
export default async function Hoje() {
  const contas = await bd.conta.findMany({ orderBy: { criadoEm: "asc" } });
  if (!contas.length) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <Titulo>Bem-vindo à Central</Titulo>
        <p className="text-grafite">
          Conecte suas contas Google (pessoal, CIP, USP, CEJ) para a Central ler as caixas e as agendas e começar a triagem.
        </p>
        <Link href="/ajustes" className="mt-5 inline-block rounded-md bg-destaque px-4 py-2 font-semibold text-destaque-tinta">
          Conectar contas
        </Link>
      </div>
    );
  }

  const agora = new Date();
  const hoje = diaEmSaoPaulo(agora);
  const amanha = somarDias(hoje, 1);
  const [paraMim, prazos, aguardando, tarefas, agenda] = await Promise.all([
    bd.conversa.findMany({ where: { ...VISIVEL, categoria: { in: DEPENDEM_DE_MIM } }, include: { conta: true }, orderBy: ORDEM, take: 12 }),
    bd.conversa.findMany({
      where: { ...VISIVEL, prazo: { not: null, lte: new Date(`${somarDias(hoje, 14)}T00:00:00Z`) } },
      include: { conta: true },
      orderBy: { prazo: "asc" },
      take: 8,
    }),
    bd.conversa.findMany({
      where: { ...VISIVEL, categoria: "aguardando", ultimaData: { lte: new Date(agora.getTime() - DIAS_PARA_COBRAR * 86_400_000) } },
      include: { conta: true },
      orderBy: { ultimaData: "asc" },
      take: 6,
    }),
    tarefasAgrupadas(),
    compromissos(contas, new Date(`${hoje}T03:00:00Z`), new Date(`${somarDias(hoje, 2)}T03:00:00Z`)),
  ]);
  const dias = porDia(agenda);
  const desconectadas = contas.filter((c) => c.erro);
  const tarefasDeHoje = [...tarefas.atrasadas, ...tarefas.hoje];

  return (
    <div className="mx-auto max-w-6xl">
      <Titulo sub={agoraPorExtenso(agora)}>Hoje</Titulo>

      {desconectadas.map((c) => (
        <Link key={c.id} href="/ajustes" className="mb-4 block rounded-md border border-atencao px-4 py-2.5 text-sm text-atencao">
          A conta {c.rotulo} ({c.email}) precisa ser reconectada. Clique aqui.
        </Link>
      ))}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
        <div>
          <Secao titulo="Precisa de você" conta={paraMim.length} acao={<Link href="/caixa" className="text-destaque hover:underline">Ver e-mails</Link>}>
            {paraMim.length ? (
              paraMim.map((c) => <LinhaConversa key={c.id} c={c} cor={corDaConta(contas, c.contaId)} href={`/caixa?c=${c.id}`} />)
            ) : (
              <Vazio>Nada pendente nos e-mails.</Vazio>
            )}
          </Secao>

          <Secao titulo="Tarefas de hoje" conta={tarefasDeHoje.length} acao={<Link href="/tarefas" className="text-destaque hover:underline">Todas</Link>}>
            <ListaDeTarefas itens={tarefasDeHoje} vazio="Nenhuma tarefa com prazo até hoje." />
            <NovaTarefa diaPadrao={hoje} />
          </Secao>
        </div>

        <aside>
          <Secao titulo="Agenda de hoje">
            <Dia lista={dias.get(hoje) ?? []} vazio="Dia livre." />
          </Secao>
          <Secao titulo="Amanhã">
            <Dia lista={dias.get(amanha) ?? []} vazio="Nada marcado." />
          </Secao>

          {prazos.length > 0 && (
            <Secao titulo="Prazos · 14 dias" conta={prazos.length}>
              <ul>
                {prazos.map((c) => (
                  <li key={c.id} className="border-b border-linha py-2">
                    <Link href={`/caixa?c=${c.id}`} className="block hover:text-destaque">
                      <p className="truncate text-sm">{c.proximaAcao || c.assunto}</p>
                      <p className="flex gap-2">
                        <Prazo {...prazoPorExtenso(c.prazo!)} />
                        <span className="text-mini font-semibold uppercase" style={{ color: corDaConta(contas, c.contaId) }}>
                          {c.conta.rotulo}
                        </span>
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Secao>
          )}

          {aguardando.length > 0 && (
            <Secao titulo="Esperando resposta" conta={aguardando.length}>
              <ul>
                {aguardando.map((c) => (
                  <li key={c.id} className="border-b border-linha py-2">
                    <Link href={`/caixa?c=${c.id}`} className="block hover:text-destaque">
                      <p className="flex justify-between gap-2 text-sm">
                        <span className="truncate">{c.remetente.replace(/^Para: /, "")}</span>
                        <span className="numeros shrink-0 text-mini text-fosco">há {diasDesde(c.ultimaData)} dias</span>
                      </p>
                      <p className="truncate text-mini text-grafite">{c.resumo || c.assunto}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Secao>
          )}
        </aside>
      </div>
    </div>
  );
}

function Dia({ lista, vazio }: { lista: Compromisso[]; vazio: string }) {
  if (!lista.length) return <Vazio>{vazio}</Vazio>;
  const agora = Date.now();
  return (
    <ul>
      {lista.map((e, i) => {
        const passou = !e.diaInteiro && e.fim.getTime() < agora;
        return (
          <li key={i}>
            <a href={e.link} target="_blank" rel="noreferrer" className={`flex items-center gap-3 border-b border-linha py-2 hover:text-destaque ${passou ? "opacity-50" : ""}`}>
              <span className="numeros w-11 shrink-0 text-sm text-grafite">{e.diaInteiro ? "dia" : horaCurta(e.inicio)}</span>
              <span className="h-4 w-[3px] shrink-0 rounded-full" style={{ background: e.cor }} />
              <span className="min-w-0 flex-1 truncate text-sm">{e.titulo}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
