import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { temSessao } from "@/lib/auth";
import { bd } from "@/lib/bd";
import { hoje } from "@/lib/datas";
import { novoId } from "@/lib/ids";

/** Recebe uma foto do corpo (já reduzida no aparelho) e guarda. Sem Gemini. */

const MAXIMO = 3_000_000;

export async function POST(req: Request) {
  if (!(await temSessao())) return NextResponse.json({ erro: "A sessão venceu. Entre de novo." }, { status: 401 });
  const dados = await req.formData().catch(() => null);
  const arquivo = dados?.get("imagem");
  if (!(arquivo instanceof File) || !arquivo.type.startsWith("image/")) {
    return NextResponse.json({ erro: "Não chegou nenhuma foto." }, { status: 400 });
  }
  if (arquivo.size > MAXIMO) return NextResponse.json({ erro: "Foto grande demais." }, { status: 413 });
  const pedido = String(dados?.get("dia") ?? "");
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(pedido) && pedido <= hoje() ? pedido : hoje();
  const id = novoId();
  await bd.fotoCorpo.create({
    data: { id, dia, tipo: arquivo.type, imagem: Buffer.from(await arquivo.arrayBuffer()), nota: String(dados?.get("nota") ?? "").slice(0, 200) },
  });
  revalidatePath("/", "layout");
  return NextResponse.json({ id, dia });
}
