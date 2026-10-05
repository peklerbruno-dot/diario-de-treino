import "server-only";
import { lerAjustes, type Ajustes } from "./ajustes";
import { normalizarAnalise, somarDia, type Analise } from "./analise";
import type { RefeicaoDoPlano } from "./agenda";
import { bd } from "./bd";
import { escreverTexto, normalizarConteudo } from "./conteudo";
import type { RefeicaoPadrao } from "./refeicoes-padrao";
import { normalizarPlanejamento } from "./semana";
import { paraMinutos, somarDias } from "./datas";

/** As leituras do banco que mais de uma tela usa. */

export type RefeicaoCompleta = RefeicaoDoPlano & { nota: string; ordem: number };
export type PlanoCompleto = {
  id: string;
  nome: string;
  orientacoes: string;
  criadoEm: Date;
  refeicoes: RefeicaoCompleta[];
};

const porHorario = (a: { horario: string; ordem: number }, b: { horario: string; ordem: number }) =>
  (paraMinutos(a.horario) ?? 0) - (paraMinutos(b.horario) ?? 0) || a.ordem - b.ordem;

export async function planoAtivo(): Promise<PlanoCompleto | null> {
  const p = await bd.plano.findFirst({
    where: { ativo: true },
    orderBy: { criadoEm: "desc" },
    include: { refeicoes: true },
  });
  if (!p) return null;
  return {
    id: p.id,
    nome: p.nome,
    orientacoes: p.orientacoes,
    criadoEm: p.criadoEm,
    refeicoes: p.refeicoes
      .map((r) => ({
        id: r.id,
        nome: r.nome,
        horario: r.horario,
        ordem: r.ordem,
        conteudo: normalizarConteudo(r.conteudo),
        nota: r.nota,
        dias: r.dias,
        avisar: r.avisar,
      }))
      .sort(porHorario),
  };
}

/** As refeições padrão cadastradas, para as telas que as listam ou escolhem. */
export async function refeicoesPadrao(): Promise<RefeicaoPadrao[]> {
  const lista = await bd.refeicaoPadrao.findMany({ orderBy: [{ vezes: "desc" }, { titulo: "asc" }] });
  return lista.map((p) => ({
    id: p.id,
    refeicao: p.refeicao,
    titulo: p.titulo,
    itens: p.itens,
    calorias: p.calorias,
    proteinas: p.proteinas,
    carboidratos: p.carboidratos,
    gorduras: p.gorduras,
    seguePlano: p.seguePlano,
    vezes: p.vezes,
  }));
}

export async function ajustes(): Promise<Ajustes> {
  return lerAjustes(await bd.ajuste.findMany());
}

export type Marca = { estado: "seguiu" | "trocou" | "pulou"; nota: string; humor?: string; padraoId?: string };

export type FotoDoDia = {
  id: string;
  dia: string;
  hora: string;
  refeicaoId: string | null;
  nome: string;
  analise: Analise | null;
  /** Falso = anotação só em texto, sem foto. */
  temImagem: boolean;
  /** O que foi escrito, nas anotações sem foto. */
  texto: string;
};

const CAMPOS_DA_FOTO = { id: true, dia: true, hora: true, refeicaoId: true, nome: true, analise: true, tipo: true, texto: true } as const;
const paraFotoDoDia = ({ tipo, analise, ...f }: { tipo: string; analise: unknown } & Omit<FotoDoDia, "analise" | "temImagem">): FotoDoDia => ({
  ...f,
  analise: normalizarAnalise(analise),
  temImagem: tipo !== "",
});

/** As fotos de um intervalo de dias, sem a imagem (que vem por /api/foto/[id]). */
async function fotosEntre(desde: string, ate: string): Promise<FotoDoDia[]> {
  const fotos = await bd.foto.findMany({
    where: { dia: { gte: desde, lte: ate } },
    orderBy: [{ dia: "desc" }, { hora: "asc" }],
    select: CAMPOS_DA_FOTO,
  });
  return fotos.map(paraFotoDoDia);
}

/** O que já foi marcado num dia, por id de refeição, a água e as fotos do dia. */
export async function situacaoDoDia(dia: string) {
  const [registros, agua, fotos] = await Promise.all([
    bd.registro.findMany({ where: { dia } }),
    bd.agua.aggregate({ where: { dia }, _sum: { ml: true } }),
    fotosEntre(dia, dia),
  ]);
  const marcas: Record<string, Marca> = {};
  for (const r of registros) {
    marcas[r.refeicaoId] = { estado: r.estado as Marca["estado"], nota: r.nota, humor: r.humor, padraoId: r.padraoId };
  }
  return { marcas, agua: agua._sum.ml ?? 0, fotos };
}

export type DiaDoHistorico = {
  dia: string;
  seguiu: number;
  trocou: number;
  pulou: number;
  agua: number;
  /** Soma das estimativas das fotos do dia. */
  calorias: number;
  fotos: FotoDoDia[];
  registros: { refeicaoId: string; nome: string; horario: string; estado: string; nota: string; humor: string; hora: string }[];
};

/** Os últimos `n` dias, do mais novo para o mais velho, terminando em `ate`. */
export async function historico(ate: string, n: number): Promise<DiaDoHistorico[]> {
  return historicoEntre(somarDias(ate, -(n - 1)), ate);
}

/** Os dias de `desde` a `ate` (inclusive), do mais novo para o mais velho. */
export async function historicoEntre(desde: string, ate: string): Promise<DiaDoHistorico[]> {
  let n = 0;
  for (let d = desde; d <= ate && n < 400; d = somarDias(d, 1)) n++;
  const [registros, agua, fotos] = await Promise.all([
    bd.registro.findMany({ where: { dia: { gte: desde, lte: ate } }, orderBy: { horario: "asc" } }),
    bd.agua.groupBy({ by: ["dia"], where: { dia: { gte: desde, lte: ate } }, _sum: { ml: true } }),
    fotosEntre(desde, ate),
  ]);
  const dias: DiaDoHistorico[] = [];
  for (let i = 0; i < n; i++) {
    const dia = somarDias(ate, -i);
    const doDia = registros.filter((r) => r.dia === dia);
    const fotosDoDia = fotos.filter((f) => f.dia === dia);
    dias.push({
      dia,
      seguiu: doDia.filter((r) => r.estado === "seguiu").length,
      trocou: doDia.filter((r) => r.estado === "trocou").length,
      pulou: doDia.filter((r) => r.estado === "pulou").length,
      agua: agua.find((a) => a.dia === dia)?._sum.ml ?? 0,
      calorias: somarDia(fotosDoDia.map((f) => f.analise)).calorias,
      fotos: fotosDoDia,
      registros: doDia.map((r) => ({ refeicaoId: r.refeicaoId, nome: r.nome, horario: r.horario, estado: r.estado, nota: r.nota, humor: r.humor, hora: r.hora })),
    });
  }
  return dias;
}

/** Um dia só, com o peso anotado nele. */
export async function umDia(dia: string) {
  const [[d], medida] = await Promise.all([historicoEntre(dia, dia), bd.medida.findFirst({ where: { dia }, orderBy: { criadoEm: "desc" } })]);
  return { ...d, peso: medida?.pesoG == null ? null : medida.pesoG / 1000 };
}

/**
 * As fotos dos pratos, da mais nova para a mais velha, de `porPagina` em
 * `porPagina`. `antesDe` é o "dia|hora|id" da última foto da página anterior.
 */
export async function galeria({ nome, antesDe, porPagina = 60 }: { nome?: string; antesDe?: string; porPagina?: number }) {
  const [dia, hora, id] = (antesDe ?? "").split("|");
  const depois = dia && hora && id
    ? { OR: [{ dia: { lt: dia } }, { dia, hora: { lt: hora } }, { dia, hora, id: { lt: id } }] }
    : {};
  const fotos = await bd.foto.findMany({
    // Só as fotos de verdade: as anotações em texto ficam no dia, não na galeria.
    where: { tipo: { not: "" }, ...(nome ? { nome } : {}), ...depois },
    orderBy: [{ dia: "desc" }, { hora: "desc" }, { id: "desc" }],
    take: porPagina + 1,
    select: CAMPOS_DA_FOTO,
  });
  const pagina = fotos.slice(0, porPagina).map(paraFotoDoDia);
  const ultima = pagina.at(-1);
  return { fotos: pagina, proxima: fotos.length > porPagina && ultima ? `${ultima.dia}|${ultima.hora}|${ultima.id}` : null };
}

/** Os nomes de refeição que aparecem nas fotos (para o filtro da galeria). */
export async function nomesDasFotos(): Promise<string[]> {
  const g = await bd.foto.groupBy({ by: ["nome"], where: { tipo: { not: "" } }, _count: { _all: true }, orderBy: { _count: { nome: "desc" } } });
  return g.map((x) => x.nome).filter(Boolean);
}

export type FotoDoCorpo = { id: string; dia: string; nota: string };

export async function fotosDoCorpo(): Promise<FotoDoCorpo[]> {
  return bd.fotoCorpo.findMany({ orderBy: [{ dia: "asc" }, { criadoEm: "asc" }], select: { id: true, dia: true, nota: true } });
}

export async function lembretes() {
  return bd.lembrete.findMany({ orderBy: [{ horario: "asc" }, { criadoEm: "asc" }] });
}

/** O plano em uso, em texto — o contexto que o Gemini recebe. */
export function planoEmTexto(p: PlanoCompleto) {
  return {
    orientacoes: p.orientacoes,
    refeicoes: p.refeicoes.map((r) => ({ nome: r.nome, horario: r.horario, texto: escreverTexto(r.conteudo), nota: r.nota })),
  };
}

export type MedidaVista = { id: string; dia: string; peso: number | null; cintura: number | null; quadril: number | null; braco: number | null; nota: string };

/** As medidas, da mais nova para a mais velha. Peso em kg, medidas em cm. */
export async function medidas(limite = 120): Promise<MedidaVista[]> {
  const linhas = await bd.medida.findMany({ orderBy: [{ dia: "desc" }, { criadoEm: "desc" }], take: limite });
  const cm = (mm: number | null) => (mm == null ? null : mm / 10);
  return linhas.map((m) => ({
    id: m.id,
    dia: m.dia,
    peso: m.pesoG == null ? null : m.pesoG / 1000,
    cintura: cm(m.cinturaMm),
    quadril: cm(m.quadrilMm),
    braco: cm(m.bracoMm),
    nota: m.nota,
  }));
}

/** O planejamento de semana mais recente. */
export async function semanaAtual() {
  const s = await bd.semana.findFirst({ orderBy: { criadoEm: "desc" } });
  if (!s) return null;
  const dados = normalizarPlanejamento(s.dados);
  return dados ? { id: s.id, inicio: s.inicio, criadoEm: s.criadoEm.toISOString(), dados, marcados: s.marcados } : null;
}
