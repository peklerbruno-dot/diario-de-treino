"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bd } from "@/lib/bd";
import { exigirPessoa } from "@/lib/auth";
import { novoId } from "@/lib/ids";
import { enderecoDoSistema } from "@/lib/endereco";
import { montarBoletim, type AtividadeNoEmail } from "@/lib/boletim";
import { enviarLote, enviarUma, MAXIMO_POR_LOTE, porQueNaoConfigurado } from "@/lib/email";
import { quemRecebe } from "@/lib/consultas-contatos";

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? "").trim();
const opcional = (d: FormData, campo: string) => texto(d, campo) || null;

export async function criarBoletim(): Promise<void> {
  await exigirPessoa();
  const boletim = await bd.boletim.create({
    data: { id: novoId(), assunto: "Boletim do Centro de Estudos Judaicos" },
  });
  redirect(`/boletins/${boletim.id}`);
}

export type RespostaDoBoletim = { erro?: string; recado?: string } | null;

/**
 * Guardar o rascunho.
 *
 * Um boletim já enviado não se edita. Não é zelo: o e-mail já está na caixa das
 * pessoas, e mudar o texto aqui só criaria uma segunda versão da verdade — a
 * que o sistema mostra e a que o mundo leu.
 */
export async function salvarBoletim(
  _anterior: RespostaDoBoletim,
  dados: FormData,
): Promise<RespostaDoBoletim> {
  await exigirPessoa();
  const id = texto(dados, "id");

  const atual = await bd.boletim.findUnique({ where: { id }, select: { estado: true } });
  if (!atual) return { erro: "Este boletim não existe mais." };
  if (atual.estado !== "RASCUNHO") {
    return { erro: "Este boletim já foi enviado, e um boletim enviado não muda mais." };
  }

  const assunto = texto(dados, "assunto");
  if (assunto.length < 3) return { erro: "Escreva o assunto — é a linha que a pessoa lê na caixa de entrada." };

  await bd.boletim.update({
    where: { id },
    data: {
      assunto,
      corpo: texto(dados, "corpo"),
      filtroVinculo: opcional(dados, "filtroVinculo"),
      filtroEtiquetaId: opcional(dados, "filtroEtiquetaId"),
    },
  });

  const escolhidas = dados.getAll("atividades").map(String).filter(Boolean);
  await bd.atividadeNoBoletim.deleteMany({ where: { boletimId: id } });
  if (escolhidas.length) {
    await bd.atividadeNoBoletim.createMany({
      data: escolhidas.map((atividadeId, ordem) => ({ boletimId: id, atividadeId, ordem })),
    });
  }

  revalidatePath(`/boletins/${id}`);
  return { recado: "Guardado." };
}

/** As atividades do boletim, no formato que o e-mail entende. */
async function atividadesDoBoletim(boletimId: string, endereco: string): Promise<AtividadeNoEmail[]> {
  const linhas = await bd.atividadeNoBoletim.findMany({
    where: { boletimId },
    include: { atividade: true },
    orderBy: { ordem: "asc" },
  });

  return linhas.map(({ atividade: a }) => ({
    titulo: a.titulo,
    tipo: a.tipo,
    dia: a.dia,
    diaFinal: a.diaFinal,
    hora: a.hora,
    local: a.local,
    resumo: a.resumo,
    // A inscrição do próprio sistema tem preferência sobre um formulário de
    // fora: é ela que registra o consentimento e faz a base crescer.
    linkDeInscricao:
      a.inscricaoAberta && a.chavePublica
        ? `${endereco}/inscricao/${a.chavePublica}`
        : a.linkDeInscricao,
  }));
}

/**
 * O teste, para o seu próprio e-mail.
 *
 * É o único jeito honesto de conferir um boletim. A tela mostra uma
 * pré-visualização, mas quem decide como aquilo fica é o Gmail, o Outlook e o
 * Mail do iPhone — e cada um decide diferente.
 */
export async function enviarTeste(dados: FormData): Promise<void> {
  const pessoa = await exigirPessoa();
  const id = texto(dados, "id");

  const impedimento = porQueNaoConfigurado();
  if (impedimento) {
    redirect(`/boletins/${id}?erro=${encodeURIComponent(impedimento)}`);
  }

  const boletim = await bd.boletim.findUnique({ where: { id } });
  if (!boletim) redirect("/boletins");

  const endereco = await enderecoDoSistema();
  const { html, texto: corpoEmTexto, linkDeDescadastro } = montarBoletim({
    assunto: boletim.assunto,
    corpo: boletim.corpo,
    atividades: await atividadesDoBoletim(id, endereco),
    destinatario: { nome: pessoa.nome, email: pessoa.email, chave: "teste" },
    endereco,
  });

  const resultado = await enviarUma({
    para: pessoa.email,
    assunto: `[teste] ${boletim.assunto}`,
    html,
    texto: corpoEmTexto,
    linkDeDescadastro,
  });

  redirect(
    `/boletins/${id}?${
      resultado.ok
        ? `recado=${encodeURIComponent(`Teste enviado para ${pessoa.email}.`)}`
        : `erro=${encodeURIComponent(resultado.erro)}`
    }`,
  );
}

export type RespostaDoTeste = {
  erro?: string;
  pronto?: string;
  /** O endereço usado, para o campo não voltar ao valor de antes — o React 19
   * limpa o formulário depois de cada envio. */
  para?: string;
} | null;

/**
 * Um teste avulso, para um endereço qualquer.
 *
 * Existe separado do teste de dentro do boletim porque serve a outro momento: o
 * de conferir se o envio **está de pé**, logo depois de cadastrar as variáveis
 * ou de mexer no domínio — quando ainda não há boletim nenhum escrito, e criar
 * um rascunho só para descobrir isso seria um desvio sem sentido.
 *
 * Manda para outro endereço de propósito: é a única forma de conferir se a
 * mensagem chega fora da USP, que é onde a maior parte da base está.
 */
export async function enviarTesteDeConfiguracao(
  _anterior: RespostaDoTeste,
  dados: FormData,
): Promise<RespostaDoTeste> {
  const pessoa = await exigirPessoa();

  const impedimento = porQueNaoConfigurado();
  if (impedimento) return { erro: impedimento };

  const para = texto(dados, "para").toLocaleLowerCase("pt-BR") || pessoa.email;
  if (!para.includes("@")) {
    return { erro: "Escreva um e-mail válido para receber o teste.", para };
  }

  const endereco = await enderecoDoSistema();
  const { html, texto: corpoEmTexto, linkDeDescadastro } = montarBoletim({
    assunto: "Teste de envio do sistema do Centro",
    corpo:
      "Se esta mensagem chegou, o envio de boletins está funcionando.\n\n" +
      "Ela foi disparada pela tela de configuração do sistema e não foi para mais ninguém.\n\n" +
      "Vale conferir três coisas: se ela caiu na caixa de entrada e não no spam; " +
      "se o remetente aparece com o nome do Centro; e se responder a esta mensagem " +
      "leva ao e-mail certo.",
    atividades: [],
    destinatario: { nome: pessoa.nome, email: para, chave: "teste-de-configuracao" },
    endereco,
  });

  const resultado = await enviarUma({
    para,
    assunto: "[teste] O envio do Centro está funcionando",
    html,
    texto: corpoEmTexto,
    linkDeDescadastro,
  });

  return resultado.ok
    ? { pronto: `Mandei para ${para}. Confira a caixa de entrada — e o spam.`, para }
    : { erro: resultado.erro, para };
}

/**
 * Fechar a lista e começar o envio.
 *
 * A lista é **congelada** aqui, numa linha por pessoa. Quem se cadastrar depois
 * não entra no meio do disparo, e quem se descadastrar no meio dele não recebe
 * — é o que essas linhas permitem conferir, uma a uma, enquanto o envio anda.
 */
export async function prepararEnvio(dados: FormData): Promise<void> {
  await exigirPessoa();
  const id = texto(dados, "id");

  const impedimento = porQueNaoConfigurado();
  if (impedimento) redirect(`/boletins/${id}?erro=${encodeURIComponent(impedimento)}`);

  const boletim = await bd.boletim.findUnique({ where: { id } });
  if (!boletim || boletim.estado !== "RASCUNHO") redirect(`/boletins/${id}`);

  const destinatarios = await quemRecebe({
    vinculo: boletim.filtroVinculo,
    etiquetaId: boletim.filtroEtiquetaId,
  });

  if (destinatarios.length === 0) {
    redirect(
      `/boletins/${id}?erro=${encodeURIComponent(
        "Ninguém na base atende a este segmento — ou ninguém dele tem consentimento registrado.",
      )}`,
    );
  }

  await bd.envioDeBoletim.createMany({
    data: destinatarios.map((c) => ({ id: novoId(), boletimId: id, contatoId: c.id })),
    skipDuplicates: true,
  });
  await bd.boletim.update({ where: { id }, data: { estado: "ENVIANDO" } });

  revalidatePath(`/boletins/${id}`);
  redirect(`/boletins/${id}`);
}

export type ResultadoDoLote = { enviados: number; restantes: number; erro?: string };

/**
 * Mandar o próximo lote.
 *
 * Por que em lotes: um servidor da Vercel tem alguns segundos para responder, e
 * mil e-mails não cabem nisso. Cada chamada manda até cem e marca o que saiu;
 * se a conexão cair no meio, a próxima chamada continua de onde parou — ninguém
 * recebe duas vezes, ninguém fica sem receber.
 *
 * Uma falha do serviço marca o lote inteiro como falho **com o motivo escrito
 * dentro**, em vez de sumir: um envio que para sem dizer por quê é pior do que
 * um envio que não começou.
 */
export async function mandarLote(boletimId: string): Promise<ResultadoDoLote> {
  await exigirPessoa();

  const boletim = await bd.boletim.findUnique({ where: { id: boletimId } });
  if (!boletim) return { enviados: 0, restantes: 0, erro: "Boletim não encontrado." };

  const pendentes = await bd.envioDeBoletim.findMany({
    where: { boletimId, estado: "PENDENTE" },
    include: { contato: { select: { nome: true, email: true, chave: true, estado: true } } },
    take: MAXIMO_POR_LOTE,
  });

  if (pendentes.length === 0) {
    await bd.boletim.update({
      where: { id: boletimId },
      data: { estado: "ENVIADO", enviadoEm: boletim.enviadoEm ?? new Date() },
    });
    revalidatePath(`/boletins/${boletimId}`);
    return { enviados: 0, restantes: 0 };
  }

  const endereco = await enderecoDoSistema();
  const atividades = await atividadesDoBoletim(boletimId, endereco);

  // Quem se descadastrou depois que a lista foi fechada sai agora, sem receber.
  const saiu = pendentes.filter((e) => e.contato.estado !== "ATIVO");
  if (saiu.length) {
    await bd.envioDeBoletim.updateMany({
      where: { id: { in: saiu.map((e) => e.id) } },
      data: { estado: "FALHOU", erro: "A pessoa saiu da lista antes de este lote sair." },
    });
  }

  const paraEnviar = pendentes.filter((e) => e.contato.estado === "ATIVO");
  if (paraEnviar.length === 0) {
    const restantes = await bd.envioDeBoletim.count({ where: { boletimId, estado: "PENDENTE" } });
    return { enviados: 0, restantes };
  }

  const mensagens = paraEnviar.map((envio) => {
    const { html, texto: corpoEmTexto, linkDeDescadastro } = montarBoletim({
      assunto: boletim.assunto,
      corpo: boletim.corpo,
      atividades,
      destinatario: {
        nome: envio.contato.nome,
        email: envio.contato.email,
        chave: envio.contato.chave,
      },
      endereco,
    });
    return { para: envio.contato.email, assunto: boletim.assunto, html, texto: corpoEmTexto, linkDeDescadastro };
  });

  const resultado = await enviarLote(mensagens);
  const ids = paraEnviar.map((e) => e.id);

  if (resultado.ok) {
    await bd.envioDeBoletim.updateMany({
      where: { id: { in: ids } },
      data: { estado: "ENVIADO", enviadoEm: new Date(), erro: null },
    });
  } else {
    await bd.envioDeBoletim.updateMany({
      where: { id: { in: ids } },
      data: { estado: "FALHOU", erro: resultado.erro },
    });
  }

  const restantes = await bd.envioDeBoletim.count({ where: { boletimId, estado: "PENDENTE" } });
  if (restantes === 0) {
    await bd.boletim.update({
      where: { id: boletimId },
      data: { estado: "ENVIADO", enviadoEm: new Date() },
    });
  }

  revalidatePath(`/boletins/${boletimId}`);
  return {
    enviados: resultado.ok ? ids.length : 0,
    restantes,
    ...(resultado.ok ? {} : { erro: resultado.erro }),
  };
}

/** Tentar de novo o que falhou — depois de arrumar o que causou a falha. */
export async function refazerFalhas(dados: FormData): Promise<void> {
  await exigirPessoa();
  const id = texto(dados, "id");

  await bd.envioDeBoletim.updateMany({
    where: { boletimId: id, estado: "FALHOU" },
    data: { estado: "PENDENTE", erro: null },
  });
  await bd.boletim.update({ where: { id }, data: { estado: "ENVIANDO" } });

  revalidatePath(`/boletins/${id}`);
  redirect(`/boletins/${id}`);
}

export async function apagarBoletim(dados: FormData): Promise<void> {
  await exigirPessoa();
  const id = texto(dados, "id");
  const boletim = await bd.boletim.findUnique({ where: { id }, select: { estado: true } });
  // Um boletim enviado fica: é o registro do que o Centro disse, e para quem.
  if (boletim?.estado === "RASCUNHO") await bd.boletim.delete({ where: { id } });

  revalidatePath("/boletins");
  redirect("/boletins");
}
