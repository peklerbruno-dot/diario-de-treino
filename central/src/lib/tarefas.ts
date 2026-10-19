import "server-only";
import type { ItemDeTarefa } from "@/componentes/tarefas";
import { bd } from "./bd";
import { DEPENDEM_DE_MIM } from "./categorias";
import { visivel } from "./consultas";
import { corDaConta } from "./cores";
import { entenderAnotacao } from "./anotar";
import { iaConfigurada, interpretarAnotacao, type Anotada } from "./ia";
import { diaEmSaoPaulo, prazoPorExtenso, somarDias } from "./datas";

export interface Grupos {
  atrasadas: ItemDeTarefa[];
  hoje: ItemDeTarefa[];
  semana: ItemDeTarefa[];
  depois: ItemDeTarefa[];
  semData: ItemDeTarefa[];
  feitas: ItemDeTarefa[];
}

/**
 * Tudo o que é para fazer, junto: as tarefas que você escreveu e a próxima
 * ação de cada e-mail que depende de você. Agrupado por quando, como no Things.
 */
export async function tarefasAgrupadas(): Promise<Grupos> {
  const [contas, tarefas, feitas, conversas] = await Promise.all([
    bd.conta.findMany({ orderBy: { criadoEm: "asc" } }),
    bd.tarefa.findMany({ where: { feitaEm: null }, orderBy: [{ prazo: { sort: "asc", nulls: "last" } }, { criadoEm: "asc" }] }),
    bd.tarefa.findMany({
      where: { feitaEm: { gte: new Date(Date.now() - 3 * 86_400_000) } },
      orderBy: { feitaEm: "desc" },
      take: 10,
    }),
    bd.conversa.findMany({
      where: { ...visivel(), categoria: { in: DEPENDEM_DE_MIM } },
      include: { conta: true },
      orderBy: [{ prazo: { sort: "asc", nulls: "last" } }, { prioridade: "asc" }, { ultimaData: "desc" }],
    }),
  ]);

  const hoje = diaEmSaoPaulo();
  const daqui7 = somarDias(hoje, 7);
  const g: Grupos = { atrasadas: [], hoje: [], semana: [], depois: [], semData: [], feitas: [] };
  const pôr = (item: ItemDeTarefa, prazo: Date | null) => {
    if (!prazo) return g.semData.push(item);
    const dia = prazo.toISOString().slice(0, 10);
    if (dia < hoje) g.atrasadas.push(item);
    else if (dia === hoje) g.hoje.push(item);
    else if (dia <= daqui7) g.semana.push(item);
    else g.depois.push(item);
  };

  for (const t of tarefas) {
    pôr(
      {
        chave: `t:${t.id}`,
        titulo: t.titulo,
        prazo: t.prazo ? prazoPorExtenso(t.prazo) : null,
        href: `/?p=t:${t.id}`,
        comNota: Boolean(t.nota),
        itens: (t.nota ?? "").split("\n").filter((l) => l.startsWith("• ")).length,
        feita: false,
      },
      t.prazo,
    );
  }
  for (const c of conversas) {
    pôr(
      {
        chave: `c:${c.id}`,
        titulo: c.proximaAcao || `Responder a ${c.remetente}`,
        prazo: c.prazo ? prazoPorExtenso(c.prazo) : null,
        origem: { quem: c.remetente.replace(/^Para: /, ""), assunto: c.assunto, conta: c.conta.rotulo, cor: corDaConta(contas, c.contaId) },
        href: `/?p=c:${c.id}`,
        feita: false,
      },
      c.prazo,
    );
  }
  g.feitas = feitas.map((t) => ({ chave: `t:${t.id}`, titulo: t.titulo, href: `/?p=t:${t.id}`, feita: true }));
  return g;
}

/**
 * Uma anotação vira tarefa (ou tarefas). O Gemini passa a limpo: corrige a
 * escrita, põe em imperativo, separa em itens ou em tarefas. Sem ele (sem
 * chave ou sem cota), vale o texto como veio, com a data que ele disser.
 * Um prazo escolhido (no calendário) vale para todas e acima do texto.
 * Usada pelo campo do Hoje e pelo atalho do iPhone.
 */
export async function anotar(texto: string, prazo?: string | null) {
  const limpo = texto.trim().slice(0, 1000);
  if (!limpo) return [];
  const escolhido = prazo && /^\d{4}-\d{2}-\d{2}$/.test(prazo) ? prazo : null;
  let tarefas: Anotada[] = [];
  if (iaConfigurada()) {
    try {
      tarefas = await interpretarAnotacao(limpo);
    } catch (e) {
      console.error("[anotar]", e);
    }
  }
  if (!tarefas.length) {
    const a = entenderAnotacao(limpo.slice(0, 300), diaEmSaoPaulo());
    tarefas = [{ titulo: a.titulo, prazo: a.prazo, itens: [] }];
  }
  return Promise.all(
    tarefas.map((t) => {
      const dia = escolhido ?? t.prazo;
      return bd.tarefa.create({
        data: {
          titulo: t.titulo,
          prazo: dia ? new Date(`${dia}T00:00:00Z`) : null,
          // Os itens moram na nota, um por linha, e a nota guarda também o
          // que foi escrito, para conferir.
          nota: [...t.itens.map((i) => `• ${i}`), t.itens.length || t.titulo !== limpo ? `Anotado: “${limpo}”` : ""]
            .filter(Boolean)
            .join("\n") || null,
        },
      });
    }),
  );
}
