import { NextResponse, type NextRequest } from "next/server";
import { consumirToken } from "@/lib/auth";

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const r = await consumirToken(token);
  const destino = new URL(r.ok ? "/" : `/login?erro=${encodeURIComponent(r.motivo ?? "")}`, req.url);
  return NextResponse.redirect(destino);
}
