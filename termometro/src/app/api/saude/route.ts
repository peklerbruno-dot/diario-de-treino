import { NextResponse } from "next/server";

const VERSAO = process.env.NEXT_PUBLIC_VERSAO ?? "local";

/**
 * Só para saber se o app está de pé — não toca no banco e não pede sessão.
 *
 * Devolve também a versão do build: é com ela que o app, ao abrir, descobre
 * se o que está na tela do aparelho é o código de agora ou um guardado de
 * antes, e confere isso ANTES de mostrar saldo.
 */
export function GET() {
  return NextResponse.json(
    { ok: true, versao: VERSAO, agora: new Date().toISOString() },
    { headers: { "cache-control": "no-store" } },
  );
}
