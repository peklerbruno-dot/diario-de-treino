"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bd } from "@/lib/bd";
import { exigirPessoa } from "@/lib/auth";
import { ehDiaValido, normalizarHora } from "@/lib/datas";
import { novoId } from "@/lib/ids";
import { valoresDigitados, type ComValores } from "@/lib/formulario";
import type { EstadoDaReuniao } from "@/lib/tipos";

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? "").trim();
const opcional = (d: FormData, campo: string) => texto(d, campo) || null;

export type RespostaDaReuniao = ComValores;

/** Uma recusa devolve o motivo e o que foi digitado — ver `src/lib/formulario.ts`. */
const recusar = (dados: FormData, erro: string): RespostaDaReuniao => ({
  erro,
  valores: valoresDigitados(dados),
});

/**
 * Criar ou editar a reunião — só o cabeçalho: título, data, hora, local.
 *
 * Pauta e ata têm ações próprias, e não é preciosismo. A ata é escrita durante
 * ou logo depois da reunião, com pressa; se ela morasse no mesmo formulário do
 * resto, gravar um parágrafo exigiria reenviar data, hora e local junto — e um
 * campo mal preenchido em qualquer um deles derrubaria o parágrafo.
 */
export async function salvarReuniao(
  _anterior: RespostaDaReuniao,
  dados: FormData,
): Promise<RespostaDaReuniao> {
  const pessoa = await exigirPessoa();

  const id = texto(dados, "id") || null;
  const titulo = texto(dados, "titulo");
  const dia = texto(dados, "dia");

  if (titulo.length < 3) {
    return recusar(dados, "A reunião precisa de um título.");
  }
  if (!ehDiaValido(dia)) {
    return recusar(dados, "Escolha a data da reunião.");
  }

  const campos = {
    titulo,
    dia,
    hora: normalizarHora(texto(dados, "hora")),
    local: opcional(dados, "local"),
  };

  const salva = id
    ? await bd.reuniao.update({ where: { id }, data: campos })
    : await bd.reuniao.create({
        data: { id: novoId(), ...campos, convocouId: pessoa.id },
      });

  // Numa reunião nova, a equipe inteira entra como convocada. É quase sempre o
  // certo, e desmarcar duas pessoas é mais rápido do que marcar oito.
  if (!id) {
    const equipe = await bd.pessoa.findMany({ where: { ativa: true }, select: { id: true } });
    await bd.presenca.createMany({
      data: equipe.map((p) => ({ reuniaoId: salva.id, pessoaId: p.id })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/", "layout");
  redirect(`/reunioes/${salva.id}`);
}

/** A pauta e a ata gravam cada uma por si, por um botão só delas. */
export async function salvarTexto(dados: FormData): Promise<void> {
  await exigirPessoa();
  const id = texto(dados, "id");
  const campo = texto(dados, "campo");
  if (campo !== "pauta" && campo !== "ata") return;

  await bd.reuniao.update({
    where: { id },
    data: { [campo]: opcional(dados, "valor") },
  });
  revalidatePath(`/reunioes/${id}`);
}

export async function alternarPresenca(dados: FormData): Promise<void> {
  await exigirPessoa();
  const reuniaoId = texto(dados, "reuniaoId");
  const pessoaId = texto(dados, "pessoaId");

  const atual = await bd.presenca.findUnique({
    where: { reuniaoId_pessoaId: { reuniaoId, pessoaId } },
  });

  if (atual) {
    await bd.presenca.update({
      where: { reuniaoId_pessoaId: { reuniaoId, pessoaId } },
      data: { compareceu: !atual.compareceu },
    });
  } else {
    await bd.presenca.create({ data: { reuniaoId, pessoaId, compareceu: true } });
  }

  revalidatePath(`/reunioes/${reuniaoId}`);
}

/** Um estado que eu não reconheço não faz nada — ver o comentário em atividades. */
export async function mudarEstadoDaReuniao(dados: FormData): Promise<void> {
  await exigirPessoa();
  const bruto = texto(dados, "estado");
  if (bruto !== "AGENDADA" && bruto !== "REALIZADA" && bruto !== "CANCELADA") return;

  await bd.reuniao.update({
    where: { id: texto(dados, "id") },
    data: { estado: bruto as EstadoDaReuniao },
  });
  revalidatePath("/", "layout");
}

export async function apagarReuniao(dados: FormData): Promise<void> {
  await exigirPessoa();
  await bd.reuniao.update({
    where: { id: texto(dados, "id") },
    data: { apagadaEm: new Date() },
  });
  revalidatePath("/", "layout");
  redirect("/reunioes");
}
