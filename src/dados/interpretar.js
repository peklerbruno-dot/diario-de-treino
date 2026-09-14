// Lê o treino escrito à mão, em português, e devolve o registro pronto para conferência.
// Roda inteiramente no aparelho: sem rede, sem chave, sem custo.
import { CATEGORIAS, norm } from "./constantes.js";

// Palavras que não ajudam a identificar o exercício.
const VAZIAS = new Set(["com", "de", "do", "da", "no", "na", "em", "a", "o", "as", "os", "e", "para", "por", "the"]);

/** Palavras que valem para reconhecer um exercício pelo nome. */
const palavrasDe = (nome) =>
  norm(nome)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !VAZIAS.has(w));

const raiz = (w) => w.replace(/s$/, "");

/** A palavra aparece no texto, tolerando o plural dos dois lados. */
const temPalavra = (texto, palavra) => new RegExp(`(?:^|[^a-z0-9])${raiz(palavra)}s?(?:[^a-z0-9]|$)`).test(texto);

const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------- data

const DIAS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

/** Acha a data escrita no texto e devolve também o texto sem ela. */
function acharData(t, hoje) {
  const base = new Date(hoje + "T12:00:00");
  const recuar = (n) => {
    const d = new Date(base);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  let m = t.match(/\banteontem\b/);
  if (m) return { data: recuar(2), resto: t.replace(m[0], " ") };
  m = t.match(/\bontem\b/);
  if (m) return { data: recuar(1), resto: t.replace(m[0], " ") };
  m = t.match(/\bhoje\b/);
  if (m) return { data: hoje, resto: t.replace(m[0], " ") };

  // "12/09", "12/9/2026", "dia 12" — com dia e mês plausíveis, senão "50/55/60" viraria data
  m = t.match(/\b([0-3]?\d)\/([01]?\d)(?:\/(\d{2,4}))?\b/);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 31 && Number(m[2]) >= 1 && Number(m[2]) <= 12) {
    const ano = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : base.getFullYear();
    const d = new Date(Date.UTC(ano, Number(m[2]) - 1, Number(m[1]), 12));
    // sem ano escrito, uma data à frente de hoje é do ano passado
    if (!m[3] && d.toISOString().slice(0, 10) > hoje) d.setUTCFullYear(ano - 1);
    return { data: d.toISOString().slice(0, 10), resto: t.replace(m[0], " ") };
  }
  m = t.match(/\bdia\s+(\d{1,2})\b/);
  if (m) {
    const d = new Date(base);
    d.setDate(Number(m[1]));
    let iso = d.toISOString().slice(0, 10);
    if (iso > hoje) {
      d.setMonth(d.getMonth() - 1);
      iso = d.toISOString().slice(0, 10);
    }
    return { data: iso, resto: t.replace(m[0], " ") };
  }

  // "sábado", "na terça" — o mais recente que já passou
  for (let i = 0; i < DIAS.length; i++) {
    const re = new RegExp(`\\b(?:${DIAS[i]}(?:-feira)?)\\b`);
    if (re.test(t)) {
      const diff = (base.getDay() - i + 7) % 7 || 7;
      return { data: recuar(diff), resto: t.replace(re, " ") };
    }
  }
  return { data: hoje, resto: t };
}

// ------------------------------------------------------------ números

const numero = (s) => Number(String(s).replace(",", "."));

/** "50/55/60" e "50 55 60" viram uma carga por série. */
const listaDeCargas = (s) =>
  s
    .split(/[\/|]|\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map(numero)
    .filter((n) => !Number.isNaN(n));

/**
 * Tira de um trecho as séries, as repetições e a carga.
 * Entende "3x10", "3 de 10", "4 séries de 8", "com 50 kg", "a 60 quilos", "3x12 45".
 */
function medidas(trecho) {
  let resto = ` ${trecho} `;
  let series = null;
  let reps = null;
  let cargas = [];

  let m = resto.match(/(\d+)\s*(?:x|×)\s*(\d+)/);
  if (!m) m = resto.match(/(\d+)\s*(?:series?|serie|sets?)?\s*(?:de|por)\s+(\d+)/);
  if (m) {
    series = Number(m[1]);
    reps = Number(m[2]);
    resto = resto.replace(m[0], " ");
  } else {
    const r = resto.match(/(\d+)\s*(?:repeticoes|repeticao|reps|rep)\b/);
    if (r) {
      reps = Number(r[1]);
      resto = resto.replace(r[0], " ");
    }
    const s = resto.match(/(\d+)\s*(?:series|serie|sets|set)\b/);
    if (s) {
      series = Number(s[1]);
      resto = resto.replace(s[0], " ");
    }
  }

  // carga com unidade escrita
  let c = resto.match(/(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)*)\s*(?:kgs?|quilos?|kilos?|k)\b/);
  if (!c) c = resto.match(/(?:com|a|@)\s+(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)*)/);
  if (!c) c = resto.match(/(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)*)\s*$/);
  if (c) cargas = listaDeCargas(c[1]);

  return { series, reps, cargas };
}

// -------------------------------------------------- achar o exercício

/** O exercício da biblioteca mais parecido com o trecho. Empate: o primeiro da lista. */
function acharExercicio(trecho, candidatos) {
  let melhor = null;
  for (const e of candidatos) {
    const ws = palavrasDe(e.nome);
    if (!ws.length || !temPalavra(trecho, ws[0])) continue;
    const pontos = ws.filter((w) => temPalavra(trecho, w)).length;
    if (!melhor || pontos > melhor.pontos) melhor = { ex: e, pontos, ws };
  }
  return melhor;
}

/** Tira do trecho as palavras do nome do exercício, para não confundir com os números. */
function semONome(trecho, ws) {
  let s = trecho;
  for (const w of ws) s = s.replace(new RegExp(`(?:^|[^a-z0-9])${raiz(w)}s?(?=[^a-z0-9]|$)`, "g"), " ");
  return s;
}

/**
 * Reparte um trecho quando ele traz mais de um exercício sem vírgula entre eles
 * ("supino 3x10 50 puxada 3x12 45"): um exercício novo só começa depois de um número.
 */
function repartir(trecho, candidatos) {
  const inicios = new Set(candidatos.map((e) => raiz(palavrasDe(e.nome)[0] || "")).filter(Boolean));
  const cortes = [0];
  let viuExercicio = false;
  let viuNumero = false;
  for (const m of trecho.matchAll(/[a-z0-9]+/g)) {
    if (/\d/.test(m[0])) {
      viuNumero = true;
      continue;
    }
    if (inicios.has(raiz(m[0]))) {
      if (viuExercicio && viuNumero) {
        cortes.push(m.index);
        viuNumero = false;
      }
      viuExercicio = true;
    }
  }
  return cortes.map((ini, k) => trecho.slice(ini, cortes[k + 1] ?? trecho.length)).filter((s) => s.trim());
}

// ------------------------------------------------------- modalidade

const PILATES = /\b(pilates|reformer|cadillac|barrel|chair|mat)\b/;
const NATACAO = /\b(nad(?:ei|o|ar|ando)|natacao|piscina|crawl|borboleta|nado|medley|pernada|palmar|pull ?buoy)\b/;

function acharModalidade(t) {
  if (PILATES.test(t)) return "pilates";
  if (NATACAO.test(t)) return "natacao";
  // "1000 m" sem mais nada também é natação
  if (/\b\d+\s*(?:m|metros|mts)\b/.test(t) && !/\bkg|quilos?\b/.test(t)) return "natacao";
  return "musc";
}

// --------------------------------------- palpite de grupo para o que é novo

const PALPITES = [
  [/\b(supino|crucifixo|peck|crossover|peitoral|flexao)\b/, "Peito"],
  [/\b(puxada|remada|barra fixa|pulldown|terra|dorsal)\b/, "Costas"],
  [/\b(desenvolvimento|elevacao lateral|elevacao frontal|face pull|encolhimento|ombro|deltoid)\b/, "Ombros"],
  [/\b(rosca|biceps)\b/, "Bíceps"],
  [/\b(triceps|mergulho|coice)\b/, "Tríceps"],
  [/\b(agachamento|leg|extensora|hack|afundo|passada|quadriceps)\b/, "Quadríceps"],
  [/\b(stiff|flexora|posterior|bom dia)\b/, "Posterior"],
  [/\b(gluteo|pelvica|abdutora|abducao)\b/, "Glúteos"],
  [/\b(panturrilha|gemeo)\b/, "Panturrilha"],
  [/\b(abdominal|prancha|abdomen|obliquo)\b/, "Abdômen"],
];

const palpitarGrupo = (trecho, anterior) => PALPITES.find(([re]) => re.test(trecho))?.[1] || anterior || "Peito";

/** "1 hora", "1h30", "1h" — em minutos, com o trecho que casou. */
function horasEmMinutos(t) {
  const hm = t.match(/(\d+)\s*h(?:oras?)?\s*(\d{1,2})\b/);
  if (hm) return { texto: hm[0], min: Number(hm[1]) * 60 + Number(hm[2]) };
  const h = t.match(/(\d+)\s*(?:h\b|horas?\b)/);
  if (h) return { texto: h[0], min: Number(h[1]) * 60 };
  return null;
}

/** Duração escrita como "50 min", "1 hora", "1h30" ou "1h" — sempre em minutos. */
function duracaoEmMinutos(t) {
  const h = horasEmMinutos(t);
  if (h) return h.min;
  const min = t.match(/(\d+)\s*(?:min\b|minutos?\b|m\b)/);
  return min ? Number(min[1]) : null;
}

// ------------------------------------------------------------- principal

/**
 * @param texto      o que a pessoa escreveu
 * @param exercicios a biblioteca inteira
 * @param hoje       "YYYY-MM-DD"
 * @returns o rascunho da sessão, ou null se não deu para entender nada
 */
export function interpretar(texto, exercicios, hoje) {
  const bruto = String(texto || "").trim();
  if (!bruto) return null;

  // "52,5 kg" antes de separar por vírgula, senão a carga se parte em duas
  const { data, resto } = acharData(norm(bruto).replace(/(\d),(\d)/g, "$1.$2"), hoje);
  const mod = acharModalidade(resto);
  const candidatos = exercicios.filter((e) => e.mod === mod && !e.arquivado);

  // vírgula, ponto e vírgula, quebra de linha, " e ", " + "
  const trechos = resto
    .split(/[,;\n•]+|\s+e\s+|\s*\+\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (mod === "pilates") {
    const min = duracaoEmMinutos(resto);
    const aparelho = /\b(reformer|cadillac|chair|barrel|aparelho)\b/.test(resto);
    return {
      origem: "texto",
      mod,
      data,
      nome: aparelho ? "Pilates de aparelho" : /\b(mat|solo)\b/.test(resto) ? "Pilates de solo" : "Pilates",
      duracaoMin: min ?? "",
      obs: bruto,
      naoEntendi: [],
      novos: [],
    };
  }

  const itens = [];
  const naoEntendi = [];
  const novos = [];
  let ultimoGrupo = null;

  for (const trecho of trechos) {
    for (const parte of repartir(trecho, candidatos)) {
      const achado = acharExercicio(parte, candidatos);
      const semNome = achado ? semONome(parte, achado.ws) : parte;
      const temNumero = /\d/.test(semNome);

      // sem número não há o que registrar — e evita que "bom treino" case com "Bom dia"
      if (!temNumero) {
        if (parte.trim().length > 2) naoEntendi.push(parte.trim());
        continue;
      }

      if (mod === "natacao") {
        // o tempo sai primeiro, para o mesmo número não contar como metros
        // aqui "m" é sempre metro, então só minutos e horas contam como tempo
        const emHoras = horasEmMinutos(semNome);
        const tempo = semNome.match(/(\d+)\s*(?:min\b|minutos?\b|')/) || (emHoras ? [emHoras.texto, emHoras.min] : null);
        const semTempo = tempo ? semNome.replace(tempo[0], " ") : semNome;
        const km = semTempo.match(/(\d+(?:\.\d+)?)\s*(?:km|quilometros?)\b/);
        const metros = km ? null : semTempo.match(/(\d+)\s*(?:m|mts|metros)\b/) || semTempo.match(/(\d+)/);
        if (!temNumero) {
          if (parte.trim().length > 2) naoEntendi.push(parte.trim());
          continue;
        }
        const ex = achado?.ex || candidatos.find((e) => norm(e.nome) === "crawl") || candidatos[0];
        if (!ex) continue;
        itens.push({
          exId: ex.id,
          metros: km ? Math.round(Number(km[1]) * 1000) : metros ? Number(metros[1]) : "",
          tempoMin: tempo ? Number(tempo[1]) : "",
        });
        continue;
      }

      if (!achado) {
        // exercício fora da biblioteca: entra ao salvar, com um palpite de grupo
        const nome = parte.replace(/\d.*$/, "").replace(/\b(fiz|treinei|hoje|de|com|a)\b/g, " ").trim();
        if (nome.length > 2) {
          const { series, reps, cargas } = medidas(parte);
          const cat = palpitarGrupo(parte, ultimoGrupo);
          novos.push(maiuscula(nome));
          itens.push({ exId: null, nome: maiuscula(nome), cat, series: montarSeries(series, reps, cargas) });
        } else if (parte.trim()) {
          naoEntendi.push(parte.trim());
        }
        continue;
      }

      ultimoGrupo = achado.ex.cat;
      const { series, reps, cargas } = medidas(semNome);
      itens.push({ exId: achado.ex.id, series: montarSeries(series, reps, cargas) });
    }
  }

  if (!itens.length) return null;

  return {
    origem: "texto",
    mod,
    data,
    nome: nomeDoTreino(mod, itens, exercicios, data),
    itens,
    naoEntendi,
    novos,
  };
}

/** Monta as séries: uma carga por série, repetindo a última quando faltar. */
function montarSeries(series, reps, cargas) {
  const n = series || cargas.length || 1;
  return Array.from({ length: n }, (_, k) => ({
    carga: cargas.length ? (cargas[k] ?? cargas[cargas.length - 1]) : "",
    reps: reps ?? "",
  }));
}

function nomeDoTreino(mod, itens, exercicios, data) {
  if (mod === "natacao") return "Natação";
  const cats = [];
  for (const it of itens) {
    const cat = it.cat || exercicios.find((e) => e.id === it.exId)?.cat;
    if (cat && !cats.includes(cat)) cats.push(cat);
  }
  if (!cats.length || cats.length > 3) {
    const [, m, d] = data.split("-");
    return `Treino de ${d}/${m}`;
  }
  return cats.length === 1 ? cats[0] : `${cats.slice(0, -1).join(", ")} e ${cats[cats.length - 1]}`;
}
