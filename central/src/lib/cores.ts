/**
 * A cor de cada conta, como num app de calendário: é ela que diz, de relance,
 * de onde vem um compromisso ou um e-mail. Tons sóbrios, que funcionam sobre
 * o claro e o escuro; a ordem segue a de conexão das contas.
 */
export const CORES_DE_CONTA = ["#3E6FB0", "#B0553E", "#2F8571", "#6B4FA3", "#B08A2E", "#A0456E"];

export function corDaConta(contas: { id: string }[], id: string): string {
  const i = contas.findIndex((c) => c.id === id);
  return CORES_DE_CONTA[(i < 0 ? 0 : i) % CORES_DE_CONTA.length];
}
