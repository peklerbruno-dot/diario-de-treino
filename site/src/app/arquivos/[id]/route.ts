import { bd } from "@/lib/bd";

/**
 * Entrega uma foto ou um PDF guardado no banco. Um arquivo nunca muda depois
 * de enviado (trocar a foto é enviar outra), então o navegador e a Vercel
 * podem guardar a resposta por um ano sem perguntar de novo.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/.test(id)) return new Response("Não encontrado", { status: 404 });
  const a = await bd.arquivo.findUnique({ where: { id } });
  if (!a) return new Response("Não encontrado", { status: 404 });
  return new Response(new Uint8Array(a.conteudo), {
    headers: {
      "Content-Type": a.tipo,
      "Content-Length": String(a.tamanho),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(a.nome)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
