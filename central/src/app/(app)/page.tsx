import Link from "next/link";
import { Secao, Vazio } from "@/componentes/pecas";
import { ListaDeTarefas, NovaTarefa, type ItemDeTarefa } from "@/componentes/tarefas";
import { compromissos, porDia, type Compromisso } from "@/lib/agenda";
import { bd } from "@/lib/bd";
import { VISIVEL } from "@/lib/consultas";
import { agoraPorExtenso, diaEmSaoPaulo, horaCurta, somarDias } from "@/lib/datas";
import { tarefasAgrupadas } from "@/lib/tarefas";

export const dynamic = "force-dynamic";

const DIAS_PARA_COBRAR = 3;

function saudacao(agora: Date) {
  const h = Number(agora.toLocaleString("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

/**
 * Hoje responde uma pergunta só: o que eu faço agora? Uma coluna, duas
 * listas — o que está na agenda e o que está para fazer (tarefas suas e
 * e-mails que dependem de você, juntos). O resto mora nas outras telas.
 */
export default async function Hoje() {
  const contas = await bd.conta.findMany({ orderBy: { criadoEm: "asc" } });
  if (!contas.length) {
    return (
      <div className="mx-auto max-w-xl pt-6">
        <h1 className="text-[28px] font-semibold tracking-tight">Bem-vindo à Central</h1>
        <p className="mt-3 text-[15px] text-grafite">Conecte suas contas Google para a Central ler as caixas e as agendas.</p>
        <Link href="/ajustes" className="mt-6 inline-block rounded-lg bg-tinta px-4 py-2 text-[15px] font-medium text-fundo">
          Conectar contas
        </Link>
      </div>
    );
  }

  const agora = new Date();
  const hoje = diaEmSaoPaulo(agora);
  const [g, agenda, esperando] = await Promise.all([
    tarefasAgrupadas(),
    compromissos(contas, new Date(`${hoje}T03:00:00Z`), new Date(`${somarDias(hoje, 1)}T03:00:00Z`)),
    bd.conversa.count({
      where: { ...VISIVEL, categoria: "aguardando", ultimaData: { lte: new Date(agora.getTime() - DIAS_PARA_COBRAR * 86_400_000) } },
    }),
  ]);
  const doDia = (porDia(agenda).get(hoje) ?? []).filter((e) => e.diaInteiro || e.fim.getTime() > agora.getTime());

  // Para fazer hoje: o que venceu ou vence hoje, e os e-mails que pedem você
  // (com prazo nesta semana ou sem prazo). Tarefas suas sem data ficam em Tarefas.
  const deEmail = (i: ItemDeTarefa) => i.chave.startsWith("c:");
  const paraFazer = [...g.atrasadas, ...g.hoje, ...g.semana.filter(deEmail), ...g.semData.filter(deEmail)];

  const partes = [
    doDia.length ? `${doDia.length} ${doDia.length === 1 ? "compromisso" : "compromissos"}` : "agenda livre",
    paraFazer.length ? `${paraFazer.length} ${paraFazer.length === 1 ? "coisa" : "coisas"} para fazer` : "nada pendente",
  ];

  return (
    <div className="mx-auto max-w-[680px]">
      <header className="mb-10">
        <h1 className="text-[28px] font-semibold tracking-tight">{saudacao(agora)}, {process.env.DONO_NOME || "Bruno"}.</h1>
        <p className="mt-1 text-[15px] text-fosco first-letter:uppercase">
          {agoraPorExtenso(agora).split(" às ")[0]} · {partes.join(", ")}.
        </p>
      </header>

      <Secao titulo="Agenda" acao={<Link href="/agenda" className="hover:text-tinta">Ver semana</Link>}>
        {doDia.length ? <Agenda lista={doDia} /> : <Vazio>Nada mais na agenda hoje.</Vazio>}
      </Secao>

      <Secao titulo="Para fazer" acao={<Link href="/tarefas" className="hover:text-tinta">Todas as tarefas</Link>}>
        <ListaDeTarefas itens={paraFazer} vazio="Nada pendente. Bom momento para respirar." />
        <NovaTarefa diaPadrao={hoje} />
      </Secao>

      {esperando > 0 && (
        <Link href="/caixa?fluxo=esperando" className="text-[14px] text-fosco hover:text-tinta">
          {esperando === 1 ? "1 pessoa te deve resposta" : `${esperando} pessoas te devem resposta`} há mais de {DIAS_PARA_COBRAR} dias →
        </Link>
      )}
    </div>
  );
}

function Agenda({ lista }: { lista: Compromisso[] }) {
  return (
    <ul>
      {lista.map((e, i) => (
        <li key={i}>
          <a href={e.link} target="_blank" rel="noreferrer" className="-mx-3 flex items-baseline gap-4 rounded-lg px-3 py-2 hover:bg-realce">
            <span className="numeros w-12 shrink-0 text-[14px] text-fosco">{e.diaInteiro ? "o dia" : horaCurta(e.inicio)}</span>
            <span className="min-w-0 flex-1 truncate text-[15px]">{e.titulo}</span>
            <span className="h-[7px] w-[7px] shrink-0 self-center rounded-full" style={{ background: e.cor }} title={e.conta} />
          </a>
        </li>
      ))}
    </ul>
  );
}
