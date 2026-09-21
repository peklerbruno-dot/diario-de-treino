import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { bd } from "./bd";

/**
 * A porta, com uma conta por pessoa.
 *
 * O Termômetro, neste mesmo repositório, tem um código só: é app de uma pessoa.
 * Aqui não dá. Encaminhamento tem dono, ata tem quem escreveu, e "o que está na
 * minha mão" é uma pergunta que exige que o sistema saiba quem é "eu".
 *
 * A sessão é um cookie assinado com HMAC — `pessoaId.expira.assinatura`. O
 * servidor não guarda sessão nenhuma: a assinatura é a prova. Trocar
 * `AUTH_SECRET` derruba todas as sessões de uma vez, que é o botão de pânico
 * que se quer ter caso um computador se perca.
 *
 * Mesmo assim a pessoa é buscada no banco a cada visita: é o que faz desativar
 * alguém ter efeito imediato, em vez de esperar o cookie vencer.
 */

const COOKIE = "cej_sessao";
const DURACAO_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias

function segredo(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET ausente ou curto demais.");
    }
    return "segredo-de-desenvolvimento-nao-use-em-producao";
  }
  return s;
}

const assinar = (carga: string) => createHmac("sha256", segredo()).update(carga).digest("base64url");

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export type PessoaNaSessao = {
  id: string;
  nome: string;
  email: string;
  papel: "COORDENACAO" | "MEMBRO";
  chaveDaAgenda: string;
};

export async function abrirSessao(pessoaId: string): Promise<void> {
  const expira = Date.now() + DURACAO_MS;
  const carga = `${pessoaId}.${expira}`;
  const jar = await cookies();
  jar.set(COOKIE, `${carga}.${assinar(carga)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expira),
  });
}

export async function fecharSessao(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** O id que o cookie afirma — já conferida a assinatura e o prazo. */
async function idDaSessao(): Promise<string | null> {
  const jar = await cookies();
  const bruto = jar.get(COOKIE)?.value;
  if (!bruto) return null;

  const pedacos = bruto.split(".");
  if (pedacos.length !== 3) return null;
  const [pessoaId, expira, assinatura] = pedacos;

  if (!iguais(assinar(`${pessoaId}.${expira}`), assinatura)) return null;
  if (!(Number(expira) > Date.now())) return null;
  return pessoaId;
}

/**
 * Quem está usando o sistema agora, ou nulo.
 *
 * `cache` do React porque uma mesma página pergunta isso várias vezes — a casca
 * para escrever o nome, a tela para filtrar o que é seu — e sem ele seria uma
 * ida ao banco por pergunta.
 */
export const pessoaAtual = cache(async (): Promise<PessoaNaSessao | null> => {
  const id = await idDaSessao();
  if (!id) return null;

  const pessoa = await bd.pessoa.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, papel: true, chaveDaAgenda: true, ativa: true },
  });
  if (!pessoa || !pessoa.ativa) return null;

  const { ativa: _ativa, ...naSessao } = pessoa;
  return naSessao;
});

export async function exigirPessoa(): Promise<PessoaNaSessao> {
  const pessoa = await pessoaAtual();
  if (!pessoa) redirect("/entrar");
  return pessoa;
}

/**
 * As telas que só a coordenação abre. Quem não é da coordenação volta para o
 * painel em vez de ver um erro: não é falha dela ter clicado.
 */
export async function exigirCoordenacao(): Promise<PessoaNaSessao> {
  const pessoa = await exigirPessoa();
  if (pessoa.papel !== "COORDENACAO") redirect("/");
  return pessoa;
}

export const NOME_DO_COOKIE = COOKIE;

/**
 * Ainda não há ninguém: o sistema acabou de subir.
 *
 * Enquanto for verdade, a tela de entrada oferece fundar a primeira conta — e
 * ela exige o `CODIGO_DE_FUNDACAO`, para que o primeiro estranho que topar com
 * o endereço não vire a coordenação do Centro.
 */
export async function sistemaVazio(): Promise<boolean> {
  return (await bd.pessoa.count()) === 0;
}

export const codigoDeFundacaoConfigurado = () =>
  (process.env.CODIGO_DE_FUNDACAO ?? "").trim().length >= 8;

export function codigoDeFundacaoConfere(codigo: string): boolean {
  const esperado = (process.env.CODIGO_DE_FUNDACAO ?? "").trim();
  if (esperado.length < 8) return false;
  return iguais(esperado, codigo.trim());
}
