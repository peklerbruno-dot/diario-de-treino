import { NextResponse } from "next/server";
import { temSessao } from "@/lib/auth";
import { galeria } from "@/lib/consultas";

/** A próxima página da galeria de fotos dos pratos. */
export async function GET(req: Request) {
  if (!(await temSessao())) return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });
  const url = new URL(req.url);
  const nome = url.searchParams.get("refeicao") || undefined;
  const antesDe = url.searchParams.get("antes") || undefined;
  return NextResponse.json(await galeria({ nome, antesDe }));
}
