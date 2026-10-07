/**
 * O endereço para onde o Google devolve. Tem de ser idêntico ao cadastrado no
 * Google Cloud — por isso APP_URL, quando existir, manda: o domínio de uma
 * pré-visualização da Vercel muda a cada deploy e nunca estaria cadastrado.
 */
export function enderecoDeRetorno(req: Request): string {
  const base = process.env.APP_URL?.replace(/\/+$/, "") || new URL(req.url).origin;
  return `${base}/api/google/retorno`;
}
