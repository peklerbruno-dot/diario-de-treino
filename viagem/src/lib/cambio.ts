import "server-only";
import { LISTA_DE_MOEDAS } from "./dinheiro";

/**
 * Quanto vale 1 unidade de cada moeda na moeda base — {"MXN": 0.29, ...}.
 *
 * Duas fontes gratuitas e sem chave, uma de reserva da outra. É só a
 * sugestão para a despesa nova: quem lança pode corrigir para o câmbio que a
 * casa de câmbio ou o cartão de fato cobraram.
 */
export async function buscarCambios(base: string): Promise<Record<string, number> | null> {
  const outras = LISTA_DE_MOEDAS.filter((m) => m !== base);
  const inverter = (taxas: Record<string, number>) => {
    const saida: Record<string, number> = {};
    for (const m of outras) if (taxas[m] > 0) saida[m] = Number((1 / taxas[m]).toFixed(6));
    return Object.keys(saida).length ? saida : null;
  };

  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${base}`, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (r.ok) {
      const j = (await r.json()) as { result?: string; rates?: Record<string, number> };
      if (j.result === "success" && j.rates) {
        const s = inverter(j.rates);
        if (s) return s;
      }
    }
  } catch {
    /* tenta a outra */
  }
  try {
    const r = await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${outras.join(",")}`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (r.ok) {
      const j = (await r.json()) as { rates?: Record<string, number> };
      if (j.rates) return inverter(j.rates);
    }
  } catch {
    /* sem câmbio automático; fica o que estava */
  }
  return null;
}
