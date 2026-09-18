/**
 * Devolver à tela o que a pessoa acabou de digitar.
 *
 * Existe por causa de um detalhe do React 19 que custa caro e não avisa: um
 * formulário com `action={funçãoDeServidor}` é **limpo** depois de cada envio.
 * Numa ação que dá certo isso é o certo — a tela seguinte é outra. Numa que
 * recusa, é desastre: a pessoa preenche quinze campos da atividade, erra a data
 * final, e volta com o formulário em branco e uma mensagem de erro.
 *
 * Então toda ação que pode recusar devolve, junto do erro, o que foi digitado, e
 * o formulário renasce preenchido.
 *
 * Senha nunca volta. Devolvê-la significaria escrevê-la dentro do HTML da
 * página, que é exatamente onde ela não deve estar — e redigitar uma senha é
 * barato, ao contrário de redigitar uma ementa.
 */

const NUNCA_VOLTA = ["senha", "repetida", "atual", "nova", "codigo", "convite"];

export type ComValores = { erro?: string; valores?: Record<string, string> } | null;

export function valoresDigitados(dados: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [campo, valor] of dados.entries()) {
    if (NUNCA_VOLTA.includes(campo)) continue;
    if (typeof valor === "string") valores[campo] = valor;
  }
  return valores;
}

/** O que o campo deve mostrar: o que foi digitado, senão o que estava guardado. */
export const comoVeio = (
  estado: ComValores,
  campo: string,
  guardado?: string | number | null,
): string => estado?.valores?.[campo] ?? (guardado == null ? "" : String(guardado));
