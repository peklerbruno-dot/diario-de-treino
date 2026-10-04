import { bd } from "@/lib/bd";
import { avisarViagem } from "@/lib/avisos";
import { diasEntre, hoje, porExtenso } from "@/lib/datas";

/**
 * O lembrete da manhã: todo dia, às 7h da Cidade do México, cada viagem em
 * andamento recebe o roteiro do dia. Quem chama é o cron da Vercel
 * (vercel.json), que manda `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(pedido: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || pedido.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new Response("Não autorizado", { status: 401 });
  }
  const dia = hoje();
  const viagens = await bd.viagem.findMany({ where: { inicio: { lte: dia }, fim: { gte: dia } } });
  let enviados = 0;
  for (const v of viagens) {
    const itens = await bd.itemRoteiro.findMany({
      where: { viagemId: v.id, dia },
      orderBy: [{ hora: "asc" }, { ordem: "asc" }],
    });
    const n = diasEntre(v.inicio, dia).length;
    const lista = itens.length
      ? itens.slice(0, 5).map((i) => `${i.hora ? `${i.hora} ` : ""}${i.titulo}`).join(" · ") + (itens.length > 5 ? " …" : "")
      : "Dia livre no roteiro — bom para aquele lugar da lista.";
    await avisarViagem(v.id, { titulo: `☀️ Dia ${n} · ${porExtenso(dia)}`, corpo: lista, url: `/v/${v.id}/roteiro#${dia}`, marca: `manha-${dia}` });
    enviados++;
  }
  return Response.json({ dia, viagens: enviados });
}
