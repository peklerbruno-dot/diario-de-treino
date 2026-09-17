"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { calcularAno, type AnoCalculado } from "@/lib/calculo";
import {
  lancamentosVivos,
  loja,
  rateioApto,
  saldoInicialExplicito,
  type Estado,
} from "@/lib/loja";

/**
 * O estado do aparelho, do jeito que o React gosta de receber.
 *
 * No servidor a leitura devolve o estado vazio: a primeira pintura da página é
 * igual dos dois lados, e só depois de montar é que o conteúdo guardado
 * aparece. Sem isso o React reclama de hidratação e apaga a tela inteira.
 */
const VAZIO: Estado = {
  lancamentos: {},
  fixos: {},
  ajustes: {},
  ate: null,
  pendentes: [],
  situacao: "guardado",
  ultimaSincronizacao: null,
  recadoDeErro: null,
  carregado: false,
};

export function useEstado(): Estado {
  return useSyncExternalStore(loja.assinar, loja.instantaneo, () => VAZIO);
}

export function useIniciarLoja() {
  useEffect(() => {
    loja.iniciar();
  }, []);
}

/**
 * O ano inteiro já calculado — é o que quase toda tela quer.
 *
 * Um ano começa onde o anterior terminou. O app encadeia os anos que tem, do
 * mais antigo até o pedido, em vez de esperar alguém digitar o saldo de
 * abertura toda virada de ano: em 1º de janeiro o saldo de 31 de dezembro já
 * está lá. Um saldo digitado à mão continua valendo e interrompe a corrente —
 * é como se conserta uma diferença sem ter de mexer no passado.
 */
export function useAnoCalculado(ano: number): AnoCalculado {
  const estado = useEstado();

  return useMemo(() => {
    const lancamentos = lancamentosVivos(estado);
    const rateioAptoPercent = rateioApto(estado);

    const anosComLancamento = lancamentos
      .map((l) => Number(l.data.slice(0, 4)))
      .filter(Number.isFinite);
    const primeiro = Math.min(ano, ...(anosComLancamento.length ? anosComLancamento : [ano]));

    let calculado = calcularAno({
      ano: primeiro,
      lancamentos,
      ajustes: {
        saldoInicialCents: saldoInicialExplicito(estado, primeiro) ?? 0,
        rateioAptoPercent,
      },
    });

    for (let a = primeiro + 1; a <= ano; a++) {
      const digitado = saldoInicialExplicito(estado, a);
      calculado = calcularAno({
        ano: a,
        lancamentos,
        ajustes: {
          saldoInicialCents: digitado ?? calculado.saldoFinalCents,
          rateioAptoPercent,
        },
      });
    }

    return calculado;
  }, [estado, ano]);
}
