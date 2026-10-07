import "server-only";
import type { Conta } from "@prisma/client";
import { FUSO } from "./datas";
import { eventosEntre, type EventoGoogle } from "./google";

export interface Compromisso {
  conta: string;
  titulo: string;
  inicio: Date;
  diaInteiro: boolean;
  local?: string;
  link?: string;
}

function paraCompromisso(conta: Conta, e: EventoGoogle): Compromisso {
  const diaInteiro = !e.start.dateTime;
  return {
    conta: conta.rotulo,
    titulo: e.summary || "(sem título)",
    inicio: new Date(e.start.dateTime ?? `${e.start.date}T03:00:00Z`),
    diaInteiro,
    local: e.location,
    link: e.htmlLink,
  };
}

/** Os compromissos de todas as agendas juntos, em ordem. Agenda que falha fica de fora, sem derrubar o resto. */
export async function compromissos(contas: Conta[], de: Date, ate: Date): Promise<Compromisso[]> {
  const listas = await Promise.all(
    contas
      .filter((c) => !c.erro)
      .map((c) =>
        eventosEntre(c, de, ate)
          .then((es) => es.map((e) => paraCompromisso(c, e)))
          .catch((e) => {
            console.error(`[agenda ${c.email}]`, e);
            return [];
          }),
      ),
  );
  return listas.flat().sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
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
