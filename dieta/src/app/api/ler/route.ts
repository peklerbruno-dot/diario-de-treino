import { NextResponse } from "next/server";
import { temSessao } from "@/lib/auth";
import { ErroDeLeitura, lerPlano } from "@/lib/leitor";

/**
 * Recebe o PDF, as fotos ou o texto do plano e devolve o que o Gemini leu,
 * para a tela mostrar e deixar corrigir. Não grava nada.
 *
 * O limite é o da Vercel: 4,5 MB por envio. As fotos já chegam reduzidas pelo
 * próprio aparelho (`reduzirImagem` na tela); o PDF vai como está.
 */

export const maxDuration = 60;

const TIPOS = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAXIMO = 4_300_000;

export async function POST(req: Request) {
  if (!(await temSessao())) return NextResponse.json({ erro: "A sessão venceu. Entre de novo." }, { status: 401 });

  let dados: FormData;
  try {
    dados = await req.formData();
  } catch {
    return NextResponse.json({ erro: "O envio passou do tamanho que dá para ler (4 MB). Mande fotos em vez do PDF, ou menos páginas." }, { status: 413 });
  }

  const arquivos: { tipo: string; base64: string }[] = [];
  let total = 0;
  for (const valor of dados.getAll("arquivos")) {
    if (!(valor instanceof File) || valor.size === 0) continue;
    if (!TIPOS.includes(valor.type)) {
      return NextResponse.json({ erro: `Não sei ler arquivos do tipo "${valor.type || valor.name}". Mande PDF ou foto.` }, { status: 400 });
    }
    total += valor.size;
    if (total > MAXIMO) {
      return NextResponse.json({ erro: "Os arquivos passaram de 4 MB juntos. Mande menos páginas por vez, ou fotos em vez do PDF." }, { status: 413 });
    }
    arquivos.push({ tipo: valor.type, base64: Buffer.from(await valor.arrayBuffer()).toString("base64") });
  }

  try {
    const plano = await lerPlano({ texto: String(dados.get("texto") ?? ""), arquivos });
    return NextResponse.json({ plano });
  } catch (e) {
    const erro = e instanceof ErroDeLeitura ? e.message : "Algo deu errado na leitura. Tente de novo.";
    if (!(e instanceof ErroDeLeitura)) console.error("[ler]", e);
    return NextResponse.json({ erro }, { status: 422 });
  }
}
