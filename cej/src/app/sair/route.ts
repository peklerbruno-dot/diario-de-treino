import { NextResponse } from "next/server";
import { fecharSessao } from "@/lib/auth";

export async function POST(pedido: Request) {
  await fecharSessao();
  return NextResponse.redirect(new URL("/entrar", pedido.url), { status: 303 });
}
