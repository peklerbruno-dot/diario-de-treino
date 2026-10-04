import "server-only";
import { Prisma } from "@prisma/client";
import { abrirSessao, DONO, impressaoDoCodigo } from "./auth";
import { bd } from "./bd";
import { gerarCodigo, novoIdentificador } from "./codigos";

/**
 * Quem usa o app além do dono, e como chega.
 *
 * O dono convida pelo nome; o app cria a pessoa (vazia, sem código) e um
 * convite de uso único. O link vai pelo WhatsApp. Quem o abre e toca em
 * "Criar meu acesso" recebe o código ali, na tela, uma vez — o banco guarda
 * só a impressão. Abrir o link sem tocar no botão (a prévia que o WhatsApp
 * monta faz exatamente isso) não gasta o convite.
 */

const VALIDADE_DO_CONVITE_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

export interface Pessoa {
  id: string;
  nome: string;
  criadaEm: string;
  /** Já abriu o convite e tem código. */
  ativa: boolean;
  /** Convite ainda não usado, se houver um valendo. */
  conviteValendo: { token: string; expiraEm: string } | null;
}

export async function listarPessoas(): Promise<Pessoa[]> {
  const agora = new Date();
  const pessoas = await bd.usuario.findMany({
    where: { id: { not: DONO } },
    orderBy: { criadoEm: "asc" },
    include: {
      convites: {
        where: { usadoEm: null, expiraEm: { gt: agora } },
        orderBy: { criadoEm: "desc" },
        take: 1,
      },
    },
  });
  return pessoas.map((p) => ({
    id: p.id,
    nome: p.nome,
    criadaEm: p.criadoEm.toISOString(),
    ativa: p.codigoHash !== null,
    conviteValendo: p.convites[0]
      ? { token: p.convites[0].token, expiraEm: p.convites[0].expiraEm.toISOString() }
      : null,
  }));
}

/** Um convite novo para quem o dono escolher. Cria a pessoa se ela não existe. */
export async function convidar(nome: string): Promise<{ token: string }> {
  const limpo = nome.trim().slice(0, 40);
  if (!limpo) throw new Error("Diga o nome de quem você vai convidar.");
  const usuario = await bd.usuario.create({ data: { id: novoIdentificador(), nome: limpo } });
  return novoConviteDe(usuario.id);
}

/**
 * Um convite novo para quem já existe — é o "perdi meu código": quando o
 * convite novo for aceito, o código antigo deixa de valer.
 */
export async function novoConviteDe(usuarioId: string): Promise<{ token: string }> {
  if (usuarioId === DONO) throw new Error("O dono entra com o código da Vercel.");
  const token = novoIdentificador(32);
  await bd.$transaction([
    // Um convite valendo por pessoa: o novo aposenta os anteriores.
    bd.convite.updateMany({
      where: { usuarioId, usadoEm: null },
      data: { expiraEm: new Date() },
    }),
    bd.convite.create({
      data: { token, usuarioId, expiraEm: new Date(Date.now() + VALIDADE_DO_CONVITE_MS) },
    }),
  ]);
  return { token };
}

/** Remove a pessoa e TUDO o que ela lançou. Não tem volta. */
export async function removerPessoa(usuarioId: string): Promise<void> {
  if (usuarioId === DONO) throw new Error("O dono não pode ser removido.");
  await bd.usuario.delete({ where: { id: usuarioId } });
}

/** O convite ainda vale? Só para mostrar a página — não gasta nada. */
export async function conviteValendo(token: string): Promise<{ nome: string } | null> {
  if (!/^[A-Za-z0-9]{32}$/.test(token)) return null;
  const convite = await bd.convite.findUnique({
    where: { token },
    include: { usuario: { select: { nome: true } } },
  });
  if (!convite || convite.usadoEm || convite.expiraEm <= new Date()) return null;
  return { nome: convite.usuario.nome };
}

/**
 * Aceita o convite: gasta o token, gera o código, abre a sessão.
 *
 * "Gastar" é um updateMany condicional — só marca se ainda não foi usado e
 * não venceu. Dois toques ao mesmo tempo (ou duas pessoas com o mesmo link)
 * não ganham os dois: só um update encontra a linha ainda livre.
 */
export async function aceitarConvite(
  token: string,
): Promise<{ ok: true; codigo: string; nome: string } | { ok: false; motivo: string }> {
  if (!/^[A-Za-z0-9]{32}$/.test(token)) return { ok: false, motivo: "Convite inválido." };

  const agora = new Date();
  const gasto = await bd.convite.updateMany({
    where: { token, usadoEm: null, expiraEm: { gt: agora } },
    data: { usadoEm: agora },
  });
  if (gasto.count === 0) {
    return { ok: false, motivo: "Este convite já foi usado ou venceu. Peça um novo ao BP." };
  }

  const convite = await bd.convite.findUniqueOrThrow({
    where: { token },
    include: { usuario: true },
  });

  const codigo = await gravarCodigoNovo(convite.usuarioId);
  await abrirSessao(convite.usuarioId);
  return { ok: true, codigo, nome: convite.usuario.nome };
}

/** Quem já entrou troca o próprio código (perdeu, ou quer um novo). */
export async function trocarMeuCodigo(usuarioId: string): Promise<string> {
  if (usuarioId === DONO) throw new Error("O código do dono é o da Vercel.");
  return gravarCodigoNovo(usuarioId);
}

/**
 * Gera e grava um código. A impressão é única no banco; se por um acaso
 * astronômico sair um código que já é de alguém, gera outro — e quem pediu
 * nunca fica sabendo do código alheio, porque ele nem chega a ser mostrado.
 */
async function gravarCodigoNovo(usuarioId: string): Promise<string> {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = gerarCodigo();
    try {
      await bd.usuario.update({
        where: { id: usuarioId },
        data: { codigoHash: impressaoDoCodigo(codigo) },
      });
      return codigo;
    } catch (erro) {
      const repetido =
        erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
      if (!repetido) throw erro;
    }
  }
  throw new Error("Não consegui gerar um código agora. Tente de novo.");
}
