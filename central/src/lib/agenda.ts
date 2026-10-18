import "server-only";
import type { Conta } from "@prisma/client";
import { bd } from "./bd";
import { corDaConta } from "./cores";
import { FUSO, diaDe } from "./datas";
import { eventosEntre, type EventoGoogle } from "./google";
import { VISIVEL } from "./consultas";

export interface Compromisso {
  conta: string;
  cor: string;
  titulo: string;
  inicio: Date;
  fim: Date;
  diaInteiro: boolean;
  local?: string;
  link?: string;
}

function paraCompromisso(conta: Conta, cor: string, e: EventoGoogle): Compromisso {
  const diaInteiro = !e.start.dateTime;
  const inicio = new Date(e.start.dateTime ?? `${e.start.date}T03:00:00Z`);
  const fim = new Date(e.end.dateTime ?? `${e.end.date}T03:00:00Z`);
  return { conta: conta.rotulo, cor, titulo: e.summary || "(sem título)", inicio, fim, diaInteiro, local: e.location, link: e.htmlLink };
}

/**
 * Os compromissos de todas as agendas juntos, em ordem. Uma agenda que falha
 * fica de fora, sem derrubar o resto; o mesmo evento em duas contas (um
 * convite que chegou nas duas) aparece uma vez só.
 */
export async function compromissos(contas: Conta[], de: Date, ate: Date): Promise<Compromisso[]> {
  const listas = await Promise.all(
    contas
      .filter((c) => !c.erro)
      .map((c) =>
        eventosEntre(c, de, ate)
          .then((es) => es.map((e) => paraCompromisso(c, corDaConta(contas, c.id), e)))
          .catch((e) => {
            console.error(`[agenda ${c.email}]`, e);
            return [];
          }),
      ),
  );
  const vistos = new Set<string>();
  return listas
    .flat()
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
    .filter((c) => {
      const chave = `${c.titulo}|${c.inicio.getTime()}`;
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });
}

/** A agenda em texto, para o rascunho saber quando você está livre. */
export function agendaEmTexto(lista: Compromisso[]): string {
  return lista
    .map((c) => {
      const dia = c.inicio.toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "short", day: "numeric", month: "numeric" });
      const hora = c.diaInteiro
        ? "dia inteiro"
        : c.inicio.toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
      return `- ${dia} ${hora}: ${c.titulo} (${c.conta})`;
    })
    .join("\n");
}

/** Um prazo (de e-mail) ou uma tarefa, para o calendário. */
export interface Marco {
  tipo: "prazo" | "tarefa";
  id: string;
  dia: string;
  titulo: string;
  cor: string;
  href: string;
  feito: boolean;
}

/** Prazos das conversas e tarefas com data, entre dois dias "AAAA-MM-DD". */
export async function marcos(contas: Conta[], de: string, ate: string): Promise<Marco[]> {
  const intervalo = { gte: new Date(`${de}T00:00:00Z`), lte: new Date(`${ate}T00:00:00Z`) };
  const [conversas, tarefas] = await Promise.all([
    bd.conversa.findMany({ where: { ...VISIVEL, prazo: intervalo } }),
    bd.tarefa.findMany({ where: { prazo: intervalo } }),
  ]);
  return [
    ...conversas.map((c) => ({
      tipo: "prazo" as const,
      id: c.id,
      dia: c.prazo!.toISOString().slice(0, 10),
      titulo: c.proximaAcao || c.assunto,
      cor: corDaConta(contas, c.contaId),
      href: `/?p=c:${c.id}`,
      feito: c.resolvida,
    })),
    ...tarefas.map((t) => ({
      tipo: "tarefa" as const,
      id: t.id,
      dia: t.prazo!.toISOString().slice(0, 10),
      titulo: t.titulo,
      cor: "var(--destaque)",
      href: `/?p=t:${t.id}`,
      feito: Boolean(t.feitaEm),
    })),
  ];
}

/** Agrupa compromissos por dia de São Paulo. Os de vários dias aparecem em cada um. */
export function porDia(lista: Compromisso[]): Map<string, Compromisso[]> {
  const mapa = new Map<string, Compromisso[]>();
  for (const c of lista) {
    const ini = diaDe(c.inicio);
    // O fim de um evento de dia inteiro é exclusivo (o dia seguinte).
    const fimInclusivo = new Date(c.fim.getTime() - (c.diaInteiro ? 86_400_000 : 1));
    const fim = diaDe(fimInclusivo < c.inicio ? c.inicio : fimInclusivo);
    for (let d = ini; d <= fim; d = new Date(new Date(`${d}T12:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10)) {
      mapa.set(d, [...(mapa.get(d) ?? []), c]);
    }
  }
  return mapa;
}

/** Pares de compromissos com hora que se sobrepõem — os choques do dia. */
export function choques(lista: Compromisso[]): [Compromisso, Compromisso][] {
  const comHora = lista.filter((e) => !e.diaInteiro).sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const pares: [Compromisso, Compromisso][] = [];
  for (let i = 0; i < comHora.length; i++) {
    for (let j = i + 1; j < comHora.length && comHora[j].inicio < comHora[i].fim; j++) {
      pares.push([comHora[i], comHora[j]]);
    }
  }
  return pares;
}
