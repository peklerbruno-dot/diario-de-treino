import { revalidatePath } from "next/cache";
import { bd } from "@/lib/bd";
import { pessoaAtual } from "@/lib/auth";
import { gravarDespesa } from "@/lib/despesas";

/**
 * Por onde a fila do modo sem internet entrega as despesas guardadas no
 * celular. Recebe os mesmos campos do formulário, em JSON, e usa a mesma
 * regra (`gravarDespesa`). O `idCliente` impede duplicar num reenvio.
 */
export async function POST(pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: viagemId } = await params;
  const pessoa = await pessoaAtual();
  if (!pessoa) return Response.json({ erro: "Entre de novo no app." }, { status: 401 });
  const eu = await bd.membro.findFirst({ where: { viagemId, pessoaId: pessoa.id, saiuEm: null }, include: { viagem: true } });
  if (!eu) return Response.json({ erro: "Você não está nessa viagem." }, { status: 403 });

  const campos = (await pedido.json().catch(() => null)) as Record<string, unknown> | null;
  if (!campos || typeof campos !== "object") return Response.json({ erro: "Pedido inválido." }, { status: 400 });

  const r = await gravarDespesa(
    { viagemId, euId: eu.id, moedaBase: eu.viagem.moedaBase, cambios: eu.viagem.cambios },
    (nome) => (typeof campos[nome] === "string" ? (campos[nome] as string) : ""),
  );
  // Erro de validação é definitivo (422): a fila mostra e não insiste.
  if (!("erro" in r)) revalidatePath(`/v/${viagemId}`, "layout");
  return "erro" in r ? Response.json(r, { status: 422 }) : Response.json(r);
}
