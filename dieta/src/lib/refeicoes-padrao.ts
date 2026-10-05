import type { Analise } from "./analise";

/**
 * As refeições que você repete, para escolher num toque.
 *
 * O plano da nutricionista diz o que comer; estas dizem o que você de fato
 * come. Quem registra "Marmita de frango" ao meio-dia não precisa escrever de
 * novo, e quem tem três cafés da manhã habituais escolhe qual foi o de hoje.
 *
 * Tudo aqui é função pura — o banco e a tela só chamam.
 */

export type RefeicaoPadrao = {
  id: string;
  /** O nome da refeição em que aparece ("Almoço"). Vazio = qualquer refeição. */
  refeicao: string;
  titulo: string;
  itens: string;
  calorias: number | null;
  proteinas: number | null;
  carboidratos: number | null;
  gorduras: number | null;
  /** Dentro do plano → "segui"; fora → "troquei". */
  seguePlano: boolean;
  vezes: number;
};

/** O que a tela manda ao salvar: tudo como texto, do jeito que sai do campo. */
export type PadraoParaSalvar = {
  refeicao: string;
  titulo: string;
  itens: string;
  calorias: string;
  proteinas: string;
  carboidratos: string;
  gorduras: string;
  seguePlano: boolean;
};

/**
 * "Café da manhã" e "café da manha " são a mesma refeição. É assim que a
 * refeição padrão encontra a refeição do plano, mesmo depois de um plano novo
 * ou de alguém digitar sem acento.
 */
export function chaveDaRefeicao(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * As refeições padrão que cabem numa refeição do plano: primeiro as feitas
 * para ela, depois as de "qualquer refeição". Dentro de cada grupo, as mais
 * escolhidas vêm primeiro e o nome desempata, para a lista não dançar.
 */
export function paraEstaRefeicao(lista: readonly RefeicaoPadrao[], nomeDaRefeicao: string) {
  const chave = chaveDaRefeicao(nomeDaRefeicao);
  const ordem = (a: RefeicaoPadrao, b: RefeicaoPadrao) =>
    b.vezes - a.vezes || a.titulo.localeCompare(b.titulo, "pt-BR");
  return {
    dela: lista.filter((p) => p.refeicao !== "" && chaveDaRefeicao(p.refeicao) === chave).sort(ordem),
    gerais: lista.filter((p) => p.refeicao === "").sort(ordem),
  };
}

/** Número opcional de um campo: vazio vale "sem número", lixo vale erro. */
function numeroOpcional(texto: string, max: number): { ok: true; valor: number | null } | { ok: false } {
  const limpo = texto.trim().replace(",", ".");
  if (limpo === "") return { ok: true, valor: null };
  const n = Number(limpo);
  if (!Number.isFinite(n) || n < 0 || n > max) return { ok: false };
  return { ok: true, valor: Math.round(n) };
}

export type PadraoLido = Omit<RefeicaoPadrao, "id" | "vezes">;

/** O formulário → o que vai para o banco, ou o motivo de não poder. */
export function lerPadrao(bruto: PadraoParaSalvar): { ok: true; dados: PadraoLido } | { ok: false; erro: string } {
  const titulo = bruto.titulo.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!titulo) return { ok: false, erro: "Dê um nome a esta refeição." };

  const calorias = numeroOpcional(bruto.calorias, 5000);
  const proteinas = numeroOpcional(bruto.proteinas, 500);
  const carboidratos = numeroOpcional(bruto.carboidratos, 800);
  const gorduras = numeroOpcional(bruto.gorduras, 400);
  if (!calorias.ok) return { ok: false, erro: "As calorias precisam ser um número, como 450." };
  if (!proteinas.ok || !carboidratos.ok || !gorduras.ok) {
    return { ok: false, erro: "Proteínas, carboidratos e gorduras precisam ser números em gramas, como 30." };
  }

  return {
    ok: true,
    dados: {
      refeicao: bruto.refeicao.replace(/\s+/g, " ").trim().slice(0, 60),
      titulo,
      itens: bruto.itens.trim().slice(0, 600),
      calorias: calorias.valor,
      proteinas: proteinas.valor,
      carboidratos: carboidratos.valor,
      gorduras: gorduras.valor,
      seguePlano: bruto.seguePlano,
    },
  };
}

/**
 * Os números da refeição padrão no formato da leitura da foto, para entrarem
 * na soma do dia junto com as fotos. Sem calorias não há o que somar: nulo.
 * Proteínas, carboidratos e gorduras que ficaram em branco contam zero.
 */
export function analiseDoPadrao(p: Pick<RefeicaoPadrao, "titulo" | "itens" | "calorias" | "proteinas" | "carboidratos" | "gorduras" | "seguePlano">): Analise | null {
  if (p.calorias === null) return null;
  return {
    descricao: p.titulo,
    itens: p.itens
      ? p.itens
          .split(/[,\n;]+/)
          .map((i) => i.trim())
          .filter(Boolean)
          .slice(0, 20)
          .map((alimento) => ({ alimento: alimento.slice(0, 80), quantidade: "" }))
      : [],
    calorias: p.calorias,
    proteinas: p.proteinas ?? 0,
    carboidratos: p.carboidratos ?? 0,
    gorduras: p.gorduras ?? 0,
    noPlano: p.seguePlano ? "sim" : "nao",
    comentario: "Refeição padrão: os números são os que você cadastrou.",
  };
}
