import { NextResponse } from "next/server";

/** Só para saber se o app está de pé — não toca no banco. */
export function GET() {
  return NextResponse.json({ ok: true, agora: new Date().toISOString() });
}
