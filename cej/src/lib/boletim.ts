import { comDiaDaSemana, comMaiuscula, porExtenso } from "./datas";
import { NOME_DO_TIPO, type TipoDeAtividade } from "./tipos";

/**
 * Montar o e-mail do boletim.
 *
 * E-mail não é página. O que roda dentro do Gmail, do Outlook e do Mail do
 * iPhone é um HTML de 1999: tabela para fazer coluna, estilo escrito em cada
 * etiqueta, nada de folha de estilo externa, nada de flexbox. Fugir disso não
 * dá erro — dá um boletim desmontado na tela de metade das pessoas, e você não
 * fica sabendo.
 *
 * Todo e-mail sai em duas versões, HTML e texto puro. A segunda não é enfeite:
 * é o que alguns programas mostram, o que os leitores de tela leem melhor, e um
 * sinal a favor de quem julga se a mensagem é spam.
 *
 * Função pura, sem banco e sem rede: `boletim.test.ts` prende cada regra.
 */

export type AtividadeNoEmail = {
  titulo: string;
  tipo: TipoDeAtividade;
  dia: string;
  diaFinal: string | null;
  hora: string | null;
  local: string | null;
  resumo: string | null;
  linkDeInscricao: string | null;
};

export type Destinatario = {
  nome: string;
  email: string;
  /** A chave do descadastro, que vira o link no rodapé. */
  chave: string;
};

const COR = { tinta: "#16161a", grafite: "#4f5058", fosco: "#74757e", regua: "#dcdbd6", realce: "#1f4b8f", papel: "#f7f6f3" };

/**
 * Escapar o que a pessoa escreveu.
 *
 * O texto do boletim é digitado por gente da equipe, não por um estranho — mas
 * um "&" num título de palestra ("Memória & Exílio") basta para quebrar o HTML
 * do e-mail se ele entrar cru.
 */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * O texto escrito na caixa vira parágrafos.
 *
 * Linha em branco separa parágrafo; quebra simples vira quebra de linha. É o
 * que a pessoa espera ao digitar num campo de texto, e o que nenhum e-mail faz
 * sozinho.
 */
function paragrafos(corpo: string): string {
  return corpo
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${COR.tinta}">${escaparHtml(p).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

/**
 * O tipo na frente do título — a não ser que o título já o diga.
 *
 * "Mesa-redonda: Mesa-redonda: memória, exílio e retorno" foi o que apareceu na
 * primeira versão, e é o tipo de coisa que só se vê olhando o boletim pronto. As
 * pessoas batizam a atividade com o gênero dentro do nome, e é natural que
 * façam: é assim que o cartaz vai sair.
 */
export function tituloComTipo(a: AtividadeNoEmail): string {
  const tipo = NOME_DO_TIPO[a.tipo];
  const jaDiz = a.titulo
    .trim()
    .toLocaleLowerCase("pt-BR")
    .startsWith(tipo.toLocaleLowerCase("pt-BR"));
  return jaDiz ? a.titulo : `${tipo}: ${a.titulo}`;
}

/** Quando a atividade acontece, numa linha. */
export function quandoPorExtenso(a: AtividadeNoEmail): string {
  const base = a.diaFinal
    ? `De ${porExtenso(a.dia)} a ${porExtenso(a.diaFinal)}`
    : comMaiuscula(comDiaDaSemana(a.dia));
  return a.hora ? `${base}, às ${a.hora}` : base;
}

function blocoDaAtividade(a: AtividadeNoEmail): string {
  // No HTML o tipo é uma etiqueta acima do título, então a repetição aparece de
  // outra forma: "MESA-REDONDA" em cima de "Mesa-redonda: memória…". Quando o
  // título já diz o gênero, a etiqueta sai.
  const tipo = NOME_DO_TIPO[a.tipo];
  const tituloJaDizOTipo = a.titulo
    .trim()
    .toLocaleLowerCase("pt-BR")
    .startsWith(tipo.toLocaleLowerCase("pt-BR"));

  const linhas = [
    tituloJaDizOTipo
      ? ""
      : `<div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${COR.fosco};font-weight:bold">${escaparHtml(tipo)}</div>`,
    `<div style="font-size:18px;font-weight:bold;color:${COR.tinta};margin-top:4px">${escaparHtml(a.titulo)}</div>`,
    `<div style="font-size:14px;color:${COR.grafite};margin-top:6px">${escaparHtml(quandoPorExtenso(a))}${a.local ? ` &middot; ${escaparHtml(a.local)}` : ""}</div>`,
  ];

  if (a.resumo) {
    linhas.push(
      `<div style="font-size:14px;line-height:1.55;color:${COR.grafite};margin-top:8px">${escaparHtml(a.resumo)}</div>`,
    );
  }
  if (a.linkDeInscricao) {
    linhas.push(
      `<div style="margin-top:10px"><a href="${escaparHtml(a.linkDeInscricao)}" style="color:${COR.realce};font-size:14px;font-weight:bold">Inscrever-se &rarr;</a></div>`,
    );
  }

  return `<tr><td style="padding:16px 0;border-bottom:1px solid ${COR.regua}">${linhas.join("")}</td></tr>`;
}

export function enderecoDeDescadastro(endereco: string, chave: string): string {
  return `${endereco}/descadastrar/${chave}`;
}

/**
 * O rodapé de quem vai mandar pela mão.
 *
 * Um boletim copiado para o Gmail e disparado em Cco é **uma mensagem só** para
 * muita gente. Não há como pôr nela o link pessoal de descadastro de cada um: o
 * link que fosse não seria de ninguém em particular, e clicá-lo descadastraria a
 * pessoa errada — quem quer que tenha sido a primeira da lista.
 *
 * Então o pedido de saída passa a ser uma frase, e o trabalho passa a ser de
 * quem recebe a resposta. É pior que o link, e é honesto: quem pede para sair
 * precisa de um jeito de pedir, mesmo quando o jeito é responder o e-mail.
 */
const SAIDA_PELA_MAO =
  "Para não receber mais estas mensagens, responda a este e-mail com a palavra SAIR — " +
  "nós tiramos você da lista.";

export function montarBoletim(dados: {
  assunto: string;
  corpo: string;
  atividades: AtividadeNoEmail[];
  destinatario: Destinatario;
  /** O endereço em que o sistema está no ar, para montar o link de descadastro. */
  endereco: string;
  /**
   * A versão para copiar e mandar pelo Gmail, enquanto o disparo do sistema não
   * está ligado. Troca o link pessoal de descadastro por um pedido por escrito —
   * ver `SAIDA_PELA_MAO`.
   */
  pelaMao?: boolean;
}): { html: string; texto: string; linkDeDescadastro: string } {
  const { assunto, corpo, atividades, destinatario, endereco, pelaMao = false } = dados;
  const sair = enderecoDeDescadastro(endereco, destinatario.chave);

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escaparHtml(assunto)}</title></head>
<body style="margin:0;padding:0;background:${COR.papel}">
<!-- O texto que o Gmail mostra ao lado do assunto, na lista. Sem ele, ele
     mostra o começo do cabeçalho, que não diz nada. -->
<div style="display:none;max-height:0;overflow:hidden">${escaparHtml(assunto)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COR.papel};padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;padding:32px">
  <tr><td style="padding-bottom:20px;border-bottom:2px solid ${COR.tinta}">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:bold;color:${COR.tinta}">Centro de Estudos Judaicos</div>
    <div style="font-size:13px;color:${COR.fosco};margin-top:2px">Universidade de São Paulo</div>
  </td></tr>

  <tr><td style="padding-top:24px">
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;color:${COR.tinta}">${escaparHtml(assunto)}</h1>
    ${paragrafos(corpo)}
  </td></tr>

  ${
    atividades.length > 0
      ? `<tr><td style="padding-top:8px">
    <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${COR.fosco};font-weight:bold;padding-bottom:4px">
      ${atividades.length === 1 ? "Próxima atividade" : "Próximas atividades"}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${atividades.map(blocoDaAtividade).join("")}</table>
  </td></tr>`
      : ""
  }

  <tr><td style="padding-top:28px;font-size:12px;line-height:1.6;color:${COR.fosco}">
    Você recebe este boletim porque se cadastrou ou se inscreveu numa atividade do Centro de
    Estudos Judaicos da USP.<br>
    ${
      pelaMao
        ? escaparHtml(SAIDA_PELA_MAO)
        : `<a href="${escaparHtml(sair)}" style="color:${COR.fosco};text-decoration:underline">Não quero mais receber</a>`
    }
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const texto = [
    "CENTRO DE ESTUDOS JUDAICOS — USP",
    "",
    assunto,
    "",
    corpo.trim(),
    ...(atividades.length
      ? [
          "",
          atividades.length === 1 ? "PRÓXIMA ATIVIDADE" : "PRÓXIMAS ATIVIDADES",
          "",
          ...atividades.flatMap((a) =>
            [
              tituloComTipo(a),
              `${quandoPorExtenso(a)}${a.local ? ` · ${a.local}` : ""}`,
              a.resumo ?? null,
              a.linkDeInscricao ? `Inscrições: ${a.linkDeInscricao}` : null,
              "",
            ].filter((l): l is string => l != null),
          ),
        ]
      : []),
    "—",
    "Você recebe este boletim porque se cadastrou ou se inscreveu numa atividade do Centro.",
    pelaMao ? SAIDA_PELA_MAO : `Para não receber mais: ${sair}`,
    "",
  ].join("\n");

  return { html, texto, linkDeDescadastro: sair };
}
