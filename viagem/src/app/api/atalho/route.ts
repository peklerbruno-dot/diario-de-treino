import { bd } from "@/lib/bd";
import { iguais } from "@/lib/auth";
import { importar, MAXIMO_DE_IMAGENS, TIPOS_DE_IMAGEM } from "@/lib/importar";

/**
 * A porta do atalho do iPhone (e de qualquer automação): recebe um link, um
 * texto ou imagens, e joga na caixa de entrada da viagem.
 *
 * Sem cookie — quem chama é o app Atalhos. A prova de quem é está na chave
 * pessoal (`chaveDoAtalho`), que cada um copia da tela Grupo. A resposta é
 * texto puro, para o atalho poder mostrar numa notificação.
 */

export const maxDuration = 60;

const responder = (texto: string, status = 200) =>
  new Response(texto, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

const LIMITE_POR_IMAGEM = 4_000_000;

export async function POST(pedido: Request) {
  const url = new URL(pedido.url);
  const chave = url.searchParams.get("chave") ?? "";
  const viagemId = url.searchParams.get("viagem") ?? "";
  if (!chave || !viagemId) return responder("Faltou a chave ou a viagem no endereço do atalho.", 400);

  const pessoa = await bd.pessoa.findUnique({ where: { chaveDoAtalho: chave } });
  if (!pessoa || !iguais(pessoa.chaveDoAtalho, chave)) return responder("Chave do atalho inválida. Copie o endereço de novo na tela Grupo.", 401);
  const membro = await bd.membro.findFirst({ where: { viagemId, pessoaId: pessoa.id, saiuEm: null } });
  if (!membro) return responder("Você não está nessa viagem.", 403);

  const textos: string[] = [];
  const imagens: { tipo: string; base64: string }[] = [];
  const tipo = pedido.headers.get("content-type") ?? "";

  if (tipo.includes("multipart/form-data") || tipo.includes("application/x-www-form-urlencoded")) {
    const dados = await pedido.formData();
    for (const [, valor] of dados.entries()) {
      if (typeof valor === "string") {
        if (valor.trim()) textos.push(valor.trim());
      } else if (valor.size > 0 && imagens.length < MAXIMO_DE_IMAGENS) {
        const mime = valor.type || "image/jpeg";
        if (!TIPOS_DE_IMAGEM.includes(mime)) continue;
        if (valor.size > LIMITE_POR_IMAGEM) return responder("Imagem grande demais. Ponha a ação “Redimensionar Imagem” (1400) antes de enviar.", 413);
        imagens.push({ tipo: mime, base64: Buffer.from(await valor.arrayBuffer()).toString("base64") });
      }
    }
  } else if (tipo.includes("application/json")) {
    const j = (await pedido.json().catch(() => ({}))) as { conteudo?: string; texto?: string; link?: string };
    const t = j.conteudo ?? j.texto ?? j.link ?? "";
    if (t.trim()) textos.push(t.trim());
  } else {
    const t = await pedido.text();
    if (t.trim()) textos.push(t.trim());
  }

  if (textos.length === 0 && imagens.length === 0) return responder("Não chegou nada. Confira se o campo “conteudo” leva a Entrada do Atalho.", 400);

  const id = await importar({ viagemId, membroId: membro.id, origem: "atalho", texto: textos.join("\n"), imagens });
  const imp = await bd.importacao.findUniqueOrThrow({ where: { id } });
  if (imp.estado === "falhou") return responder(`Chegou, mas não consegui ler: ${imp.observacao}`);
  const n = Array.isArray(imp.sugestoes) ? imp.sugestoes.length : 0;
  return responder(n ? `✓ ${n} ${n === 1 ? "lugar" : "lugares"} na caixa de entrada. Abra o app para confirmar.` : "Chegou, mas não achei lugar nesse post. Tente mandar os prints.");
}

export async function GET() {
  return responder("Este endereço recebe posts pelo atalho (POST). Veja a tela Grupo do app.");
}
