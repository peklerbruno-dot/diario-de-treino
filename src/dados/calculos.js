// Contas e formatações do protótipo, separadas das telas.
// Recebem sempre a lista de sessões: quem lê do banco é a tela.

export const fmt = (iso) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

export const fmtLonga = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

export const mesNome = (ym) => new Date(ym + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "long" });

/** Carga total levantada numa sessão de musculação (kg × reps, somando as séries). */
export const volume = (s) =>
  (s.itens || []).reduce(
    (t, it) => t + (it.series || []).reduce((a, r) => a + (Number(r.carga) || 0) * (Number(r.reps) || 0), 0),
    0
  );

/** Número no jeito brasileiro: 57.5 vira "57,5" e 1200 vira "1.200". */
export const numBR = (v) => (Number(v) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export const metros = (s) => (s.itens || []).reduce((t, it) => t + (Number(it.metros) || 0), 0);

/** Uma linha curta com o que a sessão rendeu, conforme a modalidade. */
export const resumo = (s) =>
  s.mod === "musc"
    ? `${volume(s).toLocaleString("pt-BR")} kg`
    : s.mod === "natacao"
      ? `${numBR(metros(s))} m`
      : `${s.duracaoMin || 0} min`;

/** Segunda-feira da semana daquela data. */
export const semanaDe = (iso) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

export const mesAnteriorDe = (ym) => {
  const d = new Date(ym + "-15T12:00:00");
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
};

/**
 * A série mais pesada da última vez que esse exercício foi registrado.
 * Com `antesDe`, olha só o que veio antes daquela data — é o que preenche as cargas
 * ao começar um treino e a linha "Último treino (dd/mm)".
 */
export const ultimaSerieDe = (sessoes, exId, antesDe) => {
  const s = sessoes
    .filter((x) => x.mod === "musc" && (!antesDe || x.data < antesDe))
    .sort((a, b) => b.data.localeCompare(a.data))
    .find((x) => (x.itens || []).some((i) => i.exId === exId && (i.series || []).length));
  if (!s) return null;
  const it = s.itens.find((i) => i.exId === exId);
  const best = it.series.reduce((a, r) => (Number(r.carga) > Number(a.carga) ? r : a), it.series[0]);
  return { data: s.data, carga: best.carga, reps: best.reps };
};

/** Números limpos na hora de gravar: o campo vazio vira 0. */
export const nnum = (v) => (v === "" || v === null || v === undefined ? 0 : Number(v) || 0);
