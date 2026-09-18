"use server";

import { redirect } from "next/navigation";
import { bd } from "@/lib/bd";
import {
  abrirSessao, codigoDeFundacaoConfere, codigoDeFundacaoConfigurado, fecharSessao, sistemaVazio,
} from "@/lib/auth";
import { novoId, novoSegredo } from "@/lib/ids";
import { guardarSenha, marcarConvite, senhaConfere, senhaFraca } from "@/lib/senha";
import { valoresDigitados, type ComValores } from "@/lib/formulario";

/** Junto do erro volta o que foi digitado — ver `src/lib/formulario.ts`. */
export type Resposta = ComValores;

/** Uma recusa devolve o motivo e o que foi digitado — ver `src/lib/formulario.ts`. */
const recusar = (dados: FormData, erro: string): Resposta => ({
  erro,
  valores: valoresDigitados(dados),
});

const texto = (dados: FormData, campo: string) => String(dados.get(campo) ?? "").trim();
const email = (dados: FormData, campo: string) => texto(dados, campo).toLocaleLowerCase("pt-BR");

/**
 * Entrar.
 *
 * A recusa é sempre a mesma frase, exista o e-mail ou não. Duas frases
 * diferentes transformariam esta tela num jeito de descobrir quem faz parte da
 * equipe — e a frase única ainda cabe o caso de quem tem conta e nunca definiu
 * senha, que é o engano mais provável nas primeiras semanas.
 */
export async function acaoDeEntrar(_anterior: Resposta, dados: FormData): Promise<Resposta> {
  const pessoa = await bd.pessoa.findUnique({ where: { email: email(dados, "email") } });
  const confere = await senhaConfere(texto(dados, "senha"), pessoa?.senha ?? null);

  if (!pessoa || !pessoa.ativa || !confere) {
    return recusar(
      dados,
      "E-mail ou senha não confere. Se você ainda não criou a sua senha, " +
        "use o link de primeiro acesso que a coordenação te mandou.",
    );
  }

  await bd.pessoa.update({ where: { id: pessoa.id }, data: { ultimoAcesso: new Date() } });
  await abrirSessao(pessoa.id);
  redirect("/");
}

/**
 * Fundar a primeira conta.
 *
 * Só funciona enquanto não houver ninguém, e só com o `CODIGO_DE_FUNDACAO` em
 * mãos. As duas condições juntas: sem a segunda, quem topasse com o endereço
 * nos primeiros minutos no ar viraria a coordenação do Centro.
 */
export async function acaoDeFundar(_anterior: Resposta, dados: FormData): Promise<Resposta> {
  if (!(await sistemaVazio())) {
    return recusar(dados, "Este sistema já tem gente dentro. Entre pela tela de entrada.");
  }
  if (!codigoDeFundacaoConfigurado()) {
    return recusar(
      dados,
      "Esta instalação está sem CODIGO_DE_FUNDACAO. Cadastre a variável na Vercel, " +
        "publique de novo e volte aqui.",
    );
  }
  if (!codigoDeFundacaoConfere(texto(dados, "codigo"))) {
    return recusar(dados, "Código de fundação incorreto.");
  }

  const nome = texto(dados, "nome");
  const endereco = email(dados, "email");
  const senha = texto(dados, "senha");

  if (nome.length < 2) return recusar(dados, "Escreva o seu nome.");
  if (!endereco.includes("@")) return recusar(dados, "Escreva um e-mail válido.");
  const fraca = senhaFraca(senha);
  if (fraca) return recusar(dados, fraca);

  const pessoa = await bd.pessoa.create({
    data: {
      id: novoId(),
      nome,
      email: endereco,
      papel: "COORDENACAO",
      senha: await guardarSenha(senha),
      chaveDaAgenda: novoSegredo(),
      ultimoAcesso: new Date(),
    },
  });

  await abrirSessao(pessoa.id);
  redirect("/");
}

/**
 * O primeiro acesso, pelo link que a coordenação mandou — e também o "esqueci a
 * senha", que é o mesmo link gerado de novo.
 *
 * O convite é consumido: definida a senha, ele deixa de valer. Um link que
 * continuasse valendo ficaria para sempre no histórico de um WhatsApp.
 */
export async function acaoDeDefinirSenha(_anterior: Resposta, dados: FormData): Promise<Resposta> {
  const convite = texto(dados, "convite");
  const senha = texto(dados, "senha");
  const repetida = texto(dados, "repetida");

  if (senha !== repetida) return recusar(dados, "As duas senhas não são iguais.");
  const fraca = senhaFraca(senha);
  if (fraca) return recusar(dados, fraca);

  const pessoa = await bd.pessoa.findFirst({
    where: { convite: marcarConvite(convite), ativa: true },
  });
  if (!pessoa || !pessoa.conviteExpiraEm || pessoa.conviteExpiraEm < new Date()) {
    return recusar(
      dados,
      "Este link não vale mais. Peça à coordenação um link novo — eles levam " +
        "sete dias e só podem ser usados uma vez.",
    );
  }

  await bd.pessoa.update({
    where: { id: pessoa.id },
    data: {
      senha: await guardarSenha(senha),
      convite: null,
      conviteExpiraEm: null,
      ultimoAcesso: new Date(),
    },
  });

  await abrirSessao(pessoa.id);
  redirect("/");
}

export async function acaoDeSair(): Promise<void> {
  await fecharSessao();
  redirect("/entrar");
}
