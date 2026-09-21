"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bd } from "@/lib/bd";
import { exigirCoordenacao, exigirPessoa } from "@/lib/auth";
import { novoId, novoSegredo } from "@/lib/ids";
import { guardarSenha, marcarConvite, senhaConfere, senhaFraca } from "@/lib/senha";

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? "").trim();

/** Sete dias. Curto o bastante para um link esquecido num WhatsApp vencer sozinho. */
const DIAS_DE_CONVITE = 7;
const validade = () => new Date(Date.now() + DIAS_DE_CONVITE * 24 * 60 * 60 * 1000);

/**
 * Cadastrar alguém.
 *
 * A conta nasce sem senha: quem define é a própria pessoa, pelo link de
 * primeiro acesso. A coordenação nunca digita a senha de ninguém — e assim
 * nunca precisa saber nenhuma.
 *
 * O link volta pela barra de endereços porque ele existe uma vez só: o banco
 * guarda dele apenas um hash, e depois desta tela não há como exibi-lo de novo
 * (é só gerar outro, o que a tela também oferece).
 */
export async function cadastrarPessoa(dados: FormData): Promise<void> {
  await exigirCoordenacao();

  const nome = texto(dados, "nome");
  const email = texto(dados, "email").toLocaleLowerCase("pt-BR");
  const papel = texto(dados, "papel") === "COORDENACAO" ? "COORDENACAO" : "MEMBRO";

  if (nome.length < 2 || !email.includes("@")) return;

  const jaExiste = await bd.pessoa.findUnique({ where: { email } });
  if (jaExiste) {
    redirect(`/equipe?erro=${encodeURIComponent(`${email} já está cadastrado.`)}`);
  }

  const convite = novoSegredo();
  const pessoa = await bd.pessoa.create({
    data: {
      id: novoId(),
      nome,
      email,
      papel,
      chaveDaAgenda: novoSegredo(),
      convite: marcarConvite(convite),
      conviteExpiraEm: validade(),
    },
  });

  revalidatePath("/equipe");
  redirect(`/equipe?convite=${convite}&para=${pessoa.id}`);
}

/** Também é o "esqueci a senha": um link novo, e o antigo deixa de valer. */
export async function gerarConvite(dados: FormData): Promise<void> {
  await exigirCoordenacao();

  const id = texto(dados, "id");
  const convite = novoSegredo();

  await bd.pessoa.update({
    where: { id },
    data: { convite: marcarConvite(convite), conviteExpiraEm: validade() },
  });

  revalidatePath("/equipe");
  redirect(`/equipe?convite=${convite}&para=${id}`);
}

/**
 * Tirar alguém do sistema — ou trazer de volta.
 *
 * Desativar, nunca apagar: quem escreveu uma ata em 2026 tem que continuar
 * aparecendo como autora dela em 2030, mesmo tendo saído do Centro em 2027.
 */
export async function alternarPessoa(dados: FormData): Promise<void> {
  const quem = await exigirCoordenacao();
  const id = texto(dados, "id");

  const pessoa = await bd.pessoa.findUnique({ where: { id } });
  if (!pessoa) return;

  if (pessoa.ativa && (await ficariaSemCoordenacao(pessoa.id))) {
    redirect(
      `/equipe?erro=${encodeURIComponent(
        "Esta é a única pessoa da coordenação ainda ativa. Promova outra antes de desativar esta — " +
          "senão ninguém mais consegue cadastrar gente no sistema.",
      )}`,
    );
  }
  if (pessoa.id === quem.id && pessoa.ativa) {
    redirect(`/equipe?erro=${encodeURIComponent("Você não pode desativar a sua própria conta.")}`);
  }

  await bd.pessoa.update({ where: { id }, data: { ativa: !pessoa.ativa } });
  revalidatePath("/equipe");
}

export async function mudarPapel(dados: FormData): Promise<void> {
  await exigirCoordenacao();
  const id = texto(dados, "id");
  const papel = texto(dados, "papel") === "COORDENACAO" ? "COORDENACAO" : "MEMBRO";

  if (papel === "MEMBRO" && (await ficariaSemCoordenacao(id))) {
    redirect(
      `/equipe?erro=${encodeURIComponent(
        "Precisa sobrar pelo menos uma pessoa na coordenação — é ela que cadastra o resto da equipe.",
      )}`,
    );
  }

  await bd.pessoa.update({ where: { id }, data: { papel } });
  revalidatePath("/equipe");
}

/** Derruba a assinatura de calendário daquela pessoa e entrega uma chave nova. */
export async function trocarChaveDaAgenda(dados: FormData): Promise<void> {
  const quem = await exigirPessoa();
  const id = texto(dados, "id");

  // Cada um troca a sua; a coordenação troca a de qualquer um, para o caso de
  // um endereço ter ido parar onde não devia.
  if (id !== quem.id && quem.papel !== "COORDENACAO") return;

  await bd.pessoa.update({ where: { id }, data: { chaveDaAgenda: novoSegredo() } });
  revalidatePath("/equipe");
  revalidatePath("/calendario");
}

export type RespostaDaSenha = { erro?: string; pronto?: boolean } | null;

export async function trocarMinhaSenha(
  _anterior: RespostaDaSenha,
  dados: FormData,
): Promise<RespostaDaSenha> {
  const quem = await exigirPessoa();

  const atual = await bd.pessoa.findUnique({ where: { id: quem.id }, select: { senha: true } });
  if (!(await senhaConfere(texto(dados, "atual"), atual?.senha ?? null))) {
    return { erro: "A senha atual não confere." };
  }

  const nova = texto(dados, "nova");
  if (nova !== texto(dados, "repetida")) return { erro: "As duas senhas novas não são iguais." };
  const fraca = senhaFraca(nova);
  if (fraca) return { erro: fraca };

  await bd.pessoa.update({ where: { id: quem.id }, data: { senha: await guardarSenha(nova) } });
  return { pronto: true };
}

/** Sobraria alguém da coordenação, ativo, além desta pessoa? */
async function ficariaSemCoordenacao(id: string): Promise<boolean> {
  const outros = await bd.pessoa.count({
    where: { papel: "COORDENACAO", ativa: true, id: { not: id } },
  });
  return outros === 0;
}
