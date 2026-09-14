import { NextResponse, type NextRequest } from "next/server";
import { sair } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await sair();
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
}
