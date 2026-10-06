import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { temSessao } from "@/lib/auth";
import { googleConfigurado, urlDeConsentimento } from "@/lib/google";
import { enderecoDeRetorno } from "../retorno/endereco";

/** Começo do OAuth: manda para a tela de permissão do Google. */
export async function GET(req: Request) {
  if (!(await temSessao())) return NextResponse.redirect(new URL("/entrar", req.url));
  if (!googleConfigurado()) {
    return NextResponse.redirect(new URL("/ajustes?erro=Faltam+GOOGLE_CLIENT_ID+e+GOOGLE_CLIENT_SECRET", req.url));
  }
  // O "state" volta do Google e precisa bater com o cookie: é o que impede
  // outro site de enfiar a conta Google DELE na sua Central.
  const state = randomBytes(24).toString("base64url");
  (await cookies()).set("central_oauth", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return NextResponse.redirect(urlDeConsentimento(enderecoDeRetorno(req), state));
}
