"use server";

import { revalidatePath } from "next/cache";
import { bd } from "@/lib/bd";
import { novoId, novoSegredo } from "@/lib/ids";
import { arrumarNome, comoVinculo, normalizarEmail, pareceEmail } from "@/lib/contatos";
import { valoresDigitados, type ComValores } from "@/lib/formulario";

/**
 * As ações que gente de fora executa — sem conta, sem senha, sem sessão.
 *
 * São as únicas do sistema inteiro que não começam por `exigirPessoa()`, e por
 * isso todas elas só chegam ao banco por uma **chave secreta no endereço**: a
 * da atividade, para inscrever; a do contato, para sair da lista. Nenhuma
 * recebe um identificador de banco vindo do formulário — se recebesse, bastaria
 * trocar um número no endereço para se inscrever em nome de outra pessoa, ou
 * descadastrar quem se quisesse.
 */

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? "").trim();

export type RespostaDaInscricao = ComValores & { pronto?: boolean; nome?: string };

/**
 * Inscrever-se numa atividade.
 *
 * Também é o momento em que a base de contatos cresce — e o único em que o
 * consentimento nasce do próprio punho da pessoa, que é como ele vale mais.
 */
export async function inscrever(
  _anterior: RespostaDaInscricao | null,
  dados: FormData,
): Promise<RespostaDaInscricao> {
  const recusar = (erro: string): RespostaDaInscricao => ({ erro, valores: valoresDigitados(dados) });

  const atividade = await bd.atividade.findFirst({
    where: { chavePublica: texto(dados, "chave"), inscricaoAberta: true, apagadaEm: null },
  });
  if (!atividade) return recusar("As inscrições para esta atividade não estão abertas.");

  const nome = arrumarNome(texto(dados, "nome"));
  const email = normalizarEmail(texto(dados, "email"));

  if (nome.length < 2) return recusar("Escreva o seu nome.");
  if (!email || !pareceEmail(email)) return recusar("Escreva um e-mail válido — é por ele que avisaremos você.");
  if (texto(dados, "consentimento") !== "sim") {
    return recusar("Para se inscrever é preciso concordar em receber os avisos desta atividade.");
  }

  if (atividade.vagas != null) {
    const inscritos = await bd.participacao.count({ where: { atividadeId: atividade.id } });
    const jaEstou = await bd.participacao.findFirst({
      where: { atividadeId: atividade.id, contato: { email } },
      select: { id: true },
    });
    if (inscritos >= atividade.vagas && !jaEstou) {
      return recusar("As vagas para esta atividade acabaram. Escreva para o Centro para entrar na espera.");
    }
  }

  const existente = await bd.contato.findUnique({ where: { email } });

  const contato = existente
    ? await bd.contato.update({
        where: { id: existente.id },
        data: {
          nome: existente.nome || nome,
          vinculo: comoVinculo(texto(dados, "vinculo")),
          instituicao: texto(dados, "instituicao") || existente.instituicao,
          // Inscrever-se é consentir de novo: quem tinha saído da lista e volta
          // por vontade própria volta mesmo, e a data é a de agora.
          estado: "ATIVO",
          consentimentoEm: new Date(),
          apagadoEm: null,
        },
      })
    : await bd.contato.create({
        data: {
          id: novoId(),
          chave: novoSegredo(),
          nome,
          email,
          vinculo: comoVinculo(texto(dados, "vinculo")),
          instituicao: texto(dados, "instituicao") || null,
          origem: `Inscrição em "${atividade.titulo}"`,
          consentimentoEm: new Date(),
        },
      });

  await bd.participacao.upsert({
    where: { contatoId_atividadeId: { contatoId: contato.id, atividadeId: atividade.id } },
    create: {
      id: novoId(),
      contatoId: contato.id,
      atividadeId: atividade.id,
      inscritoEm: new Date(),
      chaveDoCertificado: novoSegredo(),
    },
    update: { inscritoEm: new Date() },
  });

  revalidatePath(`/atividades/${atividade.id}`);
  return { pronto: true, nome: contato.nome };
}

/**
 * Sair da lista.
 *
 * Um clique, sem login, sem "tem certeza?" e sem formulário de motivo. Quem
 * pediu para sair já decidiu; pôr obstáculo aqui é o que faz a pessoa marcar a
 * mensagem como spam — e a marcação de spam estraga a entrega dos e-mails
 * seguintes para todo mundo, não só para ela.
 */
export async function descadastrar(dados: FormData): Promise<void> {
  const contato = await bd.contato.findUnique({ where: { chave: texto(dados, "chave") } });
  if (!contato) return;

  await bd.contato.update({
    where: { id: contato.id },
    data: { estado: "DESCADASTRADO" },
  });
  revalidatePath("/contatos");
}

/** Voltar, para quem clicou sem querer. */
export async function recadastrar(dados: FormData): Promise<void> {
  const contato = await bd.contato.findUnique({ where: { chave: texto(dados, "chave") } });
  if (!contato) return;

  await bd.contato.update({
    where: { id: contato.id },
    data: { estado: "ATIVO", consentimentoEm: contato.consentimentoEm ?? new Date() },
  });
  revalidatePath("/contatos");
}
