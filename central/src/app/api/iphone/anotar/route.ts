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
  let prazoRecebido = "";
  if (tipo.includes("json")) {
    try {
      const corpo = JSON.parse(bruto) as { texto?: unknown; prazo?: unknown };
      texto = String(corpo.texto ?? "");
      // O prazo escolhido no calendário do atalho vale mais que o do texto.
      if (corpo.prazo) {
        prazoRecebido = String(corpo.prazo);
        prazo = lerData(prazoRecebido);
      }
    } catch {
      texto = "";
    }
  } else if (tipo.includes("form")) {
    // Sem o campo "texto", o corpo inteiro é a anotação.
    const campos = new URLSearchParams(bruto);
    texto = campos.get("texto") ?? [...campos.keys()].join(" ");
  }
  const tarefas = await anotar(texto, prazo);
  if (!tarefas.length) return Response.json({ erro: "Nada para anotar." }, { status: 400 });
  revalidatePath("/", "layout");
  // Se veio uma data que não deu para ler, a resposta diz qual foi (para
  // acertar o atalho).
  if (prazoRecebido && !prazo) console.warn("[anotar] data não reconhecida:", prazoRecebido);
  const aviso = prazoRecebido && !prazo ? ` — não entendi a data "${prazoRecebido}"` : "";
  const quando = (d: Date | null) =>
    d ? d.toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "numeric" }) : null;
  const linhas = tarefas.map((t) => (t.prazo ? `${t.titulo} (até ${quando(t.prazo)})` : t.titulo));
  return Response.json({
    ok: true,
    titulo: tarefas[0].titulo,
    prazo: quando(tarefas[0].prazo),
    prazoRecebido: prazoRecebido || null,
    tarefas: tarefas.map((t) => ({ titulo: t.titulo, prazo: quando(t.prazo) })),
    mensagem: (tarefas.length === 1 ? `Anotado: ${linhas[0]}` : `Anotadas ${tarefas.length}: ${linhas.join("; ")}`) + aviso,
  });
}
