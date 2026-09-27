import { NextResponse } from "next/server";
import { bd } from "@/lib/bd";
import { proximaVez, type Repeticao } from "@/lib/datas";
import { enviarModelo, enviarTexto, numeroDoDono } from "@/lib/whatsapp";

/**
 * O relógio dos lembretes. Alguém de fora chama este endereço a cada minuto (o
 * cron-job.org, de graça — ver docs/COLOCAR-NO-AR.md) e ele manda o que venceu.
 *
 * Protegido por `CRON_SECRET`, que pode vir no cabeçalho
 * `Authorization: Bearer …` (o jeito da Vercel) ou em `?chave=…` (o jeito
 * mais fácil de colar num serviço de cron).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** O código de erro da Meta para "passou das 24 horas desde a última mensagem dele". */
const FORA_DA_JANELA = 131047;

function autorizado(req: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  const cabecalho = req.headers.get("authorization");
  const chave = new URL(req.url).searchParams.get("chave");
  return cabecalho === `Bearer ${segredo}` || chave === segredo;
}

export async function GET(req: Request) {
  if (!autorizado(req)) return new Response("Não autorizado.", { status: 401 });

  const agora = new Date();
  const vencidos = await bd.lembrete.findMany({
    where: { enviadoEm: null, canceladoEm: null, quando: { lte: agora } },
    orderBy: { quando: "asc" },
    take: 20,
  });

  const para = vencidos.length ? await numeroDoDono() : "";
  let enviados = 0;
  const falhas: string[] = [];

  for (const l of vencidos) {
    // Reservar antes de mandar: se duas chamadas do cron se cruzarem, só a que
    // conseguir mudar a linha manda — o lembrete não chega duas vezes.
    const reserva = await bd.lembrete.updateMany({
      where: { id: l.id, quando: l.quando, enviadoEm: null, canceladoEm: null },
      data: l.repetir
        ? { quando: proximaVez(l.quando, l.repetir as Repeticao, agora) }
        : { enviadoEm: agora },
    });
    if (!reserva.count) continue;

    let envio = await enviarTexto(para, `⏰ ${l.texto}`);
    const modelo = process.env.WHATSAPP_MODELO_LEMBRETE;
    if (!envio.ok && envio.codigo === FORA_DA_JANELA && modelo) {
      envio = await enviarModelo(para, modelo, process.env.WHATSAPP_MODELO_IDIOMA || "pt_BR", l.texto);
    }
    if (envio.ok) {
      enviados++;
      // Fica no histórico, para você poder responder "adia 1 hora" e ele saber do quê.
      await bd.mensagem.create({ data: { papel: "assistant", texto: `⏰ (lembrete) ${l.texto}` } });
    } else {
      falhas.push(`${l.id}: ${envio.erro}`);
      console.error("[lembretes] falha ao enviar", l.id, envio);
    }
  }

  return NextResponse.json({ vencidos: vencidos.length, enviados, falhas });
}
