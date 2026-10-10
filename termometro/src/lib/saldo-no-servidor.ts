import { bd } from "./bd";
import { calcularAnoEncadeado, sobraPorDia, type AnoCalculado, type SobraPorDia } from "./calculo";
import { hojeNoFuso } from "./atalho";
import { partesDaData } from "./datas";

/**
 * O saldo de um dia calculado no servidor — a MESMA conta da tela.
 *
 * É o que o atalho da Siri responde ("lançar gasto" devolve o saldo) e o que
 * "como estou de dinheiro" pergunta sem lançar nada. Vive num lugar só para
 * os dois endereços não divergirem: todos os lançamentos vivos (a corrente de
 * anos precisa deles), os saldos de abertura digitados e o rateio de verdade.
 */
export async function saldoNoServidor(
  data: string,
  usuarioId: string,
): Promise<{
  ano: AnoCalculado;
  saldoDoDiaCents: number;
  sobra: SobraPorDia | null;
}> {
  const { ano, mes, dia } = partesDaData(data);

  const [vivos, aberturas, rateio] = await Promise.all([
    bd.lancamento.findMany({
      where: { usuarioId, apagadoEm: null },
      select: {
        id: true,
        data: true,
        tipo: true,
        valorCents: true,
        rendaPropria: true,
        investimento: true,
        apartamento: true,
        credito: true,
        previsto: true,
      },
    }),
    bd.ajuste.findMany({ where: { usuarioId, chave: { startsWith: "saldoInicial:" } } }),
    bd.ajuste.findUnique({ where: { usuarioId_chave: { usuarioId, chave: "rateioApto" } } }),
  ]);

  const saldosIniciais: Record<number, number> = {};
  for (const a of aberturas) {
    const anoDaChave = Number(a.chave.slice(13));
    const cents = Number(a.valor);
    if (Number.isFinite(anoDaChave) && Number.isFinite(cents)) saldosIniciais[anoDaChave] = cents;
  }

  const calculado = calcularAnoEncadeado({
    ano,
    lancamentos: vivos,
    saldosIniciais,
    // 40% era o rateio do apartamento do dono; quem chega começa sem rateio.
    rateioAptoPercent:
      rateio && Number.isFinite(Number(rateio.valor))
        ? Number(rateio.valor)
        : usuarioId === "dono"
          ? 40
          : 0,
    // A estimativa do diário só conta dos dias que vêm: o saldo que a
    // notificação diz é o de agora, com o que foi lançado até aqui.
    hoje: hojeNoFuso(),
  });

  return {
    ano: calculado,
    saldoDoDiaCents: calculado.meses[mes - 1]?.dias[dia - 1]?.saldoCents ?? 0,
    sobra: sobraPorDia(calculado, data),
  };
}
