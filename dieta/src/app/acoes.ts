"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { escreverAjustes, lerAjustes, type Ajustes } from "@/lib/ajustes";
import { entrar, exigirSessao, sair } from "@/lib/auth";
import { bd } from "@/lib/bd";
import { lerTexto } from "@/lib/conteudo";
import { hoje, normalizarHora } from "@/lib/datas";
import { novoId } from "@/lib/ids";

/**
 * Tudo o que grava. Cada ação confere a sessão de novo: uma server action é um
 * endereço público, e o middleware só olha se o cookie existe.
 */

export async function acaoDeEntrar(_anterior: { erro?: string } | null, dados: FormData) {
  const codigo = String(dados.get("codigo") ?? "");
  const resultado = await entrar(codigo);
  if (!resultado.ok) return { erro: resultado.motivo ?? "Não consegui entrar." };
  redirect("/");
}

export async function acaoDeSair() {
  await sair();
  redirect("/entrar");
}

const ehDia = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const atualizarTudo = () => revalidatePath("/", "layout");

// ---------------------------------------------------------------------------
// O dia
// ---------------------------------------------------------------------------

/** Marca uma refeição do dia. Estado vazio desmarca. */
export async function marcarRefeicao(dia: string, refeicaoId: string, estado: "" | "seguiu" | "trocou" | "pulou", nota = "") {
  await exigirSessao();
  if (!ehDia(dia)) return;
  if (!estado) {
    await bd.registro.deleteMany({ where: { dia, refeicaoId } });
  } else {
    const r = await bd.refeicao.findUnique({ where: { id: refeicaoId } });
    if (!r) return;
    const dados = { estado, nota: estado === "trocou" ? nota.trim().slice(0, 300) : "", nome: r.nome, horario: r.horario };
    await bd.registro.upsert({
      where: { dia_refeicaoId: { dia, refeicaoId } },
      create: { id: novoId(), dia, refeicaoId, ...dados },
      update: dados,
    });
  }
  atualizarTudo();
}

export async function beberAgua(ml: number) {
  await exigirSessao();
  if (!Number.isFinite(ml) || ml < 1 || ml > 3000) return;
  await bd.agua.create({ data: { id: novoId(), dia: hoje(), ml: Math.round(ml) } });
  atualizarTudo();
}

/** Desfaz o último copo de hoje. */
export async function desfazerAgua() {
  await exigirSessao();
  const ultimo = await bd.agua.findFirst({ where: { dia: hoje() }, orderBy: { criadoEm: "desc" } });
  if (ultimo) await bd.agua.delete({ where: { id: ultimo.id } });
  atualizarTudo();
}

// ---------------------------------------------------------------------------
// O plano
// ---------------------------------------------------------------------------

export type RefeicaoParaSalvar = {
  nome: string;
  horario: string;
  /** No formato de texto de `conteudo.ts`. */
  texto: string;
  nota: string;
  dias: number[];
};

/**
 * Salva um plano inteiro (o que veio da leitura, conferido) e o torna o plano
 * em uso. O anterior fica guardado, desligado.
 */
export async function salvarPlanoNovo(plano: {
  nome: string;
  orientacoes: string;
  aguaMl: number | null;
  refeicoes: RefeicaoParaSalvar[];
}): Promise<{ erro?: string }> {
  await exigirSessao();
  const refeicoes = plano.refeicoes
    .map((r) => ({ ...r, nome: r.nome.trim(), horario: normalizarHora(r.horario), conteudo: lerTexto(r.texto) }))
    .filter((r) => r.nome && r.conteudo.length);
  if (refeicoes.length === 0) return { erro: "O plano ficou sem refeições. Confira antes de salvar." };
  const semHora = refeicoes.find((r) => !r.horario);
  if (semHora) return { erro: `"${semHora.nome}" está sem horário válido (use, por exemplo, 7:30).` };

  const id = novoId();
  await bd.$transaction([
    bd.plano.updateMany({ where: { ativo: true }, data: { ativo: false } }),
    bd.plano.create({
      data: {
        id,
        nome: plano.nome.trim().slice(0, 80) || "Plano da nutricionista",
        orientacoes: plano.orientacoes.trim().slice(0, 3000),
        ativo: true,
        refeicoes: {
          create: refeicoes.map((r, ordem) => ({
            id: novoId(),
            nome: r.nome.slice(0, 60),
            horario: r.horario!,
            ordem,
            conteudo: r.conteudo,
            nota: r.nota.trim().slice(0, 500),
            dias: r.dias,
          })),
        },
      },
    }),
    ...(plano.aguaMl ? [bd.ajuste.upsert({ where: { chave: "aguaMeta" }, create: { chave: "aguaMeta", valor: String(plano.aguaMl) }, update: { valor: String(plano.aguaMl) } })] : []),
  ]);
  atualizarTudo();
  return {};
}

/** Cria ou altera uma refeição do plano em uso. */
export async function salvarRefeicao(
  planoId: string,
  refeicaoId: string | null,
  r: RefeicaoParaSalvar & { avisar: boolean },
): Promise<{ erro?: string }> {
  await exigirSessao();
  const nome = r.nome.trim().slice(0, 60);
  const horario = normalizarHora(r.horario);
  const conteudo = lerTexto(r.texto);
  if (!nome) return { erro: "Dê um nome à refeição." };
  if (!horario) return { erro: "Horário inválido. Use, por exemplo, 7:30." };
  if (conteudo.length === 0) return { erro: "Escreva pelo menos um alimento." };
  const dias = [...new Set(r.dias.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  const dados = { nome, horario, conteudo, nota: r.nota.trim().slice(0, 500), dias: dias.length === 7 ? [] : dias, avisar: r.avisar };

  if (refeicaoId) {
    await bd.refeicao.update({ where: { id: refeicaoId }, data: dados });
  } else {
    const ordem = await bd.refeicao.count({ where: { planoId } });
    await bd.refeicao.create({ data: { id: novoId(), planoId, ordem, ...dados } });
  }
  atualizarTudo();
  return {};
}

export async function apagarRefeicao(refeicaoId: string) {
  await exigirSessao();
  await bd.refeicao.deleteMany({ where: { id: refeicaoId } });
  atualizarTudo();
}

export async function alternarAviso(refeicaoId: string, avisar: boolean) {
  await exigirSessao();
  await bd.refeicao.updateMany({ where: { id: refeicaoId }, data: { avisar } });
  atualizarTudo();
}

export async function salvarOrientacoes(planoId: string, nome: string, orientacoes: string) {
  await exigirSessao();
  await bd.plano.updateMany({
    where: { id: planoId },
    data: { nome: nome.trim().slice(0, 80) || "Plano da nutricionista", orientacoes: orientacoes.trim().slice(0, 3000) },
  });
  atualizarTudo();
}

/** Começa um plano vazio, para quem prefere cadastrar à mão. */
export async function criarPlanoVazio() {
  await exigirSessao();
  await bd.$transaction([
    bd.plano.updateMany({ where: { ativo: true }, data: { ativo: false } }),
    bd.plano.create({ data: { id: novoId(), nome: "Meu plano", ativo: true } }),
  ]);
  atualizarTudo();
}

/** Volta a usar um plano antigo. */
export async function usarPlano(planoId: string) {
  await exigirSessao();
  await bd.$transaction([
    bd.plano.updateMany({ where: { ativo: true }, data: { ativo: false } }),
    bd.plano.update({ where: { id: planoId }, data: { ativo: true } }),
  ]);
  atualizarTudo();
}

export async function apagarPlano(planoId: string) {
  await exigirSessao();
  await bd.plano.deleteMany({ where: { id: planoId, ativo: false } });
  atualizarTudo();
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

export async function salvarAjustes(parcial: Partial<Ajustes>) {
  await exigirSessao();
  // Passa pelo leitor para o que vier estranho cair no padrão, em vez de gravar lixo.
  const atuais = lerAjustes(await bd.ajuste.findMany());
  const conferidos = lerAjustes(escreverAjustes({ ...atuais, ...parcial }));
  const fim = conferidos.aguaFim <= conferidos.aguaInicio ? atuais.aguaFim : conferidos.aguaFim;
  await bd.$transaction(
    escreverAjustes({ ...conferidos, aguaFim: fim }).map(({ chave, valor }) =>
      bd.ajuste.upsert({ where: { chave }, create: { chave, valor }, update: { valor } }),
    ),
  );
  atualizarTudo();
}

// ---------------------------------------------------------------------------
// Fotos e lembretes
// ---------------------------------------------------------------------------

export async function apagarFoto(id: string) {
  await exigirSessao();
  await bd.foto.deleteMany({ where: { id } });
  atualizarTudo();
}

export type LembreteParaSalvar = { titulo: string; texto: string; horario: string; dias: number[]; ativo: boolean };

export async function salvarLembrete(id: string | null, l: LembreteParaSalvar): Promise<{ erro?: string }> {
  await exigirSessao();
  const titulo = l.titulo.trim().slice(0, 60);
  const horario = normalizarHora(l.horario);
  if (!titulo) return { erro: "Dê um nome ao lembrete." };
  if (!horario) return { erro: "Horário inválido. Use, por exemplo, 8:00." };
  const dias = [...new Set(l.dias.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  const dados = { titulo, texto: l.texto.trim().slice(0, 200), horario, dias: dias.length === 7 ? [] : dias, ativo: l.ativo };
  if (id) await bd.lembrete.update({ where: { id }, data: dados });
  else await bd.lembrete.create({ data: { id: novoId(), ...dados } });
  atualizarTudo();
  return {};
}

export async function alternarLembrete(id: string, ativo: boolean) {
  await exigirSessao();
  await bd.lembrete.updateMany({ where: { id }, data: { ativo } });
  atualizarTudo();
}

export async function apagarLembrete(id: string) {
  await exigirSessao();
  await bd.lembrete.deleteMany({ where: { id } });
  atualizarTudo();
}
