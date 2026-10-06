import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { iguais, temSessao } from "@/lib/auth";
import { conectarConta } from "@/lib/google";
import { enderecoDeRetorno } from "./endereco";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const voltar = (q: string) => NextResponse.redirect(new URL(`/ajustes?${q}`, req.url));
  if (!(await temSessao())) return NextResponse.redirect(new URL("/entrar", req.url));

  const jar = await cookies();
  const esperado = jar.get("central_oauth")?.value ?? "";
  jar.delete("central_oauth");

  const erro = url.searchParams.get("error");
  if (erro) return voltar(`erro=${encodeURIComponent(erro === "access_denied" ? "Você cancelou na tela do Google." : erro)}`);

  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  if (!code || !esperado || !iguais(state, esperado)) {
    return voltar(`erro=${encodeURIComponent("A conexão expirou. Tente de novo.")}`);
  }
  try {
    const conta = await conectarConta(code, enderecoDeRetorno(req));
    return voltar(`conectada=${encodeURIComponent(conta.email)}`);
  } catch (e) {
    console.error("[google retorno]", e);
    return voltar(`erro=${encodeURIComponent((e as Error).message)}`);
  }
}
