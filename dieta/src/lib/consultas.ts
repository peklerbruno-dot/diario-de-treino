import "server-only";
import { lerAjustes, type Ajustes } from "./ajustes";
import { normalizarAnalise, somarDia, type Analise } from "./analise";
import type { RefeicaoDoPlano } from "./agenda";
import { bd } from "./bd";
import { escreverTexto, normalizarConteudo } from "./conteudo";
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

export async function ajustes(): Promise<Ajustes> {
  return lerAjustes(await bd.ajuste.findMany());
}

export type Marca = { estado: "seguiu" | "trocou" | "pulou"; nota: string };

export type FotoDoDia = { id: string; dia: string; hora: string; refeicaoId: string | null; nome: string; analise: Analise | null };

/** As fotos de um intervalo de dias, sem a imagem (que vem por /api/foto/[id]). */
async function fotosEntre(desde: string, ate: string): Promise<FotoDoDia[]> {
  const fotos = await bd.foto.findMany({
    where: { dia: { gte: desde, lte: ate } },
    orderBy: [{ dia: "desc" }, { hora: "asc" }],
    select: { id: true, dia: true, hora: true, refeicaoId: true, nome: true, analise: true },
  });
  return fotos.map((f) => ({ ...f, analise: normalizarAnalise(f.analise) }));
}

/** O que já foi marcado num dia, por id de refeição, a água e as fotos do dia. */
export async function situacaoDoDia(dia: string) {
  const [registros, agua, fotos] = await Promise.all([
    bd.registro.findMany({ where: { dia } }),
    bd.agua.aggregate({ where: { dia }, _sum: { ml: true } }),
    fotosEntre(dia, dia),
  ]);
  const marcas: Record<string, Marca> = {};
  for (const r of registros) marcas[r.refeicaoId] = { estado: r.estado as Marca["estado"], nota: r.nota };
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
  registros: { nome: string; horario: string; estado: string; nota: string }[];
};

/** Os últimos `n` dias, do mais novo para o mais velho, terminando em `ate`. */
export async function historico(ate: string, n: number): Promise<DiaDoHistorico[]> {
  const desde = somarDias(ate, -(n - 1));
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
      registros: doDia.map((r) => ({ nome: r.nome, horario: r.horario, estado: r.estado, nota: r.nota })),
    });
  }
  return dias;
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
