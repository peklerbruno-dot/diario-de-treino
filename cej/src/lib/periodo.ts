import { ehDiaValido, hoje } from "./datas";

/**
 * O período do relatório, lido do endereço.
 *
 * O padrão é o ano corrente inteiro, porque é o recorte que a universidade
 * pede. Datas inválidas não dão erro: caem no padrão, que é o comportamento
 * certo para um endereço que alguém pode ter editado à mão.
 */
export function periodoPedido(bruto: { de?: string; ate?: string }): { de: string; ate: string } {
  const ano = hoje().slice(0, 4);
  const de = ehDiaValido(bruto.de) ? bruto.de : `${ano}-01-01`;
  const ate = ehDiaValido(bruto.ate) ? bruto.ate : `${ano}-12-31`;
  return de <= ate ? { de, ate } : { de: ate, ate: de };
}
