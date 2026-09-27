import type { Categoria } from "./categorias";
import type { Lancamento } from "./tipos";

/**
 * A busca: um filtro sobre o que já está no aparelho.
 *
 * "Quando foi a última vez que paguei o seguro?" era uma pergunta sem resposta
 * no app — a resposta existia, espalhada por dezessete meses de telas. A busca
 * olha a nota e o nome da categoria, sem ligar para acento nem maiúscula, e
 * devolve do mais recente para o mais antigo, que é como a memória pergunta.
 */
const achatar = (t: string): string => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function buscarLancamentos(
  lancamentos: readonly Lancamento[],
  categorias: readonly Categoria[],
  termo: string,
  limite = 80,
): Lancamento[] {
  const alvo = achatar(termo);
  if (alvo.length < 2) return [];

  const nomeDe = new Map(categorias.map((c) => [c.id, achatar(c.nome)]));

  return lancamentos
    .filter((l) => !l.apagadoEm)
    .filter((l) => {
      if (l.nota && achatar(l.nota).includes(alvo)) return true;
      if (l.categoria) {
        const nome = nomeDe.get(l.categoria) ?? achatar(l.categoria);
        if (nome.includes(alvo)) return true;
      }
      return false;
    })
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, limite);
}

/**
 * A categoria que esta nota levou da última vez.
 *
 * Quem escreve "ifood" pela quadragésima vez já disse quarenta vezes que é
 * Comida. A sugestão vem do lançamento mais recente com a mesma nota (achatada)
 * que tenha categoria — e é só sugestão: a tela oferece, nunca escolhe sozinha.
 */
export function categoriaPelaNota(lancamentos: readonly Lancamento[], nota: string): string | null {
  const alvo = achatar(nota);
  if (alvo.length < 2) return null;

  let melhor: Lancamento | null = null;
  for (const l of lancamentos) {
    if (l.apagadoEm || !l.categoria || !l.nota) continue;
    if (achatar(l.nota) !== alvo) continue;
    if (!melhor || l.data > melhor.data) melhor = l;
  }
  return melhor?.categoria ?? null;
}
