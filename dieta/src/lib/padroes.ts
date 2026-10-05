import { diaDaSemana, horaFalada, paraHora, paraMinutos, SEMANA, somarDias } from "./datas";

/**
 * O olhar de longe: o calendário do mês, o resumo do mês e os padrões que só
 * aparecem com várias semanas de registro ("o almoço vive atrasando", "sábado
 * é o dia difícil"). Tudo conta pura, sem banco, para dar para testar.
 */

export type RegistroParaPadrao = { nome: string; horario: string; estado: string; nota: string; humor: string; hora: string };

export type DiaParaPadrao = {
  dia: string;
  seguiu: number;
  trocou: number;
  pulou: number;
  agua: number;
  calorias: number;
  /** Fotos do dia: nome da refeição e hora (a hora real de comer). */
  fotos: { nome: string; hora: string }[];
  registros: RegistroParaPadrao[];
};

// ---------------------------------------------------------------------------
// Calendário
// ---------------------------------------------------------------------------

export type Cor = "bom" | "parcial" | "ruim" | "so-agua" | "vazio";

/**
 * A cor de um dia no calendário. Verde = 80% ou mais seguindo o plano (a mesma
 * régua da sequência), amarelo = metade ou mais, vermelho = menos que isso.
 * Dia sem refeição marcada, mas com água ou foto, fica cinza: teve uso, mas
 * não dá para dizer se foi bom.
 */
export function corDoDia(d: Pick<DiaParaPadrao, "seguiu" | "trocou" | "pulou" | "agua"> & { fotos: unknown[] }): Cor {
  const total = d.seguiu + d.trocou + d.pulou;
  if (total === 0) return d.agua > 0 || d.fotos.length > 0 ? "so-agua" : "vazio";
  const f = d.seguiu / total;
  return f >= 0.8 ? "bom" : f >= 0.5 ? "parcial" : "ruim";
}

/** "2026-10" → as semanas do mês (domingo a sábado), com null fora do mês. */
export function semanasDoMes(mes: string): (string | null)[][] {
  const primeiro = `${mes}-01`;
  const semanas: (string | null)[][] = [];
  let semana: (string | null)[] = Array(diaDaSemana(primeiro)).fill(null);
  for (let dia = primeiro; dia.startsWith(mes); dia = somarDias(dia, 1)) {
    semana.push(dia);
    if (semana.length === 7) {
      semanas.push(semana);
      semana = [];
    }
  }
  if (semana.length) semanas.push([...semana, ...Array(7 - semana.length).fill(null)]);
  return semanas;
}

/** "2026-10" + n meses → "2026-11". */
export function somarMeses(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
/** "2026-10" → "outubro de 2026". */
export const mesPorExtenso = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;

export const ehMes = (s: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

/** O último dia do mês ("2026-02" → "2026-02-28"). */
export const ultimoDiaDoMes = (mes: string) => somarDias(`${somarMeses(mes, 1)}-01`, -1);

// ---------------------------------------------------------------------------
// Resumo de um período (mês ou semana)
// ---------------------------------------------------------------------------

export type Resumo = {
  /** Dias com alguma coisa registrada. */
  diasUsados: number;
  diasBons: number;
  seguiu: number;
  trocou: number;
  pulou: number;
  mediaAgua: number;
  diasNaMetaDeAgua: number;
  mediaKcal: number;
  diasComFoto: number;
  fotos: number;
};

export function resumir(dias: DiaParaPadrao[], metaDeAgua: number): Resumo {
  const usados = dias.filter((d) => corDoDia(d) !== "vazio");
  const comAgua = usados.filter((d) => d.agua > 0);
  const comKcal = usados.filter((d) => d.calorias > 0);
  const soma = (l: DiaParaPadrao[], f: (d: DiaParaPadrao) => number) => l.reduce((s, d) => s + f(d), 0);
  return {
    diasUsados: usados.length,
    diasBons: usados.filter((d) => corDoDia(d) === "bom").length,
    seguiu: soma(usados, (d) => d.seguiu),
    trocou: soma(usados, (d) => d.trocou),
    pulou: soma(usados, (d) => d.pulou),
    mediaAgua: comAgua.length ? Math.round(soma(comAgua, (d) => d.agua) / comAgua.length / 50) * 50 : 0,
    diasNaMetaDeAgua: usados.filter((d) => d.agua >= metaDeAgua).length,
    mediaKcal: comKcal.length ? Math.round(soma(comKcal, (d) => d.calorias) / comKcal.length / 10) * 10 : 0,
    diasComFoto: usados.filter((d) => d.fotos.length > 0).length,
    fotos: soma(usados, (d) => d.fotos.length),
  };
}

// ---------------------------------------------------------------------------
// Padrões
// ---------------------------------------------------------------------------

export type Padrao = { icone: string; texto: string };

const mediana = (l: number[]) => {
  const o = [...l].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : Math.round((o[m - 1] + o[m]) / 2);
};

/** 75 → "1h15", 40 → "40 min". */
export function duracao(min: number): string {
  const m = Math.abs(Math.round(min / 5) * 5);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${String(r).padStart(2, "0")}` : `${h}h`;
}

/**
 * A hora em que cada refeição aconteceu de fato: a da foto do prato, quando
 * houver (é a mais fiel), senão a hora em que foi marcada no próprio dia.
 */
function horaReal(d: DiaParaPadrao, r: RegistroParaPadrao): string {
  const foto = d.fotos.find((f) => f.nome === r.nome);
  return foto?.hora || r.hora;
}

/**
 * Os padrões dos dias, do mais forte para o mais fraco, no máximo `limite`.
 * Cada um só aparece com dados suficientes para não ser coincidência: três
 * vezes ou mais, e uma diferença que valha a pena dizer.
 */
export function padroes(dias: DiaParaPadrao[], limite = 5): Padrao[] {
  const achados: { peso: number; p: Padrao }[] = [];
  const marcados = dias.filter((d) => d.registros.length > 0);

  // Horário: refeição que acontece bem depois (ou antes) do combinado.
  const atrasos = new Map<string, { horario: string; minutos: number[] }>();
  for (const d of marcados) {
    for (const r of d.registros) {
      if (r.estado === "pulou") continue;
      const real = paraMinutos(horaReal(d, r));
      const previsto = paraMinutos(r.horario);
      if (real == null || previsto == null) continue;
      const delta = real - previsto;
      if (Math.abs(delta) > 6 * 60) continue; // marcou de noite o café da manhã: não é atraso
      const a = atrasos.get(r.nome) ?? { horario: r.horario, minutos: [] };
      a.minutos.push(delta);
      atrasos.set(r.nome, a);
    }
  }
  for (const [nome, a] of atrasos) {
    if (a.minutos.length < 3) continue;
    const m = mediana(a.minutos);
    if (Math.abs(m) < 30) continue;
    const real = (((paraMinutos(a.horario)! + m) % 1440) + 1440) % 1440;
    const hora = paraHora(real);
    achados.push({
      peso: Math.abs(m) / 30,
      p: {
        icone: "⏰",
        texto: `${nome}: costuma acontecer ${duracao(m)} ${m > 0 ? "depois" : "antes"} do horário (${horaFalada(a.horario)} no plano, ~${horaFalada(hora)} na prática).`,
      },
    });
  }

  // A refeição mais pulada.
  const porRefeicao = new Map<string, { total: number; pulou: number; trocou: number; mal: number }>();
  for (const d of marcados) {
    for (const r of d.registros) {
      const c = porRefeicao.get(r.nome) ?? { total: 0, pulou: 0, trocou: 0, mal: 0 };
      c.total++;
      if (r.estado === "pulou") c.pulou++;
      if (r.estado === "trocou") c.trocou++;
      if (r.humor === "mal") c.mal++;
      porRefeicao.set(r.nome, c);
    }
  }
  for (const [nome, c] of porRefeicao) {
    if (c.total >= 3 && c.pulou >= 2 && c.pulou / c.total >= 0.25) {
      achados.push({ peso: 2 + c.pulou / c.total, p: { icone: "⚠️", texto: `${nome}: pulado em ${c.pulou} de ${c.total} dias.` } });
    } else if (c.total >= 3 && c.trocou >= 3 && c.trocou / c.total >= 0.4) {
      achados.push({ peso: 1.5 + c.trocou / c.total, p: { icone: "🔁", texto: `${nome}: trocado em ${c.trocou} de ${c.total} dias — vale conversar com a nutricionista sobre ele.` } });
    }
    if (c.mal >= 2) {
      achados.push({ peso: 1.5 + c.mal / c.total, p: { icone: "😣", texto: `${nome}: ${c.mal} vezes com fome demais ou ansiedade.` } });
    }
  }

  // O dia da semana mais difícil.
  const porSemana = Array.from({ length: 7 }, () => ({ seguiu: 0, total: 0, dias: 0 }));
  for (const d of marcados) {
    const s = porSemana[diaDaSemana(d.dia)];
    s.seguiu += d.seguiu;
    s.total += d.seguiu + d.trocou + d.pulou;
    s.dias++;
  }
  const geral = porSemana.reduce((a, s) => ({ seguiu: a.seguiu + s.seguiu, total: a.total + s.total }), { seguiu: 0, total: 0 });
  if (geral.total >= 10) {
    let pior = -1;
    let piorFracao = 1;
    porSemana.forEach((s, i) => {
      if (s.dias >= 2 && s.total > 0 && s.seguiu / s.total < piorFracao) {
        pior = i;
        piorFracao = s.seguiu / s.total;
      }
    });
    if (pior >= 0) {
      const resto = { seguiu: geral.seguiu - porSemana[pior].seguiu, total: geral.total - porSemana[pior].total };
      const fracaoResto = resto.total ? resto.seguiu / resto.total : 0;
      if (fracaoResto - piorFracao >= 0.25) {
        const plural = `${SEMANA[pior]}s`;
        achados.push({
          peso: 2 + (fracaoResto - piorFracao) * 2,
          p: {
            icone: "📅",
            texto: `${plural.charAt(0).toUpperCase() + plural.slice(1)} são o dia mais difícil: ${Math.round(piorFracao * 100)}% no plano, contra ${Math.round(fracaoResto * 100)}% no resto da semana.`,
          },
        });
      }
    }
  }

  // Fim de semana com mais calorias que a semana (pelas fotos).
  const kcal = (fds: boolean) => dias.filter((d) => d.calorias > 0 && [0, 6].includes(diaDaSemana(d.dia)) === fds).map((d) => d.calorias);
  const fds = kcal(true);
  const util = kcal(false);
  if (fds.length >= 2 && util.length >= 3) {
    const mf = fds.reduce((a, b) => a + b, 0) / fds.length;
    const mu = util.reduce((a, b) => a + b, 0) / util.length;
    if (mf >= mu * 1.2) {
      achados.push({ peso: 1 + mf / mu - 1, p: { icone: "🍕", texto: `No fim de semana as fotos somam ~${Math.round((mf / mu - 1) * 100)}% mais calorias que nos dias úteis.` } });
    }
  }

  // E o que vai bem, para não ser só bronca.
  const pontual = [...atrasos].filter(([, a]) => a.minutos.length >= 5 && Math.abs(mediana(a.minutos)) <= 15).map(([n]) => n);
  if (pontual.length) achados.push({ peso: 0.5, p: { icone: "✅", texto: `Em dia com o horário: ${pontual.join(", ")}.` } });

  return achados
    .sort((a, b) => b.peso - a.peso)
    .slice(0, limite)
    .map((a) => a.p);
}

// ---------------------------------------------------------------------------
// Humor
// ---------------------------------------------------------------------------

export const HUMORES = {
  bem: { emoji: "😌", rotulo: "Tranquilo" },
  ok: { emoji: "😐", rotulo: "Normal" },
  mal: { emoji: "😣", rotulo: "Fome/ansiedade" },
} as const;
export type Humor = keyof typeof HUMORES;
export const ehHumor = (s: string): s is Humor => s in HUMORES;
