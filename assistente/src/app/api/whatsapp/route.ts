import { after, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { bd } from "@/lib/bd";
import { esquecerConversa, responder } from "@/lib/claude";
import { assinaturaValida, extrairMensagens, mesmoNumero, type Recebida } from "@/lib/formato";
import { baixarMidia, enviarTexto, lembrarNumeroDoDono, marcarComoLida } from "@/lib/whatsapp";

/**
 * O endereço que a Meta chama: `GET` uma vez, na configuração, para conferir
 * que o endereço é seu; `POST` a cada mensagem que chega.
 */

// Uma resposta com pesquisa na internet pode levar bem mais que os 10 s padrão.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** A verificação do painel da Meta: devolver o `challenge` se o token bater. */
export function GET(req: Request) {
  const url = new URL(req.url);
  const token = process.env.WHATSAPP_TOKEN_VERIFICACAO;
  if (
    token &&
    url.searchParams.get("hub.mode") === "subscribe" &&
    url.searchParams.get("hub.verify_token") === token
  ) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Token de verificação não confere.", { status: 403 });
}

export async function POST(req: Request) {
  const corpo = await req.text();
  const segredo = process.env.META_APP_SECRET;
  if (!segredo || !assinaturaValida(corpo, req.headers.get("x-hub-signature-256"), segredo)) {
    return new Response("Assinatura inválida.", { status: 401 });
  }

  let aviso: unknown;
  try {
    aviso = JSON.parse(corpo);
  } catch {
    return new Response("JSON inválido.", { status: 400 });
  }

  // A Meta quer um 200 rápido; se demorar, ela reenvia. O Claude pensa depois
  // que a resposta já saiu.
  const mensagens = extrairMensagens(aviso);
  if (mensagens.length) after(() => processarTodas(mensagens));
  return NextResponse.json({ ok: true });
}

async function processarTodas(mensagens: Recebida[]) {
  const dono = process.env.DONO_WHATSAPP ?? "";
  for (const m of mensagens) {
    if (!mesmoNumero(m.de, dono)) {
      // Só você fala com o assistente. Os outros são ignorados em silêncio —
      // responder confirmaria que o número existe.
      console.warn(`[whatsapp] mensagem de número não autorizado ignorada (${m.de.slice(0, 4)}…)`);
      continue;
    }
    if (!(await primeiraVez(m.id))) continue;
    try {
      await processar(m);
    } catch (e) {
      console.error("[whatsapp] falha ao responder", e);
      await enviarTexto(m.de, "⚠️ Tive um problema para responder agora. Tenta de novo daqui a pouco?").catch(() => {});
    }
  }
}

/** Grava o id da mensagem; se já estava lá, é reenvio da Meta e não se responde de novo. */
async function primeiraVez(id: string): Promise<boolean> {
  try {
    await bd.recebida.create({ data: { id } });
    return true;
  } catch {
    return false;
  }
}

const COMANDOS_DE_RECOMECO = ["/nova", "/limpar", "/reset"];

async function processar(m: Recebida) {
  await lembrarNumeroDoDono(m.de);
  await marcarComoLida(m.id);

  if (m.tipo === "texto" && COMANDOS_DE_RECOMECO.includes(m.texto.trim().toLowerCase())) {
    await esquecerConversa();
    await enviarTexto(m.de, "🧹 Conversa zerada. As memórias, os lembretes e as listas continuam.");
    return;
  }

  let conteudo: Anthropic.Beta.BetaContentBlockParam[];
  let resumo: string;

  switch (m.tipo) {
    case "texto":
      if (!m.texto.trim()) return;
      conteudo = [{ type: "text", text: m.texto }];
      resumo = m.texto;
      break;

    case "imagem":
    case "documento": {
      const midia = await baixarMidia(m.midiaId);
      const legenda = m.legenda.trim();
      if (m.tipo === "imagem" && /^image\/(jpeg|png|gif|webp)$/.test(midia.mime)) {
        conteudo = [
          { type: "image", source: { type: "base64", media_type: midia.mime as "image/jpeg", data: midia.base64 } },
          { type: "text", text: legenda || "(mandou esta foto, sem legenda)" },
        ];
        resumo = `[mandou uma foto]${legenda ? ` ${legenda}` : ""}`;
      } else if (midia.mime === "application/pdf") {
        conteudo = [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: midia.base64 }, title: m.tipo === "documento" ? m.nome : undefined },
          { type: "text", text: legenda || "(mandou este PDF, sem comentário)" },
        ];
        resumo = `[mandou o PDF ${(m.tipo === "documento" && m.nome) || ""}]${legenda ? ` ${legenda}` : ""}`;
      } else {
        await enviarTexto(m.de, "Por enquanto eu só consigo ler fotos e PDFs. 📎");
        return;
      }
      break;
    }

    case "outro":
      await enviarTexto(
        m.de,
        m.descricao === "audio"
          ? "Ainda não consigo ouvir áudios 🙉 — me manda por escrito?"
          : "Esse tipo de mensagem eu ainda não entendo. Me manda por escrito?",
      );
      return;
  }

  const texto = await responder(conteudo, resumo);
  const envio = await enviarTexto(m.de, texto);
  if (!envio.ok) console.error("[whatsapp] a Meta recusou a resposta:", envio);
}
