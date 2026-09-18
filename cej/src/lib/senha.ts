import "server-only";
import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const derivar = promisify(scrypt) as (
  senha: string,
  sal: Buffer,
  tamanho: number,
) => Promise<Buffer>;

/**
 * Senha guardada como "sal:derivada", em hexadecimal.
 *
 * `scrypt` em vez de um hash comum porque um hash comum é rápido — e rapidez,
 * aqui, é do atacante. O scrypt é deliberadamente lento e come memória, que é o
 * que torna caro testar milhões de senhas contra o que vazou.
 *
 * Vem do próprio Node, sem dependência nenhuma a instalar, atualizar ou
 * auditar. Para um sistema de equipe é a troca certa.
 */
const TAMANHO = 64;

export async function guardarSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const derivada = await derivar(senha, sal, TAMANHO);
  return `${sal.toString("hex")}:${derivada.toString("hex")}`;
}

export async function senhaConfere(senha: string, guardada: string | null): Promise<boolean> {
  if (!guardada) return false;
  const [salHex, esperadaHex] = guardada.split(":");
  if (!salHex || !esperadaHex) return false;

  const esperada = Buffer.from(esperadaHex, "hex");
  const derivada = await derivar(senha, Buffer.from(salHex, "hex"), esperada.length);
  // Comparação em tempo constante: o relógio não conta quantos bytes bateram.
  return derivada.length === esperada.length && timingSafeEqual(derivada, esperada);
}

/**
 * O convite de primeiro acesso é guardado com hash, como a senha.
 *
 * Um convite em aberto vale exatamente o que a senha que ele cria vale: quem o
 * tivesse em mãos entraria como a pessoa. Guardá-lo em claro no banco seria
 * deixar uma cópia da chave debaixo do tapete.
 *
 * Aqui basta SHA-256, sem scrypt: o convite tem 32 bytes de acaso, e não há
 * dicionário de palavras comuns que o alcance.
 */
export const marcarConvite = (convite: string) =>
  createHash("sha256").update(convite).digest("hex");

/** A senha serve? A regra é curta de propósito — regra longa vira post-it. */
export function senhaFraca(senha: string): string | null {
  if (senha.length < 10) return "A senha precisa de pelo menos 10 letras ou números.";
  if (/^\d+$/.test(senha)) return "Uma senha só de números é fácil demais de adivinhar.";
  return null;
}
