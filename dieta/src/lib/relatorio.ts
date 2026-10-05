import { litros } from "./ajustes";
import { diaCurto, horaFalada } from "./datas";

/**
 * O resumo para mandar à nutricionista: texto simples, que vai bem no WhatsApp
 * e no e-mail, gerado a partir do histórico. É o que responde a pergunta da
 * consulta — "e aí, como foram as semanas?" — com números em vez de memória.
 */

export type DiaDoRelatorio = {
  dia: string;
  seguiu: number;
  trocou: number;
  pulou: number;
  agua: number;
  calorias: number;
  fotos: number;
  registros: { nome: string; horario: string; estado: string; nota: string; humor?: string }[];
};

const pct = (parte: number, todo: number) => (todo ? `${Math.round((parte / todo) * 100)}%` : "—");

export function textoParaNutricionista(dias: DiaDoRelatorio[], metaDeAgua: number, nomeDoPlano: string, extras: string[] = []): string {
  // Só os dias com algum registro: as semanas antes de começar a usar o app não contam.
  const comAlgo = dias.filter((d) => d.seguiu + d.trocou + d.pulou + d.agua + d.fotos > 0);
  if (comAlgo.length === 0 && extras.length === 0) return "Ainda não há registros para resumir.";
  if (comAlgo.length === 0) return [`Plano: ${nomeDoPlano}`, ...extras].join("\n");

  const ordem = [...comAlgo].sort((a, b) => a.dia.localeCompare(b.dia));
  const de = diaCurto(ordem[0].dia);
  const ate = diaCurto(ordem[ordem.length - 1].dia);
  const seguiu = comAlgo.reduce((s, d) => s + d.seguiu, 0);
  const trocou = comAlgo.reduce((s, d) => s + d.trocou, 0);
  const pulou = comAlgo.reduce((s, d) => s + d.pulou, 0);
  const marcadas = seguiu + trocou + pulou;
  const diasDeAgua = comAlgo.filter((d) => d.agua > 0);
  const mediaAgua = diasDeAgua.length ? Math.round(diasDeAgua.reduce((s, d) => s + d.agua, 0) / diasDeAgua.length / 50) * 50 : 0;
  const naMeta = comAlgo.filter((d) => d.agua >= metaDeAgua).length;
  const comFoto = comAlgo.filter((d) => d.calorias > 0);
  const mediaKcal = comFoto.length ? Math.round(comFoto.reduce((s, d) => s + d.calorias, 0) / comFoto.length / 10) * 10 : 0;

  const linhas = [
    `Resumo da dieta — ${de} a ${ate}`,
    `Plano: ${nomeDoPlano}`,
    "",
    `Refeições marcadas: ${marcadas}`,
    `• Segui o plano: ${seguiu} (${pct(seguiu, marcadas)})`,
    `• Troquei: ${trocou} (${pct(trocou, marcadas)})`,
    `• Pulei: ${pulou} (${pct(pulou, marcadas)})`,
    "",
    `Água: média de ${litros(mediaAgua)} por dia; meta de ${litros(metaDeAgua)} batida em ${naMeta} de ${comAlgo.length} dias.`,
  ];
  linhas.push(...extras);
  if (mediaKcal) linhas.push(`Fotos dos pratos: ≈ ${mediaKcal.toLocaleString("pt-BR")} kcal por dia (estimativa, em ${comFoto.length} dias com foto).`);

  const trocas = ordem.flatMap((d) =>
    d.registros.filter((r) => r.estado === "trocou" && r.nota).map((r) => `• ${diaCurto(d.dia)}, ${r.nome} (${horaFalada(r.horario)}): ${r.nota}`),
  );
  if (trocas.length) linhas.push("", "O que troquei:", ...trocas.slice(-15));

  const puladas = new Map<string, number>();
  for (const d of comAlgo) for (const r of d.registros) if (r.estado === "pulou") puladas.set(r.nome, (puladas.get(r.nome) ?? 0) + 1);
  if (puladas.size) {
    const lista = [...puladas].sort((a, b) => b[1] - a[1]).map(([nome, n]) => `${nome} (${n}×)`);
    linhas.push("", `Refeições que mais pulei: ${lista.join(", ")}`);
  }

  const mal = new Map<string, number>();
  for (const d of comAlgo) for (const r of d.registros) if (r.humor === "mal") mal.set(r.nome, (mal.get(r.nome) ?? 0) + 1);
  if (mal.size) {
    const lista = [...mal].sort((a, b) => b[1] - a[1]).map(([nome, n]) => `${nome} (${n}×)`);
    linhas.push(`Com fome demais ou ansiedade: ${lista.join(", ")}`);
  }
  return linhas.join("\n");
}

/**
 * O resumo da semana, numa notificação: quanto seguiu, a água e UM ponto de
 * atenção — o que mais pesou. Uma lista de cinco problemas não muda nada; um,
 * dito com clareza, muda.
 */
export function resumoDaSemana(dias: DiaDoRelatorio[], metaDeAgua: number): string {
  const seguiu = dias.reduce((s, d) => s + d.seguiu, 0);
  const marcadas = dias.reduce((s, d) => s + d.seguiu + d.trocou + d.pulou, 0);
  const naMeta = dias.filter((d) => d.agua >= metaDeAgua).length;
  const partes = [marcadas ? `${pct(seguiu, marcadas)} no plano` : "nenhuma refeição marcada", `água na meta em ${naMeta} de ${dias.length} dias`];

  const contar = (estado: string) => {
    const m = new Map<string, number>();
    for (const d of dias) for (const r of d.registros) if (r.estado === estado) m.set(r.nome, (m.get(r.nome) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1])[0];
  };
  const pulada = contar("pulou");
  const trocada = contar("trocou");
  let atencao = "";
  if (pulada && pulada[1] >= 2) atencao = `⚠️ você pulou o ${pulada[0].toLowerCase()} ${pulada[1]}×`;
  else if (trocada && trocada[1] >= 3) atencao = `⚠️ o ${trocada[0].toLowerCase()} foi trocado ${trocada[1]}×`;
  else if (naMeta < Math.ceil(dias.length / 2)) atencao = "⚠️ a água ficou abaixo da meta na maior parte dos dias";
  else if (marcadas && seguiu / marcadas >= 0.8) atencao = "🎉 semana redonda";
  return [partes.join(" · "), atencao].filter(Boolean).join(" — ");
}

/** "Peso: 72,4 kg (−0,6 kg na semana)" a partir das medidas (mais nova primeiro). */
export function linhaDoPeso(medidas: { dia: string; peso: number | null }[], desde: string): string[] {
  const comPeso = medidas.filter((m) => m.peso != null);
  const atual = comPeso[0];
  if (!atual) return [];
  const antes = comPeso.find((m) => m.dia < desde);
  const kg = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (!antes) return [`Peso: ${kg(atual.peso!)} kg (${diaCurto(atual.dia)})`];
  const d = atual.peso! - antes.peso!;
  return [`Peso: ${kg(atual.peso!)} kg (${d > 0 ? "+" : d < 0 ? "−" : "±"}${kg(Math.abs(d))} kg desde ${diaCurto(antes.dia)})`];
}
