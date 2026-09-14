"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { registrar, descreverPatch } from "@/lib/auditoria";
import type { CategoriaEstado, GastoEstado, MadrichEstado, PagamentoEstado } from "@/lib/estado";
import {
  primeiroErro,
  zCriarMachane,
  zDuplicar,
  zPagamento,
  zPatchCategoria,
  zPatchGasto,
  zPatchMachane,
  zPatchMadrich,
  zPatchPolitica,
  zPeso,
  zStatus,
} from "@/lib/validacao";

export type Resposta<T = undefined> = { ok: true; dado: T } | { ok: false; erro: string };

const falha = (erro: string): Resposta<never> => ({ ok: false, erro });
const sucesso = <T,>(dado: T): Resposta<T> => ({ ok: true, dado });

function tratar(e: unknown): Resposta<never> {
  if (e instanceof z.ZodError) return falha(primeiroErro(e));
  console.error(e);
  return falha("Não deu para salvar. Tente de novo.");
}

const dataOuNull = (v: string | null | undefined) => (v ? new Date(`${v}T12:00:00`) : null);

// ===== Machané =====

export async function criarMachane(entrada: unknown): Promise<Resposta<{ id: string }>> {
  const sessao = await exigirSessao();
  try {
    const dados = zCriarMachane.parse(entrada);
    const machane = await prisma.machane.create({
      data: {
        ...dados,
        diariaCents: 0,
        diasGrandes: 6,
        diasPequenos: 4,
        politica: {
          create: {
            metodo: "ADITIVO",
            margemBaseGrandesCents: 0,
            margemBasePequenosCents: 0,
            acrescimoNaoSocioCents: 0,
            descontoSegundoFilhoCents: 0,
            acrescimoSegundaLevaCents: 10000,
            superavitAlvoCents: 0,
            arredondamento: "NENHUM",
          },
        },
        categorias: {
          create: [
            { nome: "chanichim grandes", papel: "CHANICH", turma: "GRANDES", dias: 6, quantidade: 0, ordem: 0 },
            { nome: "chanichim pequenos", papel: "CHANICH", turma: "PEQUENOS", dias: 4, quantidade: 0, ordem: 1 },
            { nome: "madrichim grandes", papel: "MADRICH", turma: "GRANDES", dias: 6, quantidade: 0, ordem: 2 },
            { nome: "madrichim pequenos", papel: "MADRICH", turma: "PEQUENOS", dias: 4, quantidade: 0, ordem: 3 },
          ],
        },
      },
    });
    await registrar({
      machaneId: machane.id,
      email: sessao.email,
      alvo: "MACHANE",
      descricao: `Machané criada: ${machane.nome}`,
    });
    revalidatePath("/");
    return sucesso({ id: machane.id });
  } catch (e) {
    return tratar(e);
  }
}

export async function salvarMachane(id: string, patch: unknown): Promise<Resposta> {
  const sessao = await exigirSessao();
  try {
    const dados = zPatchMachane.parse(patch);
    const antes = await prisma.machane.findUnique({ where: { id } });
    if (!antes) return falha("Machané não encontrada.");

    await prisma.machane.update({
      where: { id },
      data: {
        ...dados,
        ...(dados.dataInicio !== undefined ? { dataInicio: dataOuNull(dados.dataInicio) } : {}),
        ...(dados.dataFim !== undefined ? { dataFim: dataOuNull(dados.dataFim) } : {}),
      },
    });

    // A diária é o parâmetro-raiz: mexer nela muda todos os preços.
    if (dados.diariaCents !== undefined && dados.diariaCents !== antes.diariaCents) {
      await registrar({
        machaneId: id,
        email: sessao.email,
        alvo: "MACHANE",
        descricao: "Diária alterada",
        valorAntes: String(antes.diariaCents),
        valorDepois: String(dados.diariaCents),
      });
    }
    revalidatePath("/");
    return sucesso(undefined);
  } catch (e) {
    return tratar(e);
  }
}

export async function mudarStatus(id: string, status: unknown): Promise<Resposta> {
  const sessao = await exigirSessao();
  try {
    const novo = zStatus.parse(status);
    const antes = await prisma.machane.findUnique({
      where: { id },
      include: { gastos: { where: { revisado: false }, select: { id: true } } },
    });
    if (!antes) return falha("Machané não encontrada.");

    // Fase 4: nada é publicado enquanto houver item herdado sem revisão.
    if (novo === "PUBLICADA" && antes.gastos.length > 0) {
      return falha(
        `Ainda há ${antes.gastos.length} gasto(s) herdado(s) sem revisão. Revise-os antes de publicar.`,
      );
    }

    await prisma.machane.update({ where: { id }, data: { status: novo } });
    await registrar({
      machaneId: id,
      email: sessao.email,
      alvo: "STATUS",
      descricao: "Status alterado",
      valorAntes: antes.status,
      valorDepois: novo,
    });
    revalidatePath("/");
    return sucesso(undefined);
  } catch (e) {
    return tratar(e);
  }
}

export async function apagarMachane(id: string): Promise<Resposta> {
  await exigirSessao();
  try {
    await prisma.machane.delete({ where: { id } });
    revalidatePath("/");
    return sucesso(undefined);
  } catch (e) {
    return tratar(e);
  }
}

// ===== Categorias (pessoas) =====

export async function criarCategoria(machaneId: string): Promise<Resposta<CategoriaEstado>> {
  await exigirSessao();
  try {
    const machane = await prisma.machane.findUnique({ where: { id: machaneId } });
    if (!machane) return falha("Machané não encontrada.");
    const ultima = await prisma.categoria.findFirst({
      where: { machaneId },
      orderBy: { ordem: "desc" },
    });
    const c = await prisma.categoria.create({
      data: {
        machaneId,
        nome: "nova categoria",
        papel: "CHANICH",
        turma: "GRANDES",
        dias: machane.diasGrandes,
        quantidade: 0,
        geraHospedagem: true,
        contribuicaoCents: 0,
        ordem: (ultima?.ordem ?? -1) + 1,
      },
    });
    return sucesso({
      id: c.id,
      nome: c.nome,
      papel: c.papel,
      turma: c.turma,
      dias: c.dias,
      quantidade: c.quantidade,
      geraHospedagem: c.geraHospedagem,
      contribuicaoCents: c.contribuicaoCents,
      ordem: c.ordem,
    });
  } catch (e) {
    return tratar(e);
  }
}

export async function salvarCategoria(id: string, patch: unknown): Promise<Resposta> {
  const sessao = await exigirSessao();
  try {
    const dados = zPatchCategoria.parse(patch);
    const antes = await prisma.categoria.findUnique({ where: { id } });
    if (!antes) return falha("Categoria não encontrada.");
    await prisma.categoria.update({ where: { id }, data: dados });
    await registrar({
      machaneId: antes.machaneId,
      email: sessao.email,
      alvo: "CATEGORIA",
      descricao: `Categoria "${antes.nome}" alterada`,
      valorAntes: descreverPatch(
        Object.fromEntries(
          Object.keys(dados).map((k) => [k, (antes as Record<string, unknown>)[k]]),
        ),
      ),
      valorDepois: descreverPatch(dados),
    });
    return sucesso(undefined);
  } catch (e) {
    return tratar(e);
  }
}

export async function apagarCategoria(id: string): Promise<Resposta> {
  const sessao = await exigirSessao();
  try {
    const antes = await prisma.categoria.findUnique({ where: { id } });
    if (!antes) return falha("Categoria não encontrada.");
    await prisma.categoria.delete({ where: { id } });
    await registrar({
      machaneId: antes.machaneId,
      email: sessao.email,
      alvo: "CATEGORIA",
      descricao: `Categoria "${antes.nome}" apagada`,
      valorAntes: `${antes.quantidade} pessoa(s) × ${antes.dias} dia(s)`,
    });
    return sucesso(undefined);
  } catch (e) {
    return tratar(e);
  }
}

// ===== Gastos fixos =====

export async function criarGasto(machaneId: string): Promise<Resposta<GastoEstado>> {
  await exigirSessao();
  try {
    const ultimo = await prisma.gastoFixo.findFirst({
      where: { machaneId },
      orderBy: { ordem: "desc" },
    });
    const g = await prisma.gastoFixo.create({
      data: {
        machaneId,
        descricao: "novo gasto",
        tipo: "VALOR_FECHADO",
        categoria: "OUTROS",
        valorCents: 0,
        observacao: "",
        revisado: true, // criado agora, por quem está olhando
        ordem: (ultimo?.ordem ?? -1) + 1,
      },
    });
    return sucesso({
      id: g.id,
      descricao: g.descricao,
      tipo: g.tipo,
      categoria: g.categoria,
      valorCents: g.valorCents,
      pessoas: g.pessoas ?? undefined,
      dias: g.dias ?? undefined,
      observacao: g.observacao,
      revisado: g.revisado,
      ordem: g.ordem,
    });
  } catch (e) {
    return tratar(e);
  }
}

export async function salvarGasto(id: string, patch: unknown): Promise<Resposta> {
  const sessao = await exigirSessao();
  try {
    const dados = zPatchGasto.parse(patch);
    const antes = await prisma.gastoFixo.findUnique({ where: { id } });
    if (!antes) return falha("Gasto não encontrado.");
    await prisma.gastoFixo.update({ where: { id }, data: dados });

    const mexeuNoValor =
      (dados.valorCents !== undefined && dados.valorCents !== antes.valorCents) ||
      (dados.tipo !== undefined && dados.tipo !== antes.tipo) ||
      (dados.pessoas !== undefined && dados.pessoas !== antes.pessoas) ||
      (dados.dias !== undefined && dados.dias !== antes.dias);

    if (mexeuNoValor) {
      await registrar({
        machaneId: antes.machaneId,
        email: sessao.email,
        alvo: "GASTO",
        descricao: `Gasto "${antes.descricao}" alterado`,
        valorAntes: `${antes.tipo} ${antes.valorCents} pessoas=${antes.pessoas ?? "—"} dias=${antes.dias ?? "—"}`,
        valorDepois: descreverPatch(dados),
      });
    }
    return sucesso(undefined);
  } catch (e) {
    return tratar(e);
  }
}

export async function apagarGasto(id: string): Promise<Resposta> {
  const sessao = await exigirSessao();
  try {
    const antes = await prisma.gastoFixo.findUnique({ where: { id } });
    if (!antes) return falha("Gasto não encontrado.");
    await prisma.gastoFixo.delete({ where: { id } });
    await registrar({
      machaneId: antes.machaneId,
      email: sessao.email,
      alvo: "GASTO",
      descricao: `Gasto "${antes.descricao}" apagado`,
      valorAntes: String(antes.valorCents),
    });
    return sucesso(undefined);
  } catch (e) {
    return tratar(e);
  }
}

// ===== Política de preço =====

export async function salvarPolitica(machaneId: string, patch: unknown): Promise<Resposta> {
  const sessao = await exigirSessao();
  try {
    const dados = zPatchPolitica.parse(patch);
    const antes = await prisma.politicaPreco.findUnique({ where: { machaneId } });
    if (!antes) return falha("Política não encontrada.");
    await prisma.politicaPreco.update({ where: { machaneId }, data: dados });
    await registrar({
      machaneId,
      email: sessao.email,
      alvo: "POLITICA",
      descricao: "Política de preço alterada",
      valorAntes: descreverPatch(
        Object.fromEntries(
          Object.keys(dados).map((k) => [k, (antes as Record<string, unknown>)[k]]),
        ),
      ),
      valorDepois: descreverPatch(dados),
    });
    return sucesso(undefined);
  } catch (e) {
    return tratar(e);
  }
}

// ===== Peso do rateio =====

export async function salvarPeso(machaneId: string, entrada: unknown): Promise<Resposta> {
  const sessao = await exigirSessao();
  try {
    const dados = zPeso.parse(entrada);
    const antes = await prisma.machane.findUnique({ where: { id: machaneId } });
    if (!antes) return falha("Machané não encontrada.");

    await prisma.machane.update({
      where: { id: machaneId },
      data: {
        pesoOverride: dados.pesoOverride,
        pesoJustificativa: dados.pesoOverride === null ? null : dados.justificativa,
        pesoOverridePor: dados.pesoOverride === null ? null : sessao.email,
        pesoOverrideEm: dados.pesoOverride === null ? null : new Date(),
      },
    });
    await registrar({
      machaneId,
      email: sessao.email,
      alvo: "PESO",
      descricao:
        dados.pesoOverride === null
          ? "Voltou a usar o peso calculado por pessoa-dia"
          : "Peso do rateio ajustado à mão",
      valorAntes: antes.pesoOverride === null ? "calculado" : String(antes.pesoOverride),
      valorDepois: dados.pesoOverride === null ? "calculado" : String(dados.pesoOverride),
      justificativa: dados.pesoOverride === null ? null : dados.justificativa,
    });
    return sucesso(undefined);
  } catch (e) {
    return tratar(e);
  }
}

// ===== Madrichim =====

export async function criarMadrich(machaneId: string): Promise<Resposta<MadrichEstado>> {
  await exigirSessao();
  try {
    const machane = await prisma.machane.findUnique({
      where: { id: machaneId },
      include: { categorias: true },
    });
    if (!machane) return falha("Machané não encontrada.");
    const padrao = machane.categorias.find((c) => c.papel === "MADRICH" && c.turma === "GRANDES");
    const d = await prisma.madrich.create({
      data: {
        machaneId,
        nome: "",
        turma: "GRANDES",
        valorDevidoCents: padrao?.contribuicaoCents ?? 0,
        bolsaCents: 0,
        parcelas: 1,
      },
    });
    return sucesso({
      id: d.id,
      nome: d.nome,
      telefone: d.telefone,
      kvutza: d.kvutza,
      turma: d.turma,
      valorDevidoCents: d.valorDevidoCents,
      bolsaCents: d.bolsaCents,
      parcelas: d.parcelas,
      pagamentos: [],
    });
  } catch (e) {
    return tratar(e);
  }
}

export async function salvarMadrich(id: string, patch: unknown): Promise<Resposta> {
  await exigirSessao();
  try {
    const dados = zPatchMadrich.parse(patch);
    await prisma.madrich.update({ where: { id }, data: dados });
    return sucesso(undefined);
  } catch (e) {
    return tratar(e);
  }
}

export async function apagarMadrich(id: string): Promise<Resposta> {
  const sessao = await exigirSessao();
  try {
    const antes = await prisma.madrich.findUnique({ where: { id } });
    if (!antes) return falha("Madrich não encontrado.");
    await prisma.madrich.delete({ where: { id } });
    await registrar({
      machaneId: antes.machaneId,
      email: sessao.email,
      alvo: "MADRICH",
      descricao: `Madrich "${antes.nome}" removido do cadastro`,
    });
    return sucesso(undefined);
  } catch (e) {
    return tratar(e);
  }
}

export async function registrarPagamento(entrada: unknown): Promise<Resposta<PagamentoEstado>> {
  const sessao = await exigirSessao();
  try {
    const dados = zPagamento.parse(entrada);
    const madrich = await prisma.madrich.findUnique({ where: { id: dados.madrichId } });
    if (!madrich) return falha("Madrich não encontrado.");
    const p = await prisma.pagamentoMadrich.create({
      data: {
        madrichId: dados.madrichId,
        valorCents: dados.valorCents,
        data: dataOuNull(dados.data ?? null) ?? new Date(),
        observacao: dados.observacao ?? null,
      },
    });
    await registrar({
      machaneId: madrich.machaneId,
      email: sessao.email,
      alvo: "PAGAMENTO",
      descricao: `Pagamento de ${madrich.nome}`,
      valorDepois: String(dados.valorCents),
    });
    return sucesso({
      id: p.id,
      valorCents: p.valorCents,
      data: p.data.toISOString(),
      observacao: p.observacao,
    });
  } catch (e) {
    return tratar(e);
  }
}

export async function apagarPagamento(id: string): Promise<Resposta> {
  await exigirSessao();
  try {
    await prisma.pagamentoMadrich.delete({ where: { id } });
    return sucesso(undefined);
  } catch (e) {
    return tratar(e);
  }
}

/** Tela 4: "usar este total no cálculo" — liga o cadastro nominal ao motor. */
export async function usarTotalRealMadrichim(
  machaneId: string,
  valorCents: number | null,
): Promise<Resposta> {
  const sessao = await exigirSessao();
  try {
    const valor = valorCents === null ? null : z.number().int().parse(valorCents);
    const antes = await prisma.machane.findUnique({ where: { id: machaneId } });
    if (!antes) return falha("Machané não encontrada.");
    await prisma.machane.update({
      where: { id: machaneId },
      data: { receitaMadrichimRealCents: valor },
    });
    await registrar({
      machaneId,
      email: sessao.email,
      alvo: "MADRICH",
      descricao:
        valor === null
          ? "Voltou a usar a soma das contribuições das categorias"
          : "Passou a usar o total real do cadastro de madrichim",
      valorAntes: antes.receitaMadrichimRealCents === null ? "categorias" : String(antes.receitaMadrichimRealCents),
      valorDepois: valor === null ? "categorias" : String(valor),
    });
    return sucesso(undefined);
  } catch (e) {
    return tratar(e);
  }
}

// ===== Duplicação (fase 4) =====

/**
 * Copia a estrutura da machané anterior, zera todas as quantidades e marca todo
 * gasto herdado como não revisado. Publicar fica bloqueado até revisar tudo —
 * os três erros mais caros da planilha vieram de copiar uma aba sem conferir.
 */
export async function duplicarMachane(entrada: unknown): Promise<Resposta<{ id: string }>> {
  const sessao = await exigirSessao();
  try {
    const dados = zDuplicar.parse(entrada);
    const origem = await prisma.machane.findUnique({
      where: { id: dados.origemId },
      include: { categorias: true, gastos: true, politica: true },
    });
    if (!origem) return falha("Machané de origem não encontrada.");

    const nova = await prisma.machane.create({
      data: {
        nome: dados.nome,
        tipo: dados.tipo,
        ano: dados.ano,
        diariaCents: origem.diariaCents,
        diariaTabelaCents: origem.diariaTabelaCents,
        diariaObservacao: origem.diariaObservacao
          ? `(herdado, confira) ${origem.diariaObservacao}`
          : null,
        diasGrandes: origem.diasGrandes,
        diasPequenos: origem.diasPequenos,
        // O peso nunca é herdado: ele depende das quantidades, que foram zeradas.
        pesoOverride: null,
        status: "RASCUNHO",
        duplicadaDeId: origem.id,
        categorias: {
          create: origem.categorias.map((c) => ({
            nome: c.nome,
            papel: c.papel,
            turma: c.turma,
            dias: c.dias,
            quantidade: 0, // zera todas as quantidades
            geraHospedagem: c.geraHospedagem,
            contribuicaoCents: c.contribuicaoCents,
            ordem: c.ordem,
          })),
        },
        gastos: {
          create: origem.gastos.map((g) => ({
            descricao: g.descricao,
            tipo: g.tipo,
            categoria: g.categoria,
            valorCents: g.valorCents,
            pessoas: g.pessoas,
            dias: g.dias,
            observacao: g.observacao,
            revisado: false, // herdado: ninguém conferiu ainda
            ordem: g.ordem,
          })),
        },
        politica: origem.politica
          ? {
              create: {
                metodo: origem.politica.metodo,
                margemBaseGrandesCents: origem.politica.margemBaseGrandesCents,
                margemBasePequenosCents: origem.politica.margemBasePequenosCents,
                acrescimoNaoSocioCents: origem.politica.acrescimoNaoSocioCents,
                descontoSegundoFilhoCents: origem.politica.descontoSegundoFilhoCents,
                margemBasePct: origem.politica.margemBasePct,
                acrescimoNaoSocioPct: origem.politica.acrescimoNaoSocioPct,
                descontoSegundoFilhoPct: origem.politica.descontoSegundoFilhoPct,
                descontoSegundoFilhoGrandesCents: origem.politica.descontoSegundoFilhoGrandesCents,
                descontoSegundoFilhoPequenosCents: origem.politica.descontoSegundoFilhoPequenosCents,
                descontoSegundoFilhoGrandesPct: origem.politica.descontoSegundoFilhoGrandesPct,
                descontoSegundoFilhoPequenosPct: origem.politica.descontoSegundoFilhoPequenosPct,
                acrescimoSegundaLevaCents: origem.politica.acrescimoSegundaLevaCents,
                superavitAlvoCents: origem.politica.superavitAlvoCents,
                arredondamento: origem.politica.arredondamento,
              },
            }
          : undefined,
      },
    });

    await registrar({
      machaneId: nova.id,
      email: sessao.email,
      alvo: "DUPLICACAO",
      descricao: `Duplicada de "${origem.nome}". Quantidades zeradas, ${origem.gastos.length} gasto(s) marcado(s) como não revisado(s).`,
    });
    revalidatePath("/");
    return sucesso({ id: nova.id });
  } catch (e) {
    return tratar(e);
  }
}

export async function marcarRevisado(id: string, revisado: boolean): Promise<Resposta> {
  const sessao = await exigirSessao();
  try {
    const antes = await prisma.gastoFixo.findUnique({ where: { id } });
    if (!antes) return falha("Gasto não encontrado.");
    await prisma.gastoFixo.update({ where: { id }, data: { revisado } });
    if (revisado) {
      await registrar({
        machaneId: antes.machaneId,
        email: sessao.email,
        alvo: "GASTO",
        descricao: `Gasto "${antes.descricao}" revisado`,
        valorDepois: String(antes.valorCents),
      });
    }
    return sucesso(undefined);
  } catch (e) {
    return tratar(e);
  }
}
