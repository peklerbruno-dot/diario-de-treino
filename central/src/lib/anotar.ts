import { somarDias } from "./datas";

/**
 * O "Anotar": você escreve como escreveria no WhatsApp ("mandar orçamento pro
 * CEJ até quinta") e daqui sai a tarefa e o prazo. Sem IA — umas poucas
 * formas de dizer data, que cobrem quase tudo, e nenhum gasto de cota.
 * Puro, testado em anotar.test.ts.
 */

const DIAS_DA_SEMANA: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

/** Tira acento e põe em minúsculas, mantendo o tamanho (para os índices baterem). */
const simples = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const PREPOSICAO = String.raw`(?:(?:ate|para|pra|na|no|em|de|do|da)\s+)?(?:(?:o|a)\s+)?`;

const diaDaSemana = (dia: string) => new Date(`${dia}T12:00:00Z`).getUTCDay();

/** O próximo dia da semana `alvo` depois de hoje (hoje não conta). */
function proximo(hoje: string, alvo: number): string {
  const falta = (alvo - diaDaSemana(hoje) + 7) % 7 || 7;
  return somarDias(hoje, falta);
}

function dataValida(a: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

/** As formas de dizer data, cada uma com o que ela quer dizer a partir de hoje. */
const FORMAS: { re: RegExp; dia: (m: RegExpMatchArray, hoje: string) => string | null }[] = [
  { re: /depois de amanha/, dia: (_, h) => somarDias(h, 2) },
  { re: /amanha/, dia: (_, h) => somarDias(h, 1) },
  { re: /hoje/, dia: (_, h) => h },
  { re: /(?:semana que vem|proxima semana)/, dia: (_, h) => proximo(h, 1) },
  { re: /fim de semana/, dia: (_, h) => (diaDaSemana(h) === 6 ? h : proximo(h, 6)) },
  {
    re: /fim do mes/,
    dia: (_, h) => {
      const [a, m] = h.split("-").map(Number);
      return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
    },
  },
  {
    re: /(?:proxima\s+)?(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?(?:\s+que vem)?/,
    dia: (m, h) => proximo(h, DIAS_DA_SEMANA[m[1]]),
  },
  {
    re: /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/,
    dia: (m, h) => {
      const [aHoje] = h.split("-").map(Number);
      const d = Number(m[1]);
      const mes = Number(m[2]);
      if (m[3]) return dataValida(m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]), mes, d);
      const neste = dataValida(aHoje, mes, d);
      return neste && neste < h ? dataValida(aHoje + 1, mes, d) : neste;
    },
  },
  {
    re: /dia (\d{1,2})/,
    dia: (m, h) => {
      const [a, mes] = h.split("-").map(Number);
      const d = Number(m[1]);
      const neste = dataValida(a, mes, d);
      if (neste && neste >= h) return neste;
      return mes === 12 ? dataValida(a + 1, 1, d) : dataValida(a, mes + 1, d);
    },
  },
];

export interface Anotacao {
  titulo: string;
  /** "AAAA-MM-DD", ou null se o texto não diz data. */
  prazo: string | null;
}

export function entenderAnotacao(texto: string, hoje: string): Anotacao {
  const original = texto.replace(/\s+/g, " ").trim();
  const base = simples(original);
  for (const f of FORMAS) {
    const re = new RegExp(String.raw`(?:^|\s|,)${PREPOSICAO}${f.re.source}(?=$|[\s,.!?;])`);
    const m = base.match(re);
    if (!m || m.index === undefined) continue;
    const interno = m[0].match(f.re)!;
    const prazo = f.dia(interno, hoje);
    if (!prazo) continue;
    const titulo = (original.slice(0, m.index) + " " + original.slice(m.index + m[0].length))
      .replace(/\s+([,.!?;])/g, "$1")
      .replace(/\s+/g, " ")
      .replace(/^[\s,;.-]+|[\s,;-]+$/g, "")
      .trim();
    return { titulo: titulo ? titulo[0].toUpperCase() + titulo.slice(1) : original, prazo };
  }
  return { titulo: original ? original[0].toUpperCase() + original.slice(1) : "", prazo: null };
}
