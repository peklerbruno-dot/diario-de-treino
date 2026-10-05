"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { escreverAjustes, lerAjustes, type Ajustes } from "@/lib/ajustes";
import { entrar, exigirSessao, sair } from "@/lib/auth";
import { bd } from "@/lib/bd";
import { lerTexto } from "@/lib/conteudo";
import { normalizarPlanejamento } from "@/lib/semana";
import { normalizarAnalise, type Analise } from "@/lib/analise";
import { agoraNoFuso, hoje, normalizarHora, paraHora } from "@/lib/datas";
import { ehFome, ehHumor } from "@/lib/padroes";
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
    // A hora só vale quando a marcação é no próprio dia: marcar o almoço de
    // ontem hoje cedo não diz nada sobre a hora em que se almoçou.
    const agora = agoraNoFuso();
    const hora = agora.dia === dia ? paraHora(agora.minutos) : "";
    await bd.registro.upsert({
      where: { dia_refeicaoId: { dia, refeicaoId } },
      create: { id: novoId(), dia, refeicaoId, hora, ...dados },
      update: dados,
    });
  }
  atualizarTudo();
}

export type FichaDaRefeicao = {
  dia: string;
  refeicaoId: string;
  estado: "seguiu" | "trocou" | "pulou";
  /** O que comeu, ou o motivo de ter pulado. */
  nota: string;
  fome: string;
  humor: string;
  obs: string;
};

/**
 * Salva a ficha inteira de uma refeição: como foi, o que comeu, a fome antes,
 * como ficou e a observação. A hora entra só na primeira vez, e só se for
 * no próprio dia (ver marcarRefeicao).
 */
export async function salvarFicha(f: FichaDaRefeicao) {
  await exigirSessao();
  if (!ehDia(f.dia) || !["seguiu", "trocou", "pulou"].includes(f.estado)) return;
  const r = await bd.refeicao.findUnique({ where: { id: f.refeicaoId } });
  if (!r) return;
  const dados = {
    estado: f.estado,
    nota: f.nota.trim().slice(0, 300),
    fome: ehFome(f.fome) ? f.fome : "",
    humor: ehHumor(f.humor) ? f.humor : "",
    obs: f.obs.trim().slice(0, 500),
    nome: r.nome,
    horario: r.horario,
  };
  const agora = agoraNoFuso();
  const hora = agora.dia === f.dia ? paraHora(agora.minutos) : "";
  await bd.registro.upsert({
    where: { dia_refeicaoId: { dia: f.dia, refeicaoId: f.refeicaoId } },
    create: { id: novoId(), dia: f.dia, refeicaoId: f.refeicaoId, hora, ...dados },
    update: dados,
  });
  atualizarTudo();
}

/** Cadastra uma refeição padrão para a refeição `refeicao` (pelo nome). */
export async function salvarPadrao(refeicao: string, texto: string) {
  await exigirSessao();
  const t = texto.trim().slice(0, 200);
  const nome = refeicao.trim().slice(0, 80);
  if (!t || !nome) return;
  const ja = await bd.padrao.findFirst({ where: { refeicao: nome, texto: { equals: t, mode: "insensitive" } } });
  if (ja) return;
  const n = await bd.padrao.count({ where: { refeicao: nome } });
  await bd.padrao.create({ data: { id: novoId(), refeicao: nome, texto: t, ordem: n } });
  atualizarTudo();
}

export async function apagarPadrao(id: string) {
  await exigirSessao();
  await bd.padrao.deleteMany({ where: { id } });
  atualizarTudo();
}

/** Como estava na refeição: "bem", "ok" ou "mal". Tocar de novo apaga. */
export async function marcarHumor(dia: string, refeicaoId: string, humor: string) {
  await exigirSessao();
  if (!ehDia(dia) || !(humor === "" || ehHumor(humor))) return;
  await bd.registro.updateMany({ where: { dia, refeicaoId }, data: { humor } });
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

/**
 * A análise corrigida à mão: os itens e os números, quando a correção pelo
 * Gemini não serve (ou a cota acabou). O que não vier fica como estava.
 */
export async function editarAnalise(id: string, nova: Partial<Analise>) {
  await exigirSessao();
  const foto = await bd.foto.findUnique({ where: { id }, select: { analise: true, texto: true } });
  if (!foto) return;
  const junto = { descricao: "", comentario: "", noPlano: "sem-plano", ...normalizarAnalise(foto.analise), ...nova };
  // Sem descrição a análise não vale; a lista de itens (ou o texto anotado) faz as vezes dela.
  if (!junto.descricao) junto.descricao = (junto.itens ?? []).map((i) => i.alimento).join(", ") || foto.texto || "Refeição";
  const analise = normalizarAnalise(junto);
  if (analise) await bd.foto.update({ where: { id }, data: { analise } });
  atualizarTudo();
}

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

// ---------------------------------------------------------------------------
// Peso e medidas
// ---------------------------------------------------------------------------

/** "72,4" → 72400 (gramas); "82,5" cm → 825 (mm). Vazio ou absurdo → null. */
const decimal = (s: string, fator: number, min: number, max: number) => {
  const n = Number(String(s).replace(",", ".").trim());
  return s.trim() && Number.isFinite(n) && n >= min && n <= max ? Math.round(n * fator) : null;
};

export async function salvarMedida(m: { dia: string; peso: string; cintura: string; quadril: string; braco: string; nota: string }): Promise<{ erro?: string }> {
  await exigirSessao();
  const dia = ehDia(m.dia) ? m.dia : hoje();
  const dados = {
    pesoG: decimal(m.peso, 1000, 20, 400),
    cinturaMm: decimal(m.cintura, 10, 30, 250),
    quadrilMm: decimal(m.quadril, 10, 30, 250),
    bracoMm: decimal(m.braco, 10, 10, 80),
    nota: m.nota.trim().slice(0, 200),
  };
  if (dados.pesoG == null && dados.cinturaMm == null && dados.quadrilMm == null && dados.bracoMm == null) {
    return { erro: "Preencha pelo menos o peso ou uma medida (use vírgula: 72,4)." };
  }
  await bd.medida.create({ data: { id: novoId(), dia, ...dados } });
  atualizarTudo();
  return {};
}

export async function apagarMedida(id: string) {
  await exigirSessao();
  await bd.medida.deleteMany({ where: { id } });
  atualizarTudo();
}

// ---------------------------------------------------------------------------
// Lista de compras da semana
// ---------------------------------------------------------------------------

export async function marcarComprado(semanaId: string, chave: string, comprado: boolean) {
  await exigirSessao();
  const s = await bd.semana.findUnique({ where: { id: semanaId }, select: { marcados: true } });
  if (!s) return;
  const marcados = new Set(s.marcados);
  if (comprado) marcados.add(chave);
  else marcados.delete(chave);
  await bd.semana.update({ where: { id: semanaId }, data: { marcados: [...marcados] } });
  atualizarTudo();
}

/** Acrescenta um item à mão na lista (seção "Outros"). */
export async function adicionarCompra(semanaId: string, item: string) {
  await exigirSessao();
  const nome = item.trim().slice(0, 80);
  const s = await bd.semana.findUnique({ where: { id: semanaId } });
  if (!s || !nome) return;
  const dados = normalizarPlanejamento(s.dados);
  if (!dados) return;
  const outros = dados.compras.find((c) => c.secao === "Outros") ?? { secao: "Outros", itens: [] };
  if (!dados.compras.includes(outros)) dados.compras.push(outros);
  outros.itens.push({ item: nome, quantidade: "" });
  await bd.semana.update({ where: { id: semanaId }, data: { dados } });
  atualizarTudo();
}

// ---------------------------------------------------------------------------
// Fotos do corpo
// ---------------------------------------------------------------------------

export async function apagarFotoDoCorpo(id: string) {
  await exigirSessao();
  await bd.fotoCorpo.deleteMany({ where: { id } });
  atualizarTudo();
}
