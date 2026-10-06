export const FUSO = "America/Sao_Paulo";

/** "terça-feira, 6 de outubro de 2026, 20:15" no fuso de São Paulo. */
export function agoraPorExtenso(agora = new Date()): string {
  return agora.toLocaleString("pt-BR", {
    timeZone: FUSO,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "2026-10-06", o dia de hoje em São Paulo. */
export function diaEmSaoPaulo(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: FUSO });
}

/** Como a lista mostra uma data: "14:32" se for hoje, "ontem", "seg., 5/10", "12/08/2025". */
export function quando(d: Date, agora = new Date()): string {
  const dia = diaEmSaoPaulo(d);
  const hoje = diaEmSaoPaulo(agora);
  if (dia === hoje) return d.toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
  const ontem = diaEmSaoPaulo(new Date(agora.getTime() - 86_400_000));
  if (dia === ontem) return "ontem";
  const dias = (agora.getTime() - d.getTime()) / 86_400_000;
  if (dias < 6) {
    return d.toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "short", day: "numeric", month: "numeric" });
  }
  if (dia.slice(0, 4) === hoje.slice(0, 4)) {
    return d.toLocaleDateString("pt-BR", { timeZone: FUSO, day: "numeric", month: "numeric" });
  }
  return d.toLocaleDateString("pt-BR", { timeZone: FUSO });
}

/** Um prazo (só dia) por extenso e quanto falta: "sex., 16/10 · em 10 dias". */
export function prazoPorExtenso(prazo: Date, agora = new Date()): { texto: string; vencido: boolean; perto: boolean } {
  const dia = prazo.toISOString().slice(0, 10);
  const hoje = diaEmSaoPaulo(agora);
  const diff = Math.round((Date.parse(dia) - Date.parse(hoje)) / 86_400_000);
  const rotulo = new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });
  const falta =
    diff === 0 ? "hoje" : diff === 1 ? "amanhã" : diff < 0 ? `venceu há ${-diff} dia${diff === -1 ? "" : "s"}` : `em ${diff} dias`;
  return { texto: `${rotulo} · ${falta}`, vencido: diff < 0, perto: diff >= 0 && diff <= 3 };
}

/** Dias inteiros desde uma data. */
export const diasDesde = (d: Date, agora = new Date()) => Math.floor((agora.getTime() - d.getTime()) / 86_400_000);
