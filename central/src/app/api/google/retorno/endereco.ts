/**
 * O endereço fixo do app: APP_URL, se cadastrado; senão o domínio de produção
 * que a própria Vercel informa (VERCEL_PROJECT_PRODUCTION_URL); por último, o
 * endereço por onde a pessoa chegou.
 *
 * Importa porque o retorno do Google tem de ser idêntico ao cadastrado no
 * Google Cloud, e o endereço longo de cada deploy da Vercel muda a cada vez.
 */
export function enderecoFixo(req: Request): string {
  const cadastrado = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (cadastrado) return cadastrado;
  const daVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (daVercel) return `https://${daVercel}`;
  return new URL(req.url).origin;
}

export function enderecoDeRetorno(req: Request): string {
  return `${enderecoFixo(req)}/api/google/retorno`;
}
