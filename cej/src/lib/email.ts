import "server-only";

/**
 * O envio de e-mail.
 *
 * Fica atrás desta porta estreita — três funções — por dois motivos. O primeiro
 * é que trocar de serviço um dia é mexer só aqui. O segundo é mais importante:
 * **o sistema inteiro funciona sem isso configurado**. Sem chave, a única coisa
 * que não acontece é o disparo; a base de contatos, a segmentação, o
 * descadastro e a exportação da lista continuam de pé. Foi de propósito: o
 * Centro pode lançar o sistema hoje e resolver a questão do domínio depois, sem
 * nada ficar esperando.
 *
 * Serviço: Resend. Chamado por HTTP direto, sem biblioteca — são trinta linhas,
 * e uma dependência a menos para atualizar e auditar.
 */

/** O Resend aceita até 100 mensagens por chamada; é por isso que o envio anda em lotes. */
export const MAXIMO_POR_LOTE = 100;

export type Mensagem = {
  para: string;
  assunto: string;
  html: string;
  texto: string;
  /** Vira o cabeçalho List-Unsubscribe: o botão "cancelar inscrição" do Gmail. */
  linkDeDescadastro?: string;
};

const chave = () => (process.env.RESEND_API_KEY ?? "").trim();

/**
 * Para onde os pedidos vão. Em produção, sempre o Resend.
 *
 * `EMAIL_API_BASE` existe para pôr um servidor de mentira no lugar dele e
 * exercitar o envio inteiro — os lotes, a retomada, o registro das falhas — sem
 * mandar e-mail nenhum a ninguém. É **ignorada em produção**, de propósito: uma
 * variável mal preenchida no painel da Vercel faria os boletins saírem para o
 * vazio em silêncio, que é o pior defeito possível num sistema de envio.
 */
function base(): string {
  if (process.env.NODE_ENV === "production") return "https://api.resend.com";
  return (process.env.EMAIL_API_BASE ?? "https://api.resend.com").replace(/\/$/, "");
}
const remetente = () => (process.env.EMAIL_REMETENTE ?? "").trim();
const responderPara = () => (process.env.EMAIL_RESPONDER_PARA ?? "").trim();

export function servicoConfigurado(): boolean {
  return chave().length > 10 && remetente().includes("@");
}

/**
 * Por que o envio não está pronto, em português, para a tela dizer.
 *
 * Uma tela que só mostra o botão apagado obriga a pessoa a adivinhar o que
 * falta — e o que falta aqui está em outro site, dentro de um painel que ela
 * talvez nem saiba que existe.
 */
export function porQueNaoConfigurado(): string | null {
  if (!chave()) {
    return "Falta a variável RESEND_API_KEY nas configurações da Vercel. O passo a passo está em docs/BOLETIM.md.";
  }
  if (chave().length <= 10) return "A RESEND_API_KEY cadastrada parece curta demais para ser uma chave de verdade.";
  if (!remetente()) {
    return "Falta a variável EMAIL_REMETENTE — o endereço de onde os boletins saem, no formato: Centro de Estudos Judaicos <boletim@seu-dominio.org>.";
  }
  if (!remetente().includes("@")) return "A EMAIL_REMETENTE cadastrada não tem um endereço de e-mail dentro.";
  return null;
}

/** O que vai no corpo do pedido. Separado para poder ser conferido sem rede. */
export function montarPedido(mensagens: Mensagem[]) {
  return mensagens.map((m) => ({
    from: remetente(),
    to: [m.para],
    subject: m.assunto,
    html: m.html,
    text: m.texto,
    ...(responderPara() ? { reply_to: responderPara() } : {}),
    ...(m.linkDeDescadastro
      ? {
          headers: {
            // O botão nativo de cancelar inscrição, no topo da mensagem. Quem o
            // usa não marca como spam — e é a marcação de spam que estraga a
            // entrega de todos os e-mails seguintes, para todo mundo.
            "List-Unsubscribe": `<${m.linkDeDescadastro}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }
      : {}),
  }));
}

export type ResultadoDoLote = { ok: true } | { ok: false; erro: string };

export async function enviarLote(mensagens: Mensagem[]): Promise<ResultadoDoLote> {
  const impedimento = porQueNaoConfigurado();
  if (impedimento) return { ok: false, erro: impedimento };
  if (mensagens.length === 0) return { ok: true };
  if (mensagens.length > MAXIMO_POR_LOTE) {
    return { ok: false, erro: `Lote de ${mensagens.length}; o máximo é ${MAXIMO_POR_LOTE}.` };
  }

  try {
    const resposta = await fetch(`${base()}/emails/batch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(montarPedido(mensagens)),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text();
      // A mensagem do serviço vai inteira para a tela: quando dá errado, é
      // sempre ela que diz o que fazer ("domínio não verificado", "chave
      // inválida"), e resumi-la só faria a pessoa ter que ir procurar.
      return { ok: false, erro: `O serviço de e-mail recusou (${resposta.status}): ${corpo.slice(0, 400)}` };
    }
    return { ok: true };
  } catch (erro) {
    return {
      ok: false,
      erro: `Não consegui falar com o serviço de e-mail: ${erro instanceof Error ? erro.message : "erro desconhecido"}`,
    };
  }
}

/**
 * O estado da configuração, para a tela mostrar.
 *
 * A chave **nunca** sai daqui, nem pela metade: o que a tela precisa saber é se
 * ela existe, não qual é. Um pedaço dela numa captura de tela mandada para
 * alguém pedir ajuda já é mais do que deveria vazar.
 */
export function resumoDaConfiguracao(): {
  pronto: boolean;
  chaveCadastrada: boolean;
  remetente: string | null;
  responderPara: string | null;
  /** O domínio de onde os e-mails saem — o que precisa estar verificado. */
  dominio: string | null;
  impedimento: string | null;
} {
  const de = remetente();
  const dentroDosSinais = /<([^>]+)>/.exec(de);
  const endereco = (dentroDosSinais?.[1] ?? de).trim();
  const dominio = endereco.includes("@") ? endereco.split("@")[1] : null;

  return {
    pronto: servicoConfigurado(),
    chaveCadastrada: chave().length > 10,
    remetente: de || null,
    responderPara: responderPara() || null,
    dominio,
    impedimento: porQueNaoConfigurado(),
  };
}

/** Uma mensagem só — o envio de teste, antes de disparar para a base inteira. */
export const enviarUma = (mensagem: Mensagem) => enviarLote([mensagem]);
