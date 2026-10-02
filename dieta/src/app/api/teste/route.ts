import { NextResponse } from "next/server";
import { temSessao } from "@/lib/auth";
import { enviarParaTodos } from "@/lib/push";

/** O botão "Mandar um aviso de teste": prova que a corrente inteira funciona. */
export async function POST() {
  if (!(await temSessao())) return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });
  const r = await enviarParaTodos({
    titulo: "Aviso de teste ✅",
    corpo: "Se você está lendo isto, os avisos das refeições vão chegar.",
    url: "/ajustes",
    tag: "teste",
  });
  return NextResponse.json(r);
}
