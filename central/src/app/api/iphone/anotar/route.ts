import { revalidatePath } from "next/cache";
import { chaveConfere } from "@/lib/iphone";
import { lerData } from "@/lib/anotar";
import { anotar } from "@/lib/tarefas";

export const dynamic = "force-dynamic";

/**
 * O atalho "Anotar" do iPhone: manda o texto (em JSON {"texto": "...",
 * "prazo": "..."}, em formulário ou como texto puro) e a tarefa entra no
 * Hoje, com o prazo escolhido ou, sem ele, a data que o próprio texto disser.
 */
export async function POST(req: Request) {
  if (!(await chaveConfere(req))) return Response.json({ erro: "Chave inválida. Gere outra em Ajustes." }, { status: 401 });
  const tipo = req.headers.get("content-type") ?? "";
  const bruto = await req.text();
  let texto = bruto;
  let prazo: string | null = null;
  if (tipo.includes("json")) {
    try {
      const corpo = JSON.parse(bruto) as { texto?: unknown; prazo?: unknown };
      texto = String(corpo.texto ?? "");
      // O prazo escolhido no calendário do atalho vale mais que o do texto.
      if (corpo.prazo) prazo = lerData(String(corpo.prazo));
    } catch {
      texto = "";
    }
  } else if (tipo.includes("form")) {
    // Sem o campo "texto", o corpo inteiro é a anotação.
    const campos = new URLSearchParams(bruto);
    texto = campos.get("texto") ?? [...campos.keys()].join(" ");
  }
  const t = await anotar(texto, prazo);
  if (!t) return Response.json({ erro: "Nada para anotar." }, { status: 400 });
  revalidatePath("/", "layout");
  const ate = t.prazo
    ? t.prazo.toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "numeric" })
    : null;
  return Response.json({ ok: true, titulo: t.titulo, prazo: ate, mensagem: ate ? `Anotado: ${t.titulo} (até ${ate})` : `Anotado: ${t.titulo}` });
}
