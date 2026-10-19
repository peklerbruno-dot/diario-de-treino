import { revalidatePath } from "next/cache";
import { chaveConfere } from "@/lib/iphone";
import { anotar } from "@/lib/tarefas";

export const dynamic = "force-dynamic";

/**
 * O atalho "Anotar" do iPhone: manda o texto (em JSON {"texto": "..."}, em
 * formulário ou como texto puro) e a tarefa entra no Hoje, com a data que o
 * próprio texto disser.
 */
export async function POST(req: Request) {
  if (!(await chaveConfere(req))) return Response.json({ erro: "Chave inválida. Gere outra em Ajustes." }, { status: 401 });
  const tipo = req.headers.get("content-type") ?? "";
  const bruto = await req.text();
  let texto = bruto;
  if (tipo.includes("json")) {
    try {
      texto = String((JSON.parse(bruto) as { texto?: unknown }).texto ?? "");
    } catch {
      texto = "";
    }
  } else if (tipo.includes("form")) {
    // Sem o campo "texto", o corpo inteiro é a anotação.
    const campos = new URLSearchParams(bruto);
    texto = campos.get("texto") ?? [...campos.keys()].join(" ");
  }
  const t = await anotar(texto);
  if (!t) return Response.json({ erro: "Nada para anotar." }, { status: 400 });
  revalidatePath("/", "layout");
  const prazo = t.prazo
    ? t.prazo.toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "numeric" })
    : null;
  return Response.json({ ok: true, titulo: t.titulo, prazo, mensagem: prazo ? `Anotado: ${t.titulo} (até ${prazo})` : `Anotado: ${t.titulo}` });
}
