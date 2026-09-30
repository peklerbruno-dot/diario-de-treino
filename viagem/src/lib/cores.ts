/** As cores de cada pessoa, na ordem em que entram. Escolhidas para serem distinguíveis entre si. */
export const CORES = ["#c2185b", "#1f5f8f", "#1b7148", "#8a5300", "#6b3fa0", "#b3352c", "#00796b", "#5d4037", "#ad1457", "#283593"];
export const corDoMembro = (i: number) => CORES[i % CORES.length];

/** "Ana Beatriz Souza" → "AB" */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

/** "Ana Beatriz Souza" → "Ana" */
export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;
