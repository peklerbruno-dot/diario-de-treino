import { cabecalho, corpoEmTexto, separarEndereco, semCitacao, type MensagemGmail } from "./gmail";

/**
 * Do formato do Gmail para o que a Central guarda e o que vai ao modelo.
 * Puro, sem rede — testado em conversas.test.ts.
 */

export const LIMITE_POR_MENSAGEM = 3000;

const dataDe = (m: MensagemGmail) => new Date(Number(m.internalDate ?? 0));

export const deMim = (m: MensagemGmail, meuEmail: string) =>
  separarEndereco(cabecalho(m, "From")).email === meuEmail.toLowerCase() || (m.labelIds ?? []).includes("SENT");

/** Rascunhos que estejam dentro da conversa não contam como mensagem. */
export const mensagensReais = (ms: MensagemGmail[] = []) => ms.filter((m) => !(m.labelIds ?? []).includes("DRAFT"));

export interface Resumo {
  assunto: string;
  remetente: string;
  remetenteEmail: string;
  trecho: string;
  ultimaData: Date;
  ultimaDeMim: boolean;
  ultimaMensagemId: string;
}

/** O que a lista mostra de uma conversa. O remetente é o último que não é você. */
export function resumirThread(mensagens: MensagemGmail[], meuEmail: string): Resumo | null {
  const ms = mensagensReais(mensagens);
  const ultima = ms[ms.length - 1];
  if (!ultima) return null;
  const deOutro = [...ms].reverse().find((m) => !deMim(m, meuEmail));
  const quem = separarEndereco(cabecalho(deOutro ?? ultima, deOutro ? "From" : "To").split(",")[0] ?? "");
  return {
    assunto: cabecalho(ms[0], "Subject").trim() || "(sem assunto)",
    remetente: deOutro ? quem.nome : `Para: ${quem.nome}`,
    remetenteEmail: quem.email,
    trecho: decodificarEntidades(ultima.snippet ?? ""),
    ultimaData: dataDe(ultima),
    ultimaDeMim: deMim(ultima, meuEmail),
    ultimaMensagemId: ultima.id,
  };
}

export function decodificarEntidades(t: string): string {
  return t
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** As últimas mensagens em texto limpo, sem citação, cada uma com teto de tamanho. */
export function mensagensEmTexto(mensagens: MensagemGmail[], quantas: number, limite = LIMITE_POR_MENSAGEM) {
  return mensagensReais(mensagens)
    .slice(-quantas)
    .map((m) => {
      const texto = semCitacao(corpoEmTexto(m));
      return {
        id: m.id,
        de: cabecalho(m, "From"),
        para: [cabecalho(m, "To"), cabecalho(m, "Cc")].filter(Boolean).join(", "),
        data: dataDe(m).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        texto: texto.length > limite ? `${texto.slice(0, limite)}\n[…mensagem cortada…]` : texto || "(sem texto)",
      };
    });
}

/** Abre a conversa no Gmail, na conta certa. */
export const linkDoGmail = (email: string, threadId: string) =>
  `https://mail.google.com/mail/?authuser=${encodeURIComponent(email)}#all/${threadId}`;
