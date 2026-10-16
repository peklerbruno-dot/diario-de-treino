import { redirect } from "next/navigation";

/** Endereço antigo de uma conversa: agora ela abre dentro de E-mails. */
export default async function PaginaDaConversa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/caixa?c=${id}`);
}
