"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bd } from "@/lib/bd";
import { exigirPessoa } from "@/lib/auth";
import { ehDiaValido, normalizarHora } from "@/lib/datas";
import { novoId } from "@/lib/ids";
import { valoresDigitados, type ComValores } from "@/lib/formulario";
import {
  ESTADOS_DA_ATIVIDADE, TIPOS_DE_ATIVIDADE,
  type EstadoDaAtividade, type TipoDeAtividade,
} from "@/lib/tipos";

/**
 * As ações das atividades.
 *
 * Todas começam por `exigirPessoa()`. Não é zelo: uma ação de servidor é um
 * endereço como outro qualquer, e quem souber o nome dela pode chamá-la sem
 * nunca ter aberto a tela. A barreira do middleware não alcança isso.
 */

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? "").trim();
const opcional = (d: FormData, campo: string) => texto(d, campo) || null;

const numero = (d: FormData, campo: string): number | null => {
  const bruto = texto(d, campo);
  if (!bruto) return null;
  const n = Number(bruto.replace(/\D/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** O endereço colado sem "https://" é o engano mais comum de quem copia link. */
function link(d: FormData, campo: string): string | null {
  const bruto = texto(d, campo);
  if (!bruto) return null;
  return /^https?:\/\//i.test(bruto) ? bruto : `https://${bruto}`;
}

const umDos = <T extends string>(valor: string, lista: readonly T[], padrao: T): T =>
  (lista as readonly string[]).includes(valor) ? (valor as T) : padrao;

export type RespostaDaAtividade = ComValores;

/** Uma recusa devolve o motivo e o que foi digitado — ver `src/lib/formulario.ts`. */
const recusar = (dados: FormData, erro: string): RespostaDaAtividade => ({
  erro,
  valores: valoresDigitados(dados),
});

export async function salvarAtividade(
  _anterior: RespostaDaAtividade,
  dados: FormData,
): Promise<RespostaDaAtividade> {
  await exigirPessoa();

  const id = texto(dados, "id") || null;
  const titulo = texto(dados, "titulo");
  const dia = texto(dados, "dia");
  const diaFinal = opcional(dados, "diaFinal");

  if (titulo.length < 3) {
    return recusar(dados, "A atividade precisa de um título.");
  }
  if (!ehDiaValido(dia)) {
    return recusar(dados, "Escolha a data da atividade.");
  }
  if (diaFinal && !ehDiaValido(diaFinal)) {
    return recusar(dados, "A data final não é uma data válida.");
  }
  if (diaFinal && diaFinal < dia) {
    return recusar(dados, "A data final vem antes da data de início.");
  }

  const campos = {
    titulo,
    tipo: umDos<TipoDeAtividade>(texto(dados, "tipo"), TIPOS_DE_ATIVIDADE, "PALESTRA"),
    estado: umDos<EstadoDaAtividade>(texto(dados, "estado"), ESTADOS_DA_ATIVIDADE, "IDEIA"),
    dia,
    hora: normalizarHora(texto(dados, "hora")),
    // Uma data final igual à de início não é uma data final: é ruído no
    // calendário, que passaria a desenhar uma faixa de um dia só.
    diaFinal: diaFinal && diaFinal !== dia ? diaFinal : null,
    horaFinal: normalizarHora(texto(dados, "horaFinal")),
    local: opcional(dados, "local"),
    resumo: opcional(dados, "resumo"),
    parceria: opcional(dados, "parceria"),
    publicoAlvo: opcional(dados, "publicoAlvo"),
    pastaNoDrive: link(dados, "pastaNoDrive"),
    linkDeInscricao: link(dados, "linkDeInscricao"),
    linkDaDivulgacao: link(dados, "linkDaDivulgacao"),
    responsavelId: opcional(dados, "responsavelId"),
    publicoPresente: numero(dados, "publicoPresente"),
    avaliacao: opcional(dados, "avaliacao"),
  };

  const salva = id
    ? await bd.atividade.update({ where: { id }, data: campos })
    : await bd.atividade.create({ data: { id: novoId(), ...campos } });

  revalidatePath("/", "layout");
  redirect(`/atividades/${salva.id}`);
}

/**
 * O atalho da ficha: mudar só o estado, sem reenviar o formulário inteiro.
 *
 * Um estado que não reconheço faz a ação **não fazer nada** — e não cair num
 * padrão. Aqui isso já custou um bug: com um valor vazio chegando, o padrão
 * `IDEIA` reescrevia a situação de uma atividade pronta para "ideia", calado. O
 * padrão é seguro na criação, onde não há o que perder; num `update`, não.
 */
export async function mudarEstadoDaAtividade(dados: FormData): Promise<void> {
  await exigirPessoa();
  const id = texto(dados, "id");
  const bruto = texto(dados, "estado");
  if (!(ESTADOS_DA_ATIVIDADE as readonly string[]).includes(bruto)) return;

  await bd.atividade.update({
    where: { id },
    data: { estado: bruto as EstadoDaAtividade },
  });
  revalidatePath("/", "layout");
}

/**
 * Apagar é marcar a data, nunca sumir com a linha.
 *
 * Numa equipe, "onde foi parar a palestra que eu cadastrei?" é uma pergunta que
 * se faz — e uma linha que sumiu do banco não responde.
 */
export async function apagarAtividade(dados: FormData): Promise<void> {
  await exigirPessoa();
  await bd.atividade.update({
    where: { id: texto(dados, "id") },
    data: { apagadaEm: new Date() },
  });
  revalidatePath("/", "layout");
  redirect("/atividades");
}

export async function adicionarConvidado(dados: FormData): Promise<void> {
  await exigirPessoa();
  const atividadeId = texto(dados, "atividadeId");
  const nome = texto(dados, "nome");
  if (!nome) return;

  const quantos = await bd.convidado.count({ where: { atividadeId } });
  await bd.convidado.create({
    data: {
      id: novoId(),
      atividadeId,
      nome,
      instituicao: opcional(dados, "instituicao"),
      funcao: opcional(dados, "funcao"),
      ordem: quantos,
    },
  });
  revalidatePath(`/atividades/${atividadeId}`);
}

export async function removerConvidado(dados: FormData): Promise<void> {
  await exigirPessoa();
  // Convidado sai de verdade: é uma linha de cadastro, não uma decisão da
  // equipe — e quem digitou o nome errado quer o nome errado fora da lista.
  const convidado = await bd.convidado.delete({ where: { id: texto(dados, "id") } });
  revalidatePath(`/atividades/${convidado.atividadeId}`);
}
