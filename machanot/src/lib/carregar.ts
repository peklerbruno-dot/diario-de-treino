import "server-only";
import { prisma } from "@/lib/db";
import { paraEstado } from "@/lib/mapear";
import type { EstadoMachane } from "@/lib/estado";

/** Toda machané tem política; se faltar (criação antiga), cria a padrão. */
export async function garantirPolitica(machaneId: string) {
  const existente = await prisma.politicaPreco.findUnique({ where: { machaneId } });
  if (existente) return existente;
  return prisma.politicaPreco.create({
    data: {
      machaneId,
      metodo: "ADITIVO",
      margemBaseGrandesCents: 0,
      margemBasePequenosCents: 0,
      acrescimoNaoSocioCents: 0,
      descontoSegundoFilhoCents: 0,
      acrescimoSegundaLevaCents: 10000,
      superavitAlvoCents: 0,
      arredondamento: "NENHUM",
    },
  });
}

export async function carregarMachane(id: string): Promise<EstadoMachane | null> {
  const m = await prisma.machane.findUnique({
    where: { id },
    include: {
      categorias: { orderBy: [{ ordem: "asc" }, { nome: "asc" }] },
      gastos: { orderBy: [{ ordem: "asc" }, { descricao: "asc" }] },
      politica: true,
      madrichim: {
        orderBy: { nome: "asc" },
        include: { pagamentos: { orderBy: { data: "asc" } } },
      },
      duplicadaDe: { select: { id: true, nome: true } },
    },
  });
  if (!m) return null;
  const politica = m.politica ?? (await garantirPolitica(m.id));
  return paraEstado(m, politica);
}

export async function listarMachanot() {
  return prisma.machane.findMany({
    orderBy: [{ ano: "desc" }, { criadoEm: "desc" }],
    include: {
      _count: { select: { gastos: true, categorias: true, madrichim: true } },
      duplicadaDe: { select: { id: true, nome: true } },
    },
  });
}

/** A machané anterior, para o comparativo (tela 9). */
export async function machaneAnterior(m: { id: string; ano: number; tipo: "KAITZ" | "CHOREF" }) {
  return prisma.machane.findFirst({
    where: { id: { not: m.id }, tipo: m.tipo, ano: { lte: m.ano } },
    orderBy: [{ ano: "desc" }, { criadoEm: "desc" }],
    select: { id: true, nome: true, ano: true, tipo: true },
  });
}

export async function registrosDaMachane(machaneId: string, limite = 100) {
  return prisma.registroAlteracao.findMany({
    where: { machaneId },
    orderBy: { em: "desc" },
    take: limite,
  });
}
