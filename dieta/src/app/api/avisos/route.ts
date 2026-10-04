import { NextResponse } from "next/server";
import { avisosDevidos } from "@/lib/agenda";
import { bd } from "@/lib/bd";
import { ajustes, historico, planoAtivo, situacaoDoDia } from "@/lib/consultas";
import { resumoDaSemana } from "@/lib/relatorio";
import { agoraNoFuso } from "@/lib/datas";
import { enviarParaTodos } from "@/lib/push";

/**
 * O relógio dos avisos. Alguém de fora chama este endereço a cada minuto (o
 * cron-job.org, de graça — ver docs/COLOCAR-NO-AR.md) e ele manda o que venceu.
 *
 * Por que não o cron da própria Vercel: no plano gratuito ela só deixa rodar
 * uma vez por dia, e aviso de almoço que chega às 9h da manhã não é aviso.
 *
 * Protegido por `CRON_SECRET`, que pode vir no cabeçalho
 * `Authorization: Bearer …` ou em `?chave=…` (o jeito mais fácil de colar
 * num serviço de cron).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function autorizado(req: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  const cabecalho = req.headers.get("authorization");
  const chave = new URL(req.url).searchParams.get("chave");
  return cabecalho === `Bearer ${segredo}` || chave === segredo;
}

export async function GET(req: Request) {
  if (!autorizado(req)) return new Response("Não autorizado.", { status: 401 });

  const agora = agoraNoFuso();
  // Sem plano ainda dá para ter lembretes seus e água: o relógio roda do mesmo jeito.
  const [plano, a, dia, enviadas, lembretes] = await Promise.all([
    planoAtivo(),
    ajustes(),
    situacaoDoDia(agora.dia),
    bd.avisoEnviado.findMany({ where: { chave: { startsWith: `${agora.dia}|` } }, select: { chave: true } }),
    bd.lembrete.findMany({ where: { ativo: true } }),
  ]);

  // O resumo da semana só é montado no domingo, que é quando ele pode sair.
  const semana =
    agora.diaDaSemana === 0 && a.resumoSemanal
      ? resumoDaSemana(
          (await historico(agora.dia, 7)).map((d) => ({ ...d, fotos: d.fotos.length })),
          a.aguaMeta,
        )
      : undefined;

  const devidos = avisosDevidos({
    agora,
    refeicoes: plano?.refeicoes ?? [],
    ajustes: a,
    marcadas: new Set(Object.keys(dia.marcas)),
    seguidas: Object.values(dia.marcas).filter((m) => m.estado === "seguiu").length,
    aguaHoje: dia.agua,
    lembretes,
    resumoDaSemana: semana,
    enviadas: new Set(enviadas.map((e) => e.chave)),
  });

  const resultado: { chave: string; enviados: number; falhas: string[] }[] = [];
  for (const aviso of devidos) {
    // Reservar antes de mandar: se duas chamadas do relógio se cruzarem, só a
    // que conseguir gravar a chave manda — o aviso não chega duas vezes.
    const reserva = await bd.avisoEnviado.createMany({ data: [{ chave: aviso.chave }], skipDuplicates: true });
    if (!reserva.count) continue;
    const envio = await enviarParaTodos({ titulo: aviso.titulo, corpo: aviso.corpo, url: aviso.url });
    resultado.push({ chave: aviso.chave, ...envio });
  }

  // Faxina: chave de aviso só serve no dia dela. Uma vez por dia, na virada.
  if (agora.minutos < 2) {
    await bd.avisoEnviado.deleteMany({ where: { criadoEm: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } } });
  }

  return NextResponse.json({ agora, avisos: resultado });
}
