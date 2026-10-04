import { bd } from "@/lib/bd";
import { pessoaAtual } from "@/lib/auth";

/** Baixar um documento — só para quem é da viagem. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const pessoa = await pessoaAtual();
  if (!pessoa) return new Response("Entre no app primeiro.", { status: 401 });
  const membro = await bd.membro.findFirst({ where: { viagemId: id, pessoaId: pessoa.id, saiuEm: null }, select: { id: true } });
  if (!membro) return new Response("Não encontrado.", { status: 404 });
  const doc = await bd.documento.findFirst({ where: { id: docId, viagemId: id, apagadoEm: null } });
  if (!doc?.dados) return new Response("Não encontrado.", { status: 404 });
  const nome = encodeURIComponent(doc.nomeDoArquivo || doc.titulo);
  return new Response(new Uint8Array(doc.dados), {
    headers: {
      "Content-Type": doc.mime || "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${nome}`,
      // Pode ficar no celular para abrir sem internet, mas nunca num cache compartilhado.
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
