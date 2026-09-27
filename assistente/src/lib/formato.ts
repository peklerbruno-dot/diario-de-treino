/**
 * O que dá para testar sem rede e sem banco: ler o aviso da Meta, conferir a
 * assinatura, reconhecer o seu número e deixar o texto do Claude com a cara do
 * WhatsApp.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * O aviso veio mesmo da Meta? Ela assina o corpo com o segredo do app
 * (`X-Hub-Signature-256: sha256=<hex>`). Sem essa conferência, qualquer um que
 * descobrisse o endereço poderia falar com o assistente em seu nome — e ele
 * tem as suas memórias.
 */
export function assinaturaValida(corpo: string, cabecalho: string | null, segredo: string): boolean {
  if (!cabecalho?.startsWith("sha256=")) return false;
  const esperado = createHmac("sha256", segredo).update(corpo, "utf8").digest();
  const recebido = Buffer.from(cabecalho.slice(7), "hex");
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}

const digitos = (s: string) => s.replace(/\D/g, "");

/**
 * Os dois números são o mesmo telefone?
 *
 * No Brasil, o WhatsApp às vezes entrega o celular sem o nono dígito:
 * "+55 11 91234-5678" chega como 551112345678. Comparar os dígitos crus
 * deixaria o dono de fora do próprio assistente.
 */
export function mesmoNumero(a: string, b: string): boolean {
  const x = digitos(a);
  const y = digitos(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const semNono = (n: string) => (n.length === 13 && n.startsWith("55") && n[4] === "9" ? n.slice(0, 4) + n.slice(5) : n);
  return semNono(x) === semNono(y);
}

export type Recebida =
  | { id: string; de: string; tipo: "texto"; texto: string }
  | { id: string; de: string; tipo: "imagem" | "documento"; midiaId: string; mime: string; legenda: string; nome?: string }
  | { id: string; de: string; tipo: "outro"; descricao: string };

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * As mensagens de dentro de um aviso da Meta. Um aviso pode trazer várias —
 * ou nenhuma, quando é só a confirmação de que uma resposta foi entregue
 * (`statuses`), o que acontece para toda mensagem que o assistente manda.
 */
export function extrairMensagens(aviso: any): Recebida[] {
  const saida: Recebida[] = [];
  for (const entrada of aviso?.entry ?? []) {
    for (const mudanca of entrada?.changes ?? []) {
      for (const m of mudanca?.value?.messages ?? []) {
        const base = { id: String(m.id), de: String(m.from) };
        switch (m.type) {
          case "text":
            saida.push({ ...base, tipo: "texto", texto: m.text?.body ?? "" });
            break;
          case "image":
            saida.push({ ...base, tipo: "imagem", midiaId: m.image.id, mime: m.image.mime_type, legenda: m.image.caption ?? "" });
            break;
          case "document":
            saida.push({
              ...base,
              tipo: "documento",
              midiaId: m.document.id,
              mime: m.document.mime_type,
              legenda: m.document.caption ?? "",
              nome: m.document.filename,
            });
            break;
          case "location": {
            const l = m.location ?? {};
            const nome = [l.name, l.address].filter(Boolean).join(" — ");
            saida.push({
              ...base,
              tipo: "texto",
              texto: `[localização enviada: ${l.latitude}, ${l.longitude}${nome ? ` (${nome})` : ""}]`,
            });
            break;
          }
          case "button":
            saida.push({ ...base, tipo: "texto", texto: m.button?.text ?? "" });
            break;
          case "interactive": {
            const r = m.interactive?.button_reply ?? m.interactive?.list_reply;
            saida.push({ ...base, tipo: "texto", texto: r?.title ?? "" });
            break;
          }
          default:
            saida.push({ ...base, tipo: "outro", descricao: String(m.type) });
        }
      }
    }
  }
  return saida;
}

/**
 * Markdown → a formatação do WhatsApp.
 *
 * O prompt já pede o jeito do WhatsApp, mas o hábito do markdown escapa:
 * `**negrito**` chegaria com os asteriscos dobrados à vista, e `# Título` com
 * o sustenido. Aqui os dois viram `*negrito*`, e um link `[texto](url)` vira
 * "texto (url)", que o WhatsApp torna clicável.
 */
export function paraWhatsapp(texto: string): string {
  return texto
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/__(.+?)__/g, "_$1_")
    .replace(/~~(.+?)~~/g, "~$1~")
    .replace(/^#{1,6}\s+(.+)$/gm, "*$1*")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
    .replace(/^(\s*)[-*]\s+/gm, "$1• ")
    .trim();
}

/**
 * O WhatsApp recusa textos com mais de 4.096 caracteres. Uma resposta longa sai
 * em partes, cortadas de preferência entre parágrafos, depois entre linhas, e
 * só em último caso no meio de uma frase.
 */
export function dividir(texto: string, limite = 4000): string[] {
  const partes: string[] = [];
  let resto = texto.trim();
  while (resto.length > limite) {
    const janela = resto.slice(0, limite);
    let corte = janela.lastIndexOf("\n\n");
    if (corte < limite / 2) corte = janela.lastIndexOf("\n");
    if (corte < limite / 2) corte = janela.lastIndexOf(" ");
    if (corte < limite / 2) corte = limite;
    partes.push(resto.slice(0, corte).trim());
    resto = resto.slice(corte).trim();
  }
  if (resto) partes.push(resto);
  return partes;
}
