import { chaveConfere, resumoDoWidget } from "@/lib/iphone";

export const dynamic = "force-dynamic";

/** O resumo do dia para o widget do iPhone. */
export async function GET(req: Request) {
  if (!(await chaveConfere(req))) return Response.json({ erro: "Chave inválida. Gere outra em Ajustes." }, { status: 401 });
  return Response.json(await resumoDoWidget());
}
