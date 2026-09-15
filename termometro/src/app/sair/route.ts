import { NextResponse } from "next/server";
import { sair } from "@/lib/auth";

export async function POST(pedido: Request) {
  await sair();
  return NextResponse.redirect(new URL("/entrar", pedido.url), { status: 303 });
}
