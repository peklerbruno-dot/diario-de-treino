"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bd } from "@/lib/bd";
import { novoId, novoSegredo } from "@/lib/ids";
import { exigirMembro, exigirOrganizacao, exigirPessoa } from "@/lib/auth";
import { valoresDigitados, type ComValores } from "@/lib/formulario";
import { ehData } from "@/lib/datas";
import { ehMoeda, LISTA_DE_MOEDAS } from "@/lib/dinheiro";
import { buscarCambios } from "@/lib/cambio";
import { corDoMembro } from "@/lib/cores";

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? "").trim();

function lerViagem(dados: FormData): { erro: string } | { nome: string; destino: string; inicio: string; fim: string; moedaBase: string } {
  const nome = texto(dados, "nome");
  const destino = texto(dados, "destino");
  const inicio = texto(dados, "inicio");
  const fim = texto(dados, "fim");
  const moedaBase = texto(dados, "moedaBase") || "BRL";
  if (nome.length < 2) return { erro: "Dê um nome para a viagem." };
  if (!ehData(inicio) || !ehData(fim)) return { erro: "Preencha as datas de ida e de volta." };
  if (fim < inicio) return { erro: "A volta está antes da ida." };
  if (!ehMoeda(moedaBase)) return { erro: "Moeda desconhecida." };
  return { nome, destino, inicio, fim, moedaBase };
}

export async function criarViagem(_: ComValores, dados: FormData): Promise<ComValores> {
  const pessoa = await exigirPessoa();
  const v = lerViagem(dados);
  if ("erro" in v) return { erro: v.erro, valores: valoresDigitados(dados) };

  const id = novoId();
  const cambios = (await buscarCambios(v.moedaBase)) ?? {};
  const outros = texto(dados, "outros")
    .split(/[,\n]/)
    .map((n) => n.trim().replace(/\s+/g, " "))
    .filter((n) => n.length >= 2)
    .slice(0, 30);

  await bd.viagem.create({
    data: {
      id,
      ...v,
      cambios,
      convite: novoSegredo(),
      membros: {
        create: [
          { id: novoId(), nome: pessoa.nome, pessoaId: pessoa.id, organiza: true, cor: corDoMembro(0) },
          ...outros.map((nome, i) => ({ id: novoId(), nome, cor: corDoMembro(i + 1) })),
        ],
      },
      pastas: {
        create: texto(dados, "pastas")
          .split(/[,\n]/)
          .map((n) => n.trim())
          .filter(Boolean)
          .slice(0, 20)
          .map((nome) => ({ id: novoId(), nome })),
      },
    },
  });
  redirect(`/v/${id}/grupo?nova=1`);
}

export async function editarViagem(_: ComValores, dados: FormData): Promise<ComValores> {
  const viagemId = texto(dados, "viagemId");
  const { viagem } = await exigirOrganizacao(viagemId);
  const v = lerViagem(dados);
  if ("erro" in v) return { erro: v.erro, valores: valoresDigitados(dados) };
  const mudouMoeda = v.moedaBase !== viagem.moedaBase;
  await bd.viagem.update({
    where: { id: viagemId },
    data: { ...v, ...(mudouMoeda ? { cambios: (await buscarCambios(v.moedaBase)) ?? {} } : {}) },
  });
  revalidatePath(`/v/${viagemId}`, "layout");
  return { erro: undefined, valores: { ok: "1" } };
}

export async function salvarCambios(_: ComValores, dados: FormData): Promise<ComValores> {
  const viagemId = texto(dados, "viagemId");
  const { viagem } = await exigirMembro(viagemId);
  let cambios: Record<string, number>;
  if (texto(dados, "buscar") === "1") {
    const achados = await buscarCambios(viagem.moedaBase);
    if (!achados) return { erro: "Não consegui buscar o câmbio agora. Digite à mão." };
    cambios = achados;
  } else {
    cambios = {};
    for (const m of LISTA_DE_MOEDAS) {
      if (m === viagem.moedaBase) continue;
      const bruto = texto(dados, `cambio_${m}`).replace(",", ".");
      if (!bruto) continue;
      const n = Number(bruto);
      if (!(n > 0)) return { erro: `O câmbio de ${m} precisa ser um número maior que zero.` };
      cambios[m] = n;
    }
  }
  await bd.viagem.update({ where: { id: viagemId }, data: { cambios } });
  revalidatePath(`/v/${viagemId}`, "layout");
  return { valores: { ok: "1" } };
}

export async function adicionarMembro(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  const nome = texto(dados, "nome").replace(/\s+/g, " ");
  if (nome.length < 2) return;
  const quantos = await bd.membro.count({ where: { viagemId } });
  await bd.membro.create({ data: { id: novoId(), viagemId, nome, cor: corDoMembro(quantos) } });
  revalidatePath(`/v/${viagemId}`, "layout");
}

export async function renomearMembro(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  const { eu } = await exigirMembro(viagemId);
  const id = texto(dados, "membroId");
  const nome = texto(dados, "nome").replace(/\s+/g, " ");
  if (nome.length < 2) return;
  // Cada um muda o próprio nome; quem organiza muda o de qualquer um.
  if (!eu.organiza && id !== eu.id) return;
  await bd.membro.updateMany({ where: { id, viagemId }, data: { nome } });
  revalidatePath(`/v/${viagemId}`, "layout");
}

/**
 * Tirar alguém da viagem. Quem já tem despesa no nome não some das contas —
 * sai da lista de gente, mas os saldos continuam contando com ele.
 */
export async function removerMembro(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  const { eu } = await exigirOrganizacao(viagemId);
  const id = texto(dados, "membroId");
  if (id === eu.id) return;
  await bd.membro.updateMany({ where: { id, viagemId }, data: { saiuEm: new Date() } });
  revalidatePath(`/v/${viagemId}`, "layout");
}

export async function alternarOrganizacao(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  const { eu } = await exigirOrganizacao(viagemId);
  const id = texto(dados, "membroId");
  if (id === eu.id) return;
  const m = await bd.membro.findFirst({ where: { id, viagemId, pessoaId: { not: null } } });
  if (!m) return;
  await bd.membro.update({ where: { id }, data: { organiza: !m.organiza } });
  revalidatePath(`/v/${viagemId}/grupo`);
}

export async function trocarConvite(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirOrganizacao(viagemId);
  await bd.viagem.update({ where: { id: viagemId }, data: { convite: novoSegredo() } });
  revalidatePath(`/v/${viagemId}/grupo`);
}

export async function trocarChaveDoAtalho(dados: FormData): Promise<void> {
  const pessoa = await exigirPessoa();
  await bd.pessoa.update({ where: { id: pessoa.id }, data: { chaveDoAtalho: novoSegredo() } });
  revalidatePath("/", "layout");
}

/**
 * Soltar a conta de um membro, sem tirá-lo da viagem. É o "esqueci a senha"
 * possível sem e-mail: a pessoa cria outra conta pelo convite, escolhe o
 * próprio nome e continua com tudo que era dela.
 */
export async function desvincularConta(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  const { eu } = await exigirOrganizacao(viagemId);
  const id = texto(dados, "membroId");
  if (id === eu.id) return;
  await bd.membro.updateMany({ where: { id, viagemId }, data: { pessoaId: null, organiza: false } });
  revalidatePath(`/v/${viagemId}/grupo`);
}
