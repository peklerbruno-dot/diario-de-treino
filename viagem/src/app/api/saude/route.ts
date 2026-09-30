import { bd } from "@/lib/bd";

/** Para conferir se o app e o banco estão de pé. Também acorda o banco do Neon. */
export async function GET() {
  try {
    await bd.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
