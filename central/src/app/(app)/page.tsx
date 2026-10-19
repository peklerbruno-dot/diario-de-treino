import Link from "next/link";
import { CampoDePergunta } from "@/componentes/campo-de-pergunta";
import { DetalheTarefa } from "@/componentes/detalhe-tarefa";
import { IconeVoltar } from "@/componentes/icones";
import { PainelDividido } from "@/componentes/painel-dividido";
import { Grupo, Secao, Vazio } from "@/componentes/pecas";
import { ListaDeTarefas, NovaTarefa } from "@/componentes/tarefas";
import { choques, compromissos, porDia, type Compromisso } from "@/lib/agenda";
import { bd } from "@/lib/bd";
import { visivel } from "@/lib/consultas";
import { diaEmSaoPaulo, FUSO, horaCurta, somarDias } from "@/lib/datas";
import { tarefasAgrupadas } from "@/lib/tarefas";
import { DetalheConversa } from "./conversa/detalhe";

export const dynamic = "force-dynamic";

const DIAS_PARA_COBRAR = 3;

function saudacao(agora: Date) {
  const h = Number(agora.toLocaleString("en-GB", { timeZone: FUSO, hour: "2-digit", hour12: false }));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Hoje é a tela de decidir: a agenda e tudo o que depende de você — e-mails
 * que pedem algo e tarefas suas — numa lista só, por quando. Tocar num item
 * abre o dossiê ao lado (no celular, por cima): de onde veio, por quê, o que
 * aconteceu até aqui e o que falta.
 */
export default async function Hoje({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const contas = await bd.conta.findMany({ orderBy: { criadoEm: "asc" } });
  if (!contas.length) {
    return (
      <div className="mx-auto max-w-xl pt-6">
        <h1 className="serifa text-[34px] leading-tight">Bem-vindo à Central</h1>
        <p className="mt-3 text-[15px] text-grafite">Conecte suas contas Google para a Central ler as caixas e as agendas.</p>
        <Link href="/ajustes" className="mt-6 inline-block rounded-full bg-destaque px-5 py-2.5 text-[15px] font-semibold text-white">
          Conectar contas
        </Link>
      </div>
    );
  }

  const { p: aberta } = await searchParams;
  const agora = new Date();
  const hoje = diaEmSaoPaulo(agora);
  const amanha = somarDias(hoje, 1);
  const [g, agenda, esperando, semPendencia] = await Promise.all([
    tarefasAgrupadas(),
    compromissos(contas, new Date(`${hoje}T03:00:00Z`), new Date(`${somarDias(hoje, 2)}T03:00:00Z`)),
    bd.conversa.count({
      where: { ...visivel(), categoria: "aguardando", ultimaData: { lte: new Date(agora.getTime() - DIAS_PARA_COBRAR * 86_400_000) } },
    }),
    // O que chegou e a triagem achou que não pede nada de você: para conferir.
    bd.conversa.count({
      where: {
        naCaixa: true,
        resolvida: false,
        categoria: { in: ["informativo", "ler_depois", "ruido"] },
        classificadaMsgId: { not: null },
        ultimaData: { gte: new Date(agora.getTime() - 86_400_000) },
      },
    }),
  ]);
  const dias = porDia(agenda);
  const doDia = (dias.get(hoje) ?? []).filter((e) => e.diaInteiro || e.fim.getTime() > agora.getTime());
  const deAmanha = dias.get(amanha) ?? [];

  const grupos = [
    { titulo: "Atrasadas", itens: g.atrasadas },
    { titulo: "Hoje", itens: g.hoje },
    { titulo: "Próximos 7 dias", itens: g.semana },
    { titulo: "Sem data", itens: g.semData },
    { titulo: "Mais adiante", itens: g.depois },
    { titulo: "Feitas há pouco", itens: g.feitas },
  ].filter((x) => x.itens.length);
  const abertas = g.atrasadas.length + g.hoje.length + g.semana.length + g.semData.length + g.depois.length;

  const resumo = [
    doDia.length ? plural(doDia.length, "compromisso", "compromissos") : "agenda livre",
    abertas ? plural(abertas, "pendência", "pendências") : "nada pendente",
    ...(g.atrasadas.length ? [plural(g.atrasadas.length, "atrasada", "atrasadas")] : []),
  ];

  const blocoAgenda = (
    <Secao titulo="Agenda de hoje" acao={<Link href="/agenda" className="hover:text-tinta">Ver semana</Link>}>
      {doDia.length ? <Agenda lista={doDia} /> : <Vazio>Nada mais na agenda hoje.</Vazio>}
      {choques(doDia).map(([a, b], i) => (
        <p key={i} className="mt-1 text-[14px] text-atencao">
          {a.titulo} e {b.titulo} se chocam às {horaCurta(b.inicio)}.
        </p>
      ))}
    </Secao>
  );

  const lista = (
    <>
      <header className="mb-7">
        <p className="serifa text-[17px] font-semibold text-fosco first-letter:uppercase">
          {agora.toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "long", day: "numeric", month: "short" }).replace(".", "")}
        </p>
        <h1 className="serifa mt-0.5 text-[34px] leading-tight">
          {saudacao(agora)}, {process.env.DONO_NOME || "Bruno"}.
        </h1>
        <p className="mt-1.5 text-[15px] text-grafite first-letter:uppercase">{resumo.join(" · ")}</p>
      </header>

      <div className="lg:hidden">{blocoAgenda}</div>

      <div className="mb-8">
        <NovaTarefa />
      </div>

      {grupos.map((x) => (
        <Secao key={x.titulo} titulo={x.titulo} tom={x.titulo === "Atrasadas" ? "atencao" : undefined}>
          <ListaDeTarefas itens={x.itens} aberta={aberta} />
        </Secao>
      ))}
      {!abertas && <Vazio>Nada pendente. Bom momento para respirar.</Vazio>}

      {(esperando > 0 || semPendencia > 0) && (
        <Grupo className="text-[14px] text-grafite">
          {esperando > 0 && (
            <Link href="/caixa?fluxo=esperando" className="flex items-center gap-3 px-4 py-3 hover:bg-realce">
              <span className="min-w-0 flex-1">
                {esperando === 1 ? "1 pessoa te deve resposta" : `${esperando} pessoas te devem resposta`} há mais de {DIAS_PARA_COBRAR} dias
              </span>
              <span className="text-fosco">›</span>
            </Link>
          )}
          {semPendencia > 0 && (
            <Link href="/caixa?fluxo=registro" className="flex items-center gap-3 px-4 py-3 hover:bg-realce">
              <span className="min-w-0 flex-1">
                {semPendencia === 1 ? "1 e-mail" : `${semPendencia} e-mails`} das últimas 24 h não {semPendencia === 1 ? "virou" : "viraram"} pendência
                (avisos, newsletters). Conferir
              </span>
              <span className="text-fosco">›</span>
            </Link>
          )}
        </Grupo>
      )}

      <div className="mt-10">
        <CampoDePergunta compacto />
      </div>
    </>
  );

  return (
    <PainelDividido
      mostrarDireita={Boolean(aberta)}
      esquerda={lista}
      direita={
        aberta ? (
          <div className="max-w-[760px]">
            <Link href="/" scroll={false} className="mb-6 inline-flex items-center gap-1 text-[15px] text-fosco lg:hidden">
              <IconeVoltar /> Hoje
            </Link>
            <Item chave={aberta} />
          </div>
        ) : (
          <div className="max-w-[560px]">
            {blocoAgenda}
            <Secao titulo="Amanhã">{deAmanha.length ? <Agenda lista={deAmanha} /> : <Vazio>Nada marcado.</Vazio>}</Secao>
          </div>
        )
      }
    />
  );
}

/** O dossiê do item aberto: a conversa de onde ele veio, ou a sua tarefa. */
async function Item({ chave }: { chave: string }) {
  const [tipo, id] = chave.split(":");
  if (tipo === "c" && id) return <DetalheConversa id={id} />;
  const t = tipo === "t" && id ? await bd.tarefa.findUnique({ where: { id } }) : null;
  if (!t) return <p className="py-10 text-sm text-fosco">Não encontrei esse item.</p>;
  return (
    <DetalheTarefa
      key={t.id}
      t={{
        id: t.id,
        titulo: t.titulo,
        prazo: t.prazo ? t.prazo.toISOString().slice(0, 10) : null,
        nota: t.nota ?? "",
        criadaEm: t.criadoEm.toLocaleDateString("pt-BR", { timeZone: FUSO, day: "numeric", month: "long" }),
        feita: Boolean(t.feitaEm),
      }}
    />
  );
}

/** A agenda num bloco: a hora, uma barrinha na cor da conta e o compromisso. */
function Agenda({ lista }: { lista: Compromisso[] }) {
  return (
    <Grupo>
      {lista.map((e, i) => (
        <a key={i} href={e.link} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-realce">
          <span className="numeros w-11 shrink-0 text-[14px] text-fosco">{e.diaInteiro ? "o dia" : horaCurta(e.inicio)}</span>
          <span className="h-5 w-[3px] shrink-0 rounded-full" style={{ background: e.cor }} title={e.conta} />
          <span className="min-w-0 flex-1 truncate text-[15px]">{e.titulo}</span>
        </a>
      ))}
    </Grupo>
  );
}
