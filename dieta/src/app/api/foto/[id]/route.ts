import { temSessao } from "@/lib/auth";
import { bd } from "@/lib/bd";

/** A imagem de uma foto do prato. Só para quem entrou. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await temSessao())) return new Response("Sem sessão.", { status: 401 });
  const { id } = await params;
  const foto = await bd.foto.findUnique({ where: { id }, select: { imagem: true, tipo: true } });
  if (!foto) return new Response("Não achei essa foto.", { status: 404 });
  return new Response(new Uint8Array(foto.imagem), {
    headers: {
      "Content-Type": foto.tipo,
      // A foto nunca muda depois de salva: o aparelho pode guardar à vontade.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
