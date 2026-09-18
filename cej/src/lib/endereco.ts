import "server-only";
import { headers } from "next/headers";

/**
 * O endereço em que este sistema está no ar, montado a partir do pedido.
 *
 * Existe porque o calendário precisa de um endereço **completo**: o Google
 * Agenda pede uma URL de verdade para assinar, e "/api/agenda/..." não é uma.
 *
 * Ler do pedido em vez de guardar numa variável de ambiente evita a armadilha
 * clássica — a variável apontando para o endereço de produção enquanto alguém
 * testa na pré-visualização, e o link copiado levando ao lugar errado sem dar
 * nenhum sinal.
 */
export async function enderecoDoSistema(): Promise<string> {
  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host") ?? "localhost:3000";
  const protocolo =
    cabecalhos.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}
