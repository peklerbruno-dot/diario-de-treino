import "server-only";
import { bd } from "./bd";
import { dividir, paraWhatsapp } from "./formato";

/**
 * A conversa com a WhatsApp Cloud API, a API oficial da Meta.
 * Tudo passa pelo Graph: `/{id-do-número}/messages` para mandar, `/{id-da-mídia}`
 * para buscar uma foto que chegou.
 */

const VERSAO = process.env.WHATSAPP_VERSAO_API || "v23.0";
// `WHATSAPP_API_URL` só existe para testar contra um servidor falso.
const GRAPH = process.env.WHATSAPP_API_URL || `https://graph.facebook.com/${VERSAO}`;

function credenciais() {
  const token = process.env.WHATSAPP_TOKEN;
  const numeroId = process.env.WHATSAPP_NUMERO_ID;
  if (!token || !numeroId) throw new Error("Faltam WHATSAPP_TOKEN e/ou WHATSAPP_NUMERO_ID.");
  return { token, numeroId };
}

export type Envio = { ok: true } | { ok: false; codigo?: number; erro: string };

async function postar(corpo: object): Promise<Envio> {
  const { token, numeroId } = credenciais();
  const r = await fetch(`${GRAPH}/${numeroId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...corpo }),
  });
  if (r.ok) return { ok: true };
  const j = (await r.json().catch(() => ({}))) as { error?: { code?: number; message?: string } };
  return { ok: false, codigo: j.error?.code, erro: j.error?.message ?? `HTTP ${r.status}` };
}

/** Manda um texto, já no formato do WhatsApp e em partes se for longo. */
export async function enviarTexto(para: string, texto: string): Promise<Envio> {
  for (const parte of dividir(paraWhatsapp(texto))) {
    const r = await postar({ to: para, type: "text", text: { body: parte, preview_url: true } });
    if (!r.ok) return r;
  }
  return { ok: true };
}

/**
 * Manda um modelo aprovado pela Meta, com um único parâmetro no corpo.
 *
 * É o único jeito de o assistente puxar conversa quando você passou mais de 24
 * horas sem escrever para ele — ver "A janela de 24 horas" no README.
 */
export async function enviarModelo(para: string, nome: string, idioma: string, parametro: string): Promise<Envio> {
  return postar({
    to: para,
    type: "template",
    template: {
      name: nome,
      language: { code: idioma },
      components: [{ type: "body", parameters: [{ type: "text", text: parametro.slice(0, 1000) }] }],
    },
  });
}

/**
 * Mostra os dois tiques azuis e o "digitando…" enquanto o Claude pensa.
 * É cortesia: se falhar, a resposta chega do mesmo jeito.
 */
export async function marcarComoLida(mensagemId: string): Promise<void> {
  await postar({ status: "read", message_id: mensagemId, typing_indicator: { type: "text" } }).catch(() => {});
}

/** Baixa uma foto ou um PDF que chegou, em base64, para ir direto ao Claude. */
export async function baixarMidia(midiaId: string): Promise<{ mime: string; base64: string }> {
  const { token } = credenciais();
  const auth = { Authorization: `Bearer ${token}` };
  const meta = await fetch(`${GRAPH}/${midiaId}`, { headers: auth });
  if (!meta.ok) throw new Error(`Mídia ${midiaId}: HTTP ${meta.status}`);
  const { url, mime_type } = (await meta.json()) as { url: string; mime_type: string };
  const arquivo = await fetch(url, { headers: auth });
  if (!arquivo.ok) throw new Error(`Download da mídia: HTTP ${arquivo.status}`);
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  return { mime: mime_type.split(";")[0].trim(), base64: bytes.toString("base64") };
}

/**
 * Para onde mandar os lembretes.
 *
 * O número que a Meta entrega em `from` pode diferir do que você cadastrou em
 * `DONO_WHATSAPP` (o nono dígito — ver `mesmoNumero`), e é esse, o dela, que
 * ela aceita de volta. Então o assistente guarda o `from` da última mensagem
 * sua e só usa o da variável enquanto você ainda não escreveu nenhuma.
 */
export async function numeroDoDono(): Promise<string> {
  const salvo = await bd.ajuste.findUnique({ where: { chave: "numero-do-dono" } });
  const numero = salvo?.valor ?? process.env.DONO_WHATSAPP?.replace(/\D/g, "");
  if (!numero) throw new Error("Falta DONO_WHATSAPP.");
  return numero;
}

export async function lembrarNumeroDoDono(numero: string): Promise<void> {
  await bd.ajuste.upsert({
    where: { chave: "numero-do-dono" },
    create: { chave: "numero-do-dono", valor: numero },
    update: { valor: numero },
  });
}
