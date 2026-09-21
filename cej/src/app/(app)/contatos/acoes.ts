"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bd } from "@/lib/bd";
import { exigirPessoa } from "@/lib/auth";
import { novoId, novoSegredo } from "@/lib/ids";
import {
  arrumarNome, arrumarTelefone, comoVinculo, normalizarEmail, pareceEmail,
} from "@/lib/contatos";
import { valoresDigitados, type ComValores } from "@/lib/formulario";
import { lerPlanilha, type LinhaLida } from "@/lib/planilha";

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? "").trim();
const opcional = (d: FormData, campo: string) => texto(d, campo) || null;

export type RespostaDoContato = ComValores;

const recusar = (dados: FormData, erro: string): RespostaDoContato => ({
  erro,
  valores: valoresDigitados(dados),
});

/**
 * Cadastrar ou editar um contato à mão.
 *
 * O consentimento é uma caixa que alguém marca conscientemente, e o sistema
 * guarda **quando** foi marcada. Não vem ligada por padrão: quem cadastra um
 * contato à mão nem sempre tem autorização para mandar boletim a ele — ter o
 * e-mail de alguém e poder escrever para ele são duas coisas diferentes, e é
 * justamente essa diferença que a lei trata.
 */
export async function salvarContato(
  _anterior: RespostaDoContato,
  dados: FormData,
): Promise<RespostaDoContato> {
  await exigirPessoa();

  const id = texto(dados, "id") || null;
  const nome = arrumarNome(texto(dados, "nome"));
  const email = normalizarEmail(texto(dados, "email"));

  if (nome.length < 2) return recusar(dados, "Escreva o nome do contato.");
  if (!email || !pareceEmail(email)) return recusar(dados, "Escreva um e-mail válido.");

  const repetido = await bd.contato.findFirst({
    where: { email, ...(id ? { id: { not: id } } : {}) },
    select: { id: true, nome: true },
  });
  if (repetido) {
    return recusar(dados, `Este e-mail já está na base, em ${repetido.nome}.`);
  }

  const consentiu = texto(dados, "consentimento") === "sim";
  const anterior = id
    ? await bd.contato.findUnique({ where: { id }, select: { consentimentoEm: true } })
    : null;

  const campos = {
    nome,
    email,
    telefone: arrumarTelefone(texto(dados, "telefone")),
    vinculo: comoVinculo(texto(dados, "vinculo")),
    instituicao: opcional(dados, "instituicao"),
    origem: opcional(dados, "origem"),
    observacao: opcional(dados, "observacao"),
    // A data original é preservada quando o consentimento já existia: ela é a
    // prova de quando a pessoa disse sim, e reescrevê-la a cada edição apagaria
    // justamente o que ela serve para responder.
    consentimentoEm: consentiu ? (anterior?.consentimentoEm ?? new Date()) : null,
  };

  const salvo = id
    ? await bd.contato.update({ where: { id }, data: campos })
    : await bd.contato.create({ data: { id: novoId(), chave: novoSegredo(), ...campos } });

  await aplicarEtiquetas(salvo.id, texto(dados, "etiquetas"));

  revalidatePath("/contatos");
  redirect(`/contatos/${salvo.id}`);
}

/**
 * As etiquetas chegam como texto separado por vírgula, e viram linhas.
 *
 * Um campo de texto, e não uma lista de caixas: a equipe inventa recortes novos
 * o tempo todo ("simpósio 2026", "ex-bolsistas"), e uma lista fixa obrigaria a
 * pedir a alguém que a mudasse antes de poder usar.
 */
async function aplicarEtiquetas(contatoId: string, bruto: string): Promise<void> {
  const nomes = [...new Set(bruto.split(",").map((e) => e.trim()).filter(Boolean))];

  const ids: string[] = [];
  for (const nome of nomes) {
    const etiqueta = await bd.etiqueta.upsert({
      where: { nome },
      create: { id: novoId(), nome },
      update: {},
    });
    ids.push(etiqueta.id);
  }

  await bd.etiquetaNoContato.deleteMany({
    where: { contatoId, etiquetaId: { notIn: ids.length ? ids : ["-"] } },
  });
  if (ids.length) {
    await bd.etiquetaNoContato.createMany({
      data: ids.map((etiquetaId) => ({ contatoId, etiquetaId })),
      skipDuplicates: true,
    });
  }
}

export async function mudarEstadoDoContato(dados: FormData): Promise<void> {
  await exigirPessoa();
  const bruto = texto(dados, "estado");
  if (bruto !== "ATIVO" && bruto !== "DESCADASTRADO" && bruto !== "INVALIDO") return;

  await bd.contato.update({ where: { id: texto(dados, "id") }, data: { estado: bruto } });
  revalidatePath("/contatos");
}

export async function apagarContato(dados: FormData): Promise<void> {
  await exigirPessoa();
  await bd.contato.update({
    where: { id: texto(dados, "id") },
    data: { apagadoEm: new Date() },
  });
  revalidatePath("/contatos");
  redirect("/contatos");
}

// ---------------------------------------------------------------------------
// Importar planilha
// ---------------------------------------------------------------------------

export type Conferencia = {
  erro?: string;
  colunas?: { campo: string; coluna: string }[];
  naoReconhecidas?: string[];
  linhas?: (LinhaLida & { jaExiste: boolean })[];
  /** O que foi digitado no formulário, para a segunda etapa não perder. */
  origem?: string;
  etiquetas?: string;
  consentimento?: boolean;
};

/**
 * Primeira etapa: ler e mostrar, sem gravar nada.
 *
 * Importação que grava primeiro e explica depois é importação que se desfaz na
 * mão, contato por contato. Aqui a planilha é lida, conferida contra a base
 * (quem já existe aparece marcado) e mostrada inteira — e só depois de você
 * olhar é que a segunda etapa grava.
 */
export async function conferirPlanilha(
  _anterior: Conferencia | null,
  dados: FormData,
): Promise<Conferencia> {
  await exigirPessoa();

  const arquivo = dados.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: "Escolha o arquivo da planilha." };
  }
  if (arquivo.size > 8 * 1024 * 1024) {
    return { erro: "A planilha passa de 8 MB. Se ela tiver imagens dentro, salve só os dados." };
  }

  let leitura;
  try {
    leitura = lerPlanilha(Buffer.from(await arquivo.arrayBuffer()));
  } catch {
    return { erro: "Não consegui abrir este arquivo. Ele precisa ser .xlsx, .xls ou .csv." };
  }

  if (leitura.linhas.length === 0) {
    return {
      erro:
        "Não achei contatos aqui dentro. A planilha precisa de uma linha de cabeçalho com uma " +
        "coluna de e-mail — pode se chamar 'E-mail', 'email' ou 'e-mail institucional'.",
    };
  }

  const emails = leitura.linhas.map((l) => l.email).filter((e): e is string => e != null);
  const jaNaBase = new Set(
    (
      await bd.contato.findMany({
        where: { email: { in: emails } },
        select: { email: true },
      })
    ).map((c) => c.email),
  );

  return {
    colunas: leitura.colunas,
    naoReconhecidas: leitura.naoReconhecidas,
    linhas: leitura.linhas.map((l) => ({ ...l, jaExiste: l.email != null && jaNaBase.has(l.email) })),
    origem: texto(dados, "origem"),
    etiquetas: texto(dados, "etiquetas"),
    consentimento: texto(dados, "consentimento") === "sim",
  };
}

export type ResultadoDaImportacao = { erro?: string; novos?: number; atualizados?: number } | null;

/**
 * Segunda etapa: gravar.
 *
 * Quem já existe é **atualizado**, nunca duplicado — e quem se descadastrou
 * continua descadastrado, aconteça o que acontecer com a planilha. Esta é a
 * regra que não pode ter exceção: a pessoa pediu para sair, e importar de novo
 * a lista velha não desfaz o pedido dela.
 */
export async function gravarImportacao(
  _anterior: ResultadoDaImportacao,
  dados: FormData,
): Promise<ResultadoDaImportacao> {
  await exigirPessoa();

  let linhas: LinhaLida[];
  try {
    linhas = JSON.parse(texto(dados, "linhas")) as LinhaLida[];
  } catch {
    return { erro: "Perdi a leitura da planilha. Comece de novo, escolhendo o arquivo." };
  }

  const origem = opcional(dados, "origem");
  const consentiu = texto(dados, "consentimento") === "sim";
  const nomesDeEtiquetas = [
    ...new Set(texto(dados, "etiquetas").split(",").map((e) => e.trim()).filter(Boolean)),
  ];

  const etiquetaIds: string[] = [];
  for (const nome of nomesDeEtiquetas) {
    const etiqueta = await bd.etiqueta.upsert({
      where: { nome },
      create: { id: novoId(), nome },
      update: {},
    });
    etiquetaIds.push(etiqueta.id);
  }

  let novos = 0;
  let atualizados = 0;

  for (const linha of linhas) {
    if (linha.problema || !linha.email) continue;

    const existente = await bd.contato.findUnique({
      where: { email: linha.email },
      select: { id: true, estado: true, consentimentoEm: true, apagadoEm: true },
    });

    const comuns = {
      nome: linha.nome || linha.email,
      telefone: linha.telefone,
      vinculo: linha.vinculo,
      instituicao: linha.instituicao,
      observacao: linha.observacao,
    };

    let contatoId: string;

    if (existente) {
      contatoId = existente.id;
      await bd.contato.update({
        where: { id: existente.id },
        data: {
          ...comuns,
          // Descadastrado continua descadastrado. Uma planilha não desfaz um pedido.
          ...(existente.estado === "DESCADASTRADO"
            ? {}
            : { consentimentoEm: consentiu ? (existente.consentimentoEm ?? new Date()) : existente.consentimentoEm }),
          apagadoEm: null,
        },
      });
      atualizados++;
    } else {
      const criado = await bd.contato.create({
        data: {
          id: novoId(),
          chave: novoSegredo(),
          email: linha.email,
          ...comuns,
          origem,
          consentimentoEm: consentiu ? new Date() : null,
        },
      });
      contatoId = criado.id;
      novos++;
    }

    // As etiquetas da planilha somam-se às escolhidas na tela; importar não
    // apaga etiqueta que alguém pôs à mão antes.
    const daLinha: string[] = [];
    for (const nome of linha.etiquetas) {
      const etiqueta = await bd.etiqueta.upsert({
        where: { nome },
        create: { id: novoId(), nome },
        update: {},
      });
      daLinha.push(etiqueta.id);
    }

    const todas = [...new Set([...etiquetaIds, ...daLinha])];
    if (todas.length) {
      await bd.etiquetaNoContato.createMany({
        data: todas.map((etiquetaId) => ({ contatoId, etiquetaId })),
        skipDuplicates: true,
      });
    }
  }

  revalidatePath("/contatos");
  return { novos, atualizados };
}
