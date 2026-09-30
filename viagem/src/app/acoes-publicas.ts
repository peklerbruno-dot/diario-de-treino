"use server";

import { redirect } from "next/navigation";
import { bd } from "@/lib/bd";
import { novoId, novoSegredo } from "@/lib/ids";
import { guardarSenha, senhaConfere, senhaFraca } from "@/lib/senha";
import {
  abrirSessao,
  codigoDeFundacaoConfere,
  codigoDeFundacaoConfigurado,
  pessoaAtual,
} from "@/lib/auth";
import { valoresDigitados, type ComValores } from "@/lib/formulario";
import { corDoMembro } from "@/lib/cores";

/**
 * As ações de quem ainda não entrou: entrar, criar conta, aceitar convite.
 * O convite é a única chave que abre uma viagem para alguém de fora — nenhuma
 * ação daqui recebe o id de uma viagem vindo do formulário.
 */

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? "").trim();
const normalizarEmail = (e: string) => e.trim().toLowerCase();
const pareceEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/** Só aceita voltar para um endereço deste próprio app. */
const destinoSeguro = (volta: string) => (volta.startsWith("/") && !volta.startsWith("//") ? volta : "/");

export async function entrar(_: ComValores, dados: FormData): Promise<ComValores> {
  const email = normalizarEmail(texto(dados, "email"));
  const pessoa = await bd.pessoa.findUnique({ where: { email } });
  // A mesma mensagem para e-mail desconhecido e senha errada: não se entrega
  // quem tem conta aqui.
  if (!pessoa || !(await senhaConfere(texto(dados, "senha"), pessoa.senha))) {
    return { erro: "E-mail ou senha não conferem.", valores: valoresDigitados(dados) };
  }
  await bd.pessoa.update({ where: { id: pessoa.id }, data: { ultimoAcesso: new Date() } });
  await abrirSessao(pessoa.id);
  redirect(destinoSeguro(texto(dados, "volta")));
}

async function novaPessoa(dados: FormData): Promise<{ erro: string } | { id: string }> {
  const nome = texto(dados, "nome").replace(/\s+/g, " ");
  const email = normalizarEmail(texto(dados, "email"));
  const senha = texto(dados, "senha");
  if (nome.length < 2) return { erro: "Escreva o seu nome." };
  if (!pareceEmail(email)) return { erro: "Escreva um e-mail válido — é com ele que você entra." };
  const fraca = senhaFraca(senha);
  if (fraca) return { erro: fraca };
  if (await bd.pessoa.findUnique({ where: { email } })) {
    return { erro: "Já existe uma conta com esse e-mail. Entre com ela." };
  }
  const id = novoId();
  await bd.pessoa.create({
    data: { id, nome, email, senha: await guardarSenha(senha), chaveDoAtalho: novoSegredo() },
  });
  return { id };
}

export async function criarConta(_: ComValores, dados: FormData): Promise<ComValores> {
  const recusar = (erro: string) => ({ erro, valores: valoresDigitados(dados) });
  if (!codigoDeFundacaoConfigurado()) {
    return recusar("A criação de conta está fechada: falta configurar o CODIGO_DE_FUNDACAO. Peça o link de convite da viagem.");
  }
  if (!codigoDeFundacaoConfere(texto(dados, "codigo"))) {
    return recusar("Código errado. Se alguém do grupo já criou a viagem, peça o link de convite a essa pessoa.");
  }
  const r = await novaPessoa(dados);
  if ("erro" in r) return recusar(r.erro);
  await abrirSessao(r.id);
  redirect("/viagens/nova");
}

/**
 * Entrar numa viagem pelo convite. Três casos:
 *   - já tem conta e está logado: só entra;
 *   - não tem conta: cria e entra;
 *   - em ambos, pode escolher "eu sou o Fulano" entre os membros sem conta —
 *     e herda o que já foi lançado no nome dele.
 */
export async function aceitarConvite(_: ComValores, dados: FormData): Promise<ComValores> {
  const recusar = (erro: string) => ({ erro, valores: valoresDigitados(dados) });
  const viagem = await bd.viagem.findUnique({ where: { convite: texto(dados, "convite") } });
  if (!viagem) return recusar("Esse convite não vale mais. Peça um link novo a quem organiza.");

  let pessoa = await pessoaAtual();
  if (!pessoa) {
    const r = await novaPessoa(dados);
    if ("erro" in r) return recusar(r.erro);
    await abrirSessao(r.id);
    pessoa = { id: r.id, nome: texto(dados, "nome"), email: "", chaveDoAtalho: "" };
  }

  const jaSou = await bd.membro.findFirst({ where: { viagemId: viagem.id, pessoaId: pessoa.id } });
  if (jaSou) {
    if (jaSou.saiuEm) await bd.membro.update({ where: { id: jaSou.id }, data: { saiuEm: null } });
    redirect(`/v/${viagem.id}`);
  }

  const souQuem = texto(dados, "membro");
  if (souQuem && souQuem !== "novo") {
    // Só um membro desta viagem, e só um que ainda não tenha dono.
    const livre = await bd.membro.updateMany({
      where: { id: souQuem, viagemId: viagem.id, pessoaId: null },
      data: { pessoaId: pessoa.id, saiuEm: null },
    });
    if (livre.count === 1) redirect(`/v/${viagem.id}`);
  }

  const quantos = await bd.membro.count({ where: { viagemId: viagem.id } });
  await bd.membro.create({
    data: { id: novoId(), viagemId: viagem.id, nome: pessoa.nome, pessoaId: pessoa.id, cor: corDoMembro(quantos) },
  });
  redirect(`/v/${viagem.id}`);
}
