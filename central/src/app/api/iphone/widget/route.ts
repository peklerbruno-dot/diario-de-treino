import { chaveConfere, chaveDoIphone } from "@/lib/iphone";
import { scriptDoWidget } from "@/lib/widget-iphone";
import { enderecoFixo } from "../../google/retorno/endereco";

export const dynamic = "force-dynamic";

/** O script do widget, sempre na versão mais nova (o Scriptable o busca a cada atualização). */
export async function GET(req: Request) {
  if (!(await chaveConfere(req))) return new Response("Chave inválida. Gere outra em Ajustes.", { status: 401 });
  return new Response(scriptDoWidget(enderecoFixo(req), await chaveDoIphone()), {
    headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" },
  });
}
