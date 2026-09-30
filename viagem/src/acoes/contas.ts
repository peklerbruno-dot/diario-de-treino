"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bd } from "@/lib/bd";
import { novoId } from "@/lib/ids";
import { exigirMembro } from "@/lib/auth";
import { valoresDigitados, type ComValores } from "@/lib/formulario";
import { ehData, hoje } from "@/lib/datas";
import { ehMoeda, lerValor } from "@/lib/dinheiro";
import { conferirPagadores, dividir, ErroDeDivisao, type Entrada, type Modo } from "@/lib/contas";

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? "").trim();
const MODOS_VALIDOS: Modo[] = ["igual", "exato", "porcentagem", "cotas"];

/**
 * Salvar uma despesa. O formulário manda:
 *   - valor, moeda, cambio, descricao, data, categoria, modo;
 *   - pagador=<id>, ou pagador=varios e pago_<id> para cada um que pagou;
 *   - por pessoa, conforme o modo: inc_<id> (igual), val_<id> (exato),
 *     pct_<id> (porcentagem) ou cota_<id> (cotas).
 * A conta é refeita aqui, no servidor, com a mesma função que a tela usou
 * para mostrar a prévia — a tela só sugere, quem decide é `dividir`.
 */
export async function salvarDespesa(_: ComValores, dados: FormData): Promise<ComValores> {
  const viagemId = texto(dados, "viagemId");
  const { eu, viagem } = await exigirMembro(viagemId);
  const recusar = (erro: string) => ({ erro, valores: valoresDigitados(dados) });

  const descricao = texto(dados, "descricao").slice(0, 140);
  if (!descricao) return recusar("Escreva o que foi (jantar, táxi, hotel…).");
  const valor = lerValor(texto(dados, "valor"));
  if (valor == null || valor <= 0) return recusar("Escreva o valor.");
  if (valor > 100_000_000_00) return recusar("Valor alto demais — confira os zeros.");

  const moeda = texto(dados, "moeda") || viagem.moedaBase;
  if (!ehMoeda(moeda)) return recusar("Moeda desconhecida.");
  const cambio = moeda === viagem.moedaBase ? 1 : Number(texto(dados, "cambio").replace(",", "."));
  if (!(cambio > 0)) return recusar(`Diga quanto vale 1 ${moeda} em ${viagem.moedaBase}.`);

  const data = texto(dados, "data") || hoje();
  if (!ehData(data)) return recusar("Data inválida.");
  const modo = texto(dados, "modo") as Modo;
  if (!MODOS_VALIDOS.includes(modo)) return recusar("Escolha como dividir.");

  const membros = await bd.membro.findMany({ where: { viagemId }, select: { id: true, saiuEm: true } });
  const ids = new Set(membros.map((m) => m.id));

  // Quem pagou
  let pagadores: Entrada[];
  const pagador = texto(dados, "pagador");
  if (pagador === "varios") {
    pagadores = membros
      .map((m) => ({ membroId: m.id, valor: lerValor(texto(dados, `pago_${m.id}`)) ?? 0 }))
      .filter((p) => p.valor > 0);
  } else {
    if (!ids.has(pagador)) return recusar("Diga quem pagou.");
    pagadores = [{ membroId: pagador, valor }];
  }

  // Quanto cabe a cada um
  const entradas: Entrada[] = [];
  for (const m of membros) {
    if (modo === "igual") {
      if (dados.get(`inc_${m.id}`) === "sim") entradas.push({ membroId: m.id, valor: 1 });
    } else if (modo === "exato") {
      const v = lerValor(texto(dados, `val_${m.id}`));
      if (v) entradas.push({ membroId: m.id, valor: v });
    } else {
      const bruto = texto(dados, `${modo === "porcentagem" ? "pct" : "cota"}_${m.id}`).replace(",", ".");
      const n = bruto ? Number(bruto) : 0;
      if (!Number.isFinite(n) || n < 0) return recusar("Há um número inválido na divisão.");
      if (n > 0) entradas.push({ membroId: m.id, valor: n });
    }
  }

  let partes;
  try {
    pagadores = conferirPagadores(valor, pagadores);
    partes = dividir(modo, valor, entradas);
  } catch (e) {
    if (e instanceof ErroDeDivisao) return recusar(e.message);
    throw e;
  }

  const campos = {
    descricao,
    categoria: texto(dados, "categoria") || "outro",
    data,
    valor,
    moeda,
    cambio,
    modo,
    notas: texto(dados, "notas").slice(0, 1000),
  };

  const despesaId = texto(dados, "despesaId");
  if (despesaId) {
    const existe = await bd.despesa.findFirst({ where: { id: despesaId, viagemId, apagadoEm: null }, select: { id: true } });
    if (!existe) return recusar("Essa despesa não existe mais.");
    await bd.$transaction([
      bd.pagadorDespesa.deleteMany({ where: { despesaId } }),
      bd.parteDespesa.deleteMany({ where: { despesaId } }),
      bd.despesa.update({
        where: { id: despesaId },
        data: {
          ...campos,
          pagadores: { create: pagadores.map((p) => ({ membroId: p.membroId, valor: p.valor })) },
          partes: { create: partes.map((p) => ({ membroId: p.membroId, valor: p.valor, peso: p.peso })) },
        },
      }),
    ]);
  } else {
    await bd.despesa.create({
      data: {
        id: novoId(),
        viagemId,
        ...campos,
        criadoPorId: eu.id,
        pagadores: { create: pagadores.map((p) => ({ membroId: p.membroId, valor: p.valor })) },
        partes: { create: partes.map((p) => ({ membroId: p.membroId, valor: p.valor, peso: p.peso })) },
      },
    });
  }

  // O câmbio usado vira a sugestão da próxima despesa nessa moeda.
  if (moeda !== viagem.moedaBase) {
    const cambios = { ...((viagem.cambios as Record<string, number>) ?? {}), [moeda]: cambio };
    await bd.viagem.update({ where: { id: viagemId }, data: { cambios } });
  }

  revalidatePath(`/v/${viagemId}`, "layout");
  redirect(`/v/${viagemId}/contas`);
}

export async function apagarDespesa(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  await bd.despesa.updateMany({ where: { id: texto(dados, "despesaId"), viagemId }, data: { apagadoEm: new Date() } });
  revalidatePath(`/v/${viagemId}`, "layout");
  redirect(`/v/${viagemId}/contas`);
}

export async function registrarPagamento(_: ComValores, dados: FormData): Promise<ComValores> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  const recusar = (erro: string) => ({ erro, valores: valoresDigitados(dados) });

  const deId = texto(dados, "deId");
  const paraId = texto(dados, "paraId");
  const valor = lerValor(texto(dados, "valor"));
  if (deId === paraId) return recusar("Quem paga e quem recebe precisam ser pessoas diferentes.");
  const membros = await bd.membro.count({ where: { viagemId, id: { in: [deId, paraId] } } });
  if (membros !== 2) return recusar("Escolha quem pagou e quem recebeu.");
  if (valor == null || valor <= 0) return recusar("Escreva o valor.");

  await bd.pagamento.create({
    data: {
      id: novoId(),
      viagemId,
      deId,
      paraId,
      valor,
      data: ehData(texto(dados, "data")) ? texto(dados, "data") : hoje(),
      notas: texto(dados, "notas").slice(0, 300),
    },
  });
  revalidatePath(`/v/${viagemId}`, "layout");
  redirect(`/v/${viagemId}/contas`);
}

export async function apagarPagamento(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  await bd.pagamento.updateMany({ where: { id: texto(dados, "pagamentoId"), viagemId }, data: { apagadoEm: new Date() } });
  revalidatePath(`/v/${viagemId}`, "layout");
}
