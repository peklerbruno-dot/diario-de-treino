"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { calcularAno, type AnoCalculado } from "@/lib/calculo";
import { ajustesDoAno, lancamentosVivos, loja, type Estado } from "@/lib/loja";

/**
 * O estado do aparelho, do jeito que o React gosta de receber.
 *
 * No servidor a leitura devolve o estado vazio: a primeira pintura da página é
 * igual dos dois lados, e só depois de montar é que o conteúdo guardado aparece.
 * Sem isso o React reclama de hidratação e apaga a tela inteira.
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

/** O ano inteiro já calculado — é o que quase toda tela quer. */
export function useAnoCalculado(ano: number): AnoCalculado {
  const estado = useEstado();
  return useMemo(
    () =>
      calcularAno({
        ano,
        lancamentos: lancamentosVivos(estado),
        ajustes: ajustesDoAno(estado, ano),
      }),
    [estado, ano],
  );
}
