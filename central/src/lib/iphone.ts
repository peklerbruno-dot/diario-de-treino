import "server-only";
import { randomBytes } from "node:crypto";
import { lerAjuste, gravarAjuste } from "./ajustes";
import { iguais } from "./auth";
import { compromissos, porDia } from "./agenda";
import { bd } from "./bd";
import { diaEmSaoPaulo, horaCurta, somarDias } from "./datas";
import { tarefasAgrupadas } from "./tarefas";

/**
 * O que o iPhone usa sem entrar no app: o widget (Scriptable) lê o resumo do
 * dia, e o atalho "Anotar" (app Atalhos) cria tarefas. Os dois chegam sem o
 * cookie de sessão, então provam quem são com uma chave própria, gerada em
 * Ajustes e trocável a qualquer momento (trocar desliga a antiga).
 */

const AJUSTE = "iphone.chave";

export async function chaveDoIphone(): Promise<string> {
  return lerAjuste(AJUSTE);
}

export async function novaChaveDoIphone(): Promise<string> {
  const chave = randomBytes(24).toString("base64url");
  await gravarAjuste(AJUSTE, chave);
  return chave;
}

/** A chave vem no endereço (?chave=) ou no cabeçalho "Authorization: Bearer". */
export async function chaveConfere(req: Request): Promise<boolean> {
  const certa = await chaveDoIphone();
  if (!certa) return false;
  const naUrl = new URL(req.url).searchParams.get("chave") ?? "";
  const noCabecalho = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return iguais(naUrl, certa) || iguais(noCabecalho, certa);
}

export interface ResumoDoWidget {
  dia: string;
  agenda: { hora: string; titulo: string; cor: string }[];
  pendencias: { titulo: string; quando: string; atrasada: boolean; cor: string }[];
  total: number;
  atrasadas: number;
}

/** O dia em poucas linhas, do jeito que cabe num widget. */
export async function resumoDoWidget(): Promise<ResumoDoWidget> {
  const agora = new Date();
  const hoje = diaEmSaoPaulo(agora);
  const contas = await bd.conta.findMany({ orderBy: { criadoEm: "asc" } });
  const [g, eventos] = await Promise.all([
    tarefasAgrupadas(),
    compromissos(contas, new Date(`${hoje}T03:00:00Z`), new Date(`${somarDias(hoje, 1)}T03:00:00Z`)),
  ]);
  const doDia = (porDia(eventos).get(hoje) ?? []).filter((e) => e.diaInteiro || e.fim.getTime() > agora.getTime());
  const abertas = [...g.atrasadas, ...g.hoje, ...g.semana, ...g.semData, ...g.depois];
  return {
    dia: agora.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long" }),
    agenda: doDia.slice(0, 4).map((e) => ({ hora: e.diaInteiro ? "dia" : horaCurta(e.inicio), titulo: e.titulo, cor: e.cor })),
    pendencias: abertas.slice(0, 8).map((i) => {
      const falta = i.prazo?.texto.split(" · ")[1] ?? "";
      return {
        titulo: i.titulo,
        quando: !i.prazo ? "" : i.prazo.vencido ? "atrasada" : falta === "hoje" ? "hoje" : falta === "amanhã" ? "amanhã" : i.prazo.texto.split(" · ")[0],
        atrasada: Boolean(i.prazo?.vencido),
        cor: i.origem?.cor ?? "#8a8a8a",
      };
    }),
    total: abertas.length,
    atrasadas: g.atrasadas.length,
  };
}
