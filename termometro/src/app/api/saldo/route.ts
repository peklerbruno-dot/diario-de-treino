import { NextResponse } from "next/server";
import { hojeNoFuso } from "@/lib/atalho";
import { codigoConfere, temSessao } from "@/lib/auth";
import { nomeDoMes, partesDaData } from "@/lib/datas";
import { comCifrao } from "@/lib/dinheiro";
import { saldoNoServidor } from "@/lib/saldo-no-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "E aí Siri, como estou de dinheiro?" — a pergunta sem lançamento nenhum.
 *
 * Devolve o saldo de hoje, o fechamento previsto do mês e quanto dá por dia,
 * numa frase pronta para a notificação do atalho. O código de acesso vai no
 * cabeçalho `x-codigo`, como no /api/lancar, nunca no endereço.
 */
export async function GET(pedido: Request) {
  const autorizado = codigoConfere(pedido.headers.get("x-codigo")) || (await temSessao());
  if (!autorizado) {
    return NextResponse.json({ erro: "Código de acesso inválido." }, { status: 401 });
  }

  const hoje = hojeNoFuso();
  const { saldoDoDiaCents, sobra } = await saldoNoServidor(hoje);
  const { mes } = partesDaData(hoje);

  const partes = [`Você tem ${comCifrao(saldoDoDiaCents)}.`];
  if (sobra) {
    partes.push(
      `${capitalizar(nomeDoMes(mes))} fecha em ${comCifrao(sobra.fechamentoCents)} se nada mudar.`,
    );
    partes.push(
      sobra.noVermelho
        ? "O mês já fecha abaixo de zero."
        : sobra.porDiaCents > 0
          ? `Dá ${comCifrao(sobra.porDiaCents)} por dia até o fim do mês.`
          : "Sobra menos de um real por dia até o fim do mês.",
    );
  }

  return NextResponse.json({
    ok: true,
    recado: partes.join(" "),
    data: hoje,
    saldoDoDiaCents,
    fechamentoDoMesCents: sobra?.fechamentoCents ?? null,
    daPorDiaCents: sobra?.porDiaCents ?? null,
  });
}

const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
