import { NextResponse } from "next/server";
import { codigoConfere, temSessao } from "@/lib/auth";
import { bd } from "@/lib/bd";
import { calcularAno } from "@/lib/calculo";
import { hojeNoFuso, lerPedidoDoAtalho, recadoDoAtalho } from "@/lib/atalho";
import { partesDaData } from "@/lib/datas";

/**
 * A porta de trás: um lançamento, sem abrir o app.
 *
 * É por aqui que entra o atalho do iPhone — aquele que você dispara com dois
 * toques na traseira do aparelho, ou pedindo à Siri. O corpo mínimo é
 * `{"valor": "38,50"}`; sem tipo é gasto do dia a dia, sem data é hoje.
 *
 * A porta não tem cookie: quem bate manda o código de acesso no cabeçalho
 * `x-codigo`. Vai no cabeçalho, e não no endereço, de propósito — endereço fica
 * gravado em registro de servidor e em histórico de navegador, e o código é a
 * chave do seu dinheiro.
 *
 * A resposta traz o saldo do dia já calculado, para a notificação do atalho
 * dizer o que aconteceu sem você precisar conferir em lugar nenhum.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const naoAutorizado = () =>
  NextResponse.json({ erro: "Código de acesso inválido." }, { status: 401 });

export async function POST(pedido: Request) {
  const doCabecalho = pedido.headers.get("x-codigo");

  let corpo: Record<string, unknown>;
  try {
    corpo = (await pedido.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ erro: "O corpo do pedido não é JSON." }, { status: 400 });
  }

  // O código pode vir no cabeçalho ou no corpo: o app Atalhos preenche os dois
  // com a mesma facilidade, e quem já está com sessão aberta não precisa de
  // nenhum dos dois.
  const doCorpo = typeof corpo.codigo === "string" ? corpo.codigo : null;
  const autorizado = codigoConfere(doCabecalho) || codigoConfere(doCorpo) || (await temSessao());
  if (!autorizado) return naoAutorizado();

  const leitura = lerPedidoDoAtalho(corpo, { hoje: hojeNoFuso() });
  if (!leitura.ok) return NextResponse.json({ erro: leitura.erro }, { status: 400 });

  const { lancamentos } = leitura;

  await bd.lancamento.createMany({
    data: lancamentos.map((l) => ({
      id: l.id,
      data: l.data,
      tipo: l.tipo,
      valorCents: l.valorCents,
      nota: l.nota ?? null,
      previsto: false,
      rendaPropria: !!l.rendaPropria,
      investimento: !!l.investimento,
      apartamento: !!l.apartamento,
      fixoId: null,
      criadoEm: new Date(l.criadoEm!),
      atualizadoEm: new Date(l.atualizadoEm!),
    })),
  });

  const data = lancamentos[0].data;
  const { ano, mes, dia } = partesDaData(data);

  const doAno = await bd.lancamento.findMany({
    where: { apagadoEm: null, data: { startsWith: `${ano}-` } },
    select: {
      id: true,
      data: true,
      tipo: true,
      valorCents: true,
      rendaPropria: true,
      investimento: true,
      apartamento: true,
      previsto: true,
    },
  });
  const abertura = await bd.ajuste.findUnique({ where: { chave: `saldoInicial:${ano}` } });

  const calculado = calcularAno({
    ano,
    lancamentos: doAno,
    ajustes: {
      saldoInicialCents: Number(abertura?.valor ?? 0) || 0,
      rateioAptoPercent: 40,
    },
  });
  const saldoDoDia = calculado.meses[mes - 1]?.dias[dia - 1]?.saldoCents ?? 0;

  return NextResponse.json({
    ok: true,
    recado: recadoDoAtalho(lancamentos, saldoDoDia),
    quantos: lancamentos.length,
    data,
    tipo: lancamentos[0].tipo,
    totalCents: lancamentos.reduce((soma, l) => soma + l.valorCents, 0),
    saldoDoDiaCents: saldoDoDia,
  });
}

/** Um GET aqui só existe para dizer que a porta está de pé, e como bater nela. */
export function GET() {
  return NextResponse.json({
    comoUsar:
      'POST com o cabeçalho "x-codigo" e o corpo {"valor":"38,50"}. ' +
      'Opcionais: "tipo" (entrada, saída ou diário), "data" (AAAA-MM-DD) e "nota".',
  });
}
