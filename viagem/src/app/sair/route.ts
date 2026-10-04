import { NextResponse } from "next/server";
import { fecharSessao } from "@/lib/auth";

export async function POST(pedido: Request) {
  await fecharSessao();
  const r = NextResponse.redirect(new URL("/entrar", pedido.url), 303);
  // Quem sai leva junto as telas guardadas para o modo sem internet.
  r.headers.set("Clear-Site-Data", '"cache"');
  return r;
}
