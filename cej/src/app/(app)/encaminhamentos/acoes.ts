"use server";

import { revalidatePath } from "next/cache";
import { bd } from "@/lib/bd";
import { exigirPessoa } from "@/lib/auth";
import { ehDiaValido } from "@/lib/datas";
import { novoId } from "@/lib/ids";
import type { EstadoDoEncaminhamento } from "@/lib/tipos";

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? "").trim();
const opcional = (d: FormData, campo: string) => texto(d, campo) || null;

/**
 * Criar um encaminhamento.
 *
 * Nasce sempre preso a alguma coisa — uma reunião ou uma atividade — ou solto,
 * quando alguém simplesmente se comprometeu com algo no corredor. Os três casos
 * passam por aqui.
 */
export async function criarEncaminhamento(dados: FormData): Promise<void> {
  await exigirPessoa();

  const oQue = texto(dados, "oQue");
  if (oQue.length < 3) return;

  const prazo = opcional(dados, "prazo");

  await bd.encaminhamento.create({
    data: {
      id: novoId(),
      oQue,
      responsavelId: opcional(dados, "responsavelId"),
      prazo: ehDiaValido(prazo) ? prazo : null,
      reuniaoId: opcional(dados, "reuniaoId"),
      atividadeId: opcional(dados, "atividadeId"),
    },
  });

  revalidatePath("/", "layout");
}

/**
 * Fechar, reabrir ou cancelar.
 *
 * `concluidoEm` é apagado ao reabrir: um encaminhamento que voltou a ser
 * trabalho não pode continuar carregando a data em que alguém achou que estava
 * pronto.
 */
export async function mudarEstadoDoEncaminhamento(dados: FormData): Promise<void> {
  await exigirPessoa();

  const id = texto(dados, "id");
  const bruto = texto(dados, "estado");
  const estado: EstadoDoEncaminhamento =
    bruto === "FEITO" || bruto === "CANCELADO" ? bruto : "ABERTO";

  await bd.encaminhamento.update({
    where: { id },
    data: { estado, concluidoEm: estado === "FEITO" ? new Date() : null },
  });

  revalidatePath("/", "layout");
}

export async function editarEncaminhamento(dados: FormData): Promise<void> {
  await exigirPessoa();
  const prazo = opcional(dados, "prazo");

  await bd.encaminhamento.update({
    where: { id: texto(dados, "id") },
    data: {
      oQue: texto(dados, "oQue"),
      responsavelId: opcional(dados, "responsavelId"),
      prazo: ehDiaValido(prazo) ? prazo : null,
      observacao: opcional(dados, "observacao"),
    },
  });

  revalidatePath("/", "layout");
}

export async function apagarEncaminhamento(dados: FormData): Promise<void> {
  await exigirPessoa();
  await bd.encaminhamento.update({
    where: { id: texto(dados, "id") },
    data: { apagadoEm: new Date() },
  });
  revalidatePath("/", "layout");
}
