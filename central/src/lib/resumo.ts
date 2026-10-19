import "server-only";
import type { Conta } from "@prisma/client";
import { compromissos, porDia } from "./agenda";
import { gravarAjuste, lerAjuste } from "./ajustes";
import { bd } from "./bd";
import { visivel } from "./consultas";
import { FUSO, agoraPorExtenso, diaEmSaoPaulo, diasDesde, horaCurta, somarDias } from "./datas";
import { montarMimeHtml } from "./gmail";
import { enviarParaSiMesmo } from "./google";
import { tarefasAgrupadas } from "./tarefas";

/**
 * O resumo da manhã: um e-mail curto, da conta escolhida para ela mesma, com
 * o dia na agenda, o que fazer e quem está devendo resposta. É o Hoje da
 * Central, chegando sem precisar abrir o app.
 */

const HORA_DO_RESUMO = 7;

export async function contaDoResumo(contas: Conta[]): Promise<Conta | undefined> {
  const escolhida = await lerAjuste("resumo.conta");
  return (
    contas.find((c) => c.id === escolhida && !c.erro) ??
    contas.find((c) => /@(gmail|googlemail)\.com$/i.test(c.email) && !c.erro) ??
    contas.find((c) => !c.erro)
  );
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function montarResumo(baseUrl: string): Promise<{ assunto: string; texto: string; html: string }> {
  const contas = await bd.conta.findMany({ orderBy: { criadoEm: "asc" } });
  const agora = new Date();
  const hoje = diaEmSaoPaulo(agora);
  const [g, agenda, esperando] = await Promise.all([
    tarefasAgrupadas(),
    compromissos(contas, new Date(`${hoje}T03:00:00Z`), new Date(`${somarDias(hoje, 1)}T03:00:00Z`)),
    bd.conversa.findMany({
      where: { ...visivel(), categoria: "aguardando", ultimaData: { lte: new Date(agora.getTime() - 3 * 86_400_000) } },
      orderBy: { ultimaData: "asc" },
      take: 5,
    }),
  ]);
  const doDia = porDia(agenda).get(hoje) ?? [];
  const deEmail = (c: string) => c.startsWith("c:");
  const fazer = [...g.atrasadas, ...g.hoje, ...g.semana.filter((i) => deEmail(i.chave)), ...g.semData.filter((i) => deEmail(i.chave))].slice(0, 12);

  const dia = agoraPorExtenso(agora).split(" às ")[0];
  const assunto = `Seu dia: ${doDia.length} ${doDia.length === 1 ? "compromisso" : "compromissos"}, ${fazer.length} para fazer`;

  const linhasAgenda = doDia.map((e) => `${e.diaInteiro ? "o dia" : horaCurta(e.inicio)} — ${e.titulo} (${e.conta})`);
  const linhasFazer = fazer.map((i) => `${i.titulo}${i.origem ? ` — ${i.origem.quem}` : ""}${i.prazo ? ` (${i.prazo.texto.split(" · ")[1]})` : ""}`);
  const linhasEsperando = esperando.map((c) => `${c.remetente.replace(/^Para: /, "")} — há ${diasDesde(c.ultimaData)} dias: ${c.resumo || c.assunto}`);

  const texto = [
    dia.charAt(0).toUpperCase() + dia.slice(1),
    "",
    "AGENDA",
    ...(linhasAgenda.length ? linhasAgenda : ["Nada marcado."]),
    "",
    "PARA FAZER",
    ...(linhasFazer.length ? linhasFazer.map((l) => `- ${l}`) : ["Nada pendente."]),
    ...(linhasEsperando.length ? ["", "ESPERANDO RESPOSTA", ...linhasEsperando.map((l) => `- ${l}`)] : []),
    "",
    `Abrir a Central: ${baseUrl}`,
  ].join("\n");

  const secao = (titulo: string, itens: string[], vazio: string) => `
    <p style="margin:28px 0 6px;font-size:13px;font-weight:600;color:#8a8780">${titulo}</p>
    ${
      itens.length
        ? itens.map((t) => `<p style="margin:0;padding:7px 0;border-top:1px solid #efede8;font-size:15px;color:#1f1e1c">${esc(t)}</p>`).join("")
        : `<p style="margin:0;padding:7px 0;font-size:15px;color:#8a8780">${vazio}</p>`
    }`;

  const html = `<!doctype html><html><body style="margin:0;background:#fbfaf8">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif">
    <p style="margin:0;font-size:22px;font-weight:600;color:#1f1e1c">Bom dia.</p>
    <p style="margin:4px 0 0;font-size:15px;color:#8a8780">${esc(dia.charAt(0).toUpperCase() + dia.slice(1))}</p>
    ${secao("Agenda", linhasAgenda, "Nada marcado.")}
    ${secao("Para fazer", linhasFazer, "Nada pendente.")}
    ${linhasEsperando.length ? secao("Esperando resposta", linhasEsperando, "") : ""}
    <p style="margin:32px 0 0"><a href="${baseUrl}" style="color:#2f5d50;font-size:15px">Abrir a Central</a></p>
  </div></body></html>`;

  return { assunto, texto, html };
}

/** Manda o resumo agora, para a conta escolhida. */
export async function enviarResumo(baseUrl: string): Promise<string> {
  const contas = await bd.conta.findMany({ orderBy: { criadoEm: "asc" } });
  const conta = await contaDoResumo(contas);
  if (!conta) throw new Error("Nenhuma conta conectada para receber o resumo.");
  const r = await montarResumo(baseUrl);
  await enviarParaSiMesmo(conta, montarMimeHtml({ para: [conta.email], ...r }));
  await gravarAjuste("resumo.ultimoEnvio", diaEmSaoPaulo());
  return conta.email;
}

/**
 * Chamado a cada rodada automática: manda o resumo uma vez por dia, a partir
 * das 7h de São Paulo, se estiver ligado. Assim funciona tanto com o
 * agendador diário da Vercel quanto com um de meia em meia hora.
 */
export async function talvezEnviarResumo(baseUrl: string): Promise<boolean> {
  if ((await lerAjuste("resumo.ligado", "1")) !== "1") return false;
  const hoje = diaEmSaoPaulo();
  if ((await lerAjuste("resumo.ultimoEnvio")) === hoje) return false;
  const hora = Number(new Date().toLocaleString("en-GB", { timeZone: FUSO, hour: "2-digit", hour12: false }));
  if (hora < HORA_DO_RESUMO) return false;
  await enviarResumo(baseUrl);
  return true;
}
