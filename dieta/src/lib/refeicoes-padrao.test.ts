import { describe, expect, it } from "vitest";
import { analiseDoPadrao, chaveDaRefeicao, lerPadrao, paraEstaRefeicao, type PadraoParaSalvar, type RefeicaoPadrao } from "./refeicoes-padrao";

const padrao = (p: Partial<RefeicaoPadrao> & { id: string; titulo: string }): RefeicaoPadrao => ({
  refeicao: "",
  itens: "",
  calorias: null,
  proteinas: null,
  carboidratos: null,
  gorduras: null,
  seguePlano: true,
  vezes: 0,
  ...p,
});

const form = (p: Partial<PadraoParaSalvar> = {}): PadraoParaSalvar => ({
  refeicao: "Almoço",
  titulo: "Marmita de frango",
  itens: "",
  calorias: "",
  proteinas: "",
  carboidratos: "",
  gorduras: "",
  seguePlano: true,
  ...p,
});

describe("achar a refeição certa pelo nome", () => {
  it("ignora acento, caixa e espaço sobrando", () => {
    expect(chaveDaRefeicao("  Café  da Manhã ")).toBe("cafe da manha");
    expect(chaveDaRefeicao("cafe da manha")).toBe("cafe da manha");
  });

  it("separa as feitas para a refeição das de qualquer refeição", () => {
    const lista = [
      padrao({ id: "a", titulo: "Ovos", refeicao: "Café da manhã" }),
      padrao({ id: "b", titulo: "Marmita", refeicao: "Almoço" }),
      padrao({ id: "c", titulo: "Fruta", refeicao: "" }),
    ];
    const r = paraEstaRefeicao(lista, "cafe da manha");
    expect(r.dela.map((p) => p.id)).toEqual(["a"]);
    expect(r.gerais.map((p) => p.id)).toEqual(["c"]);
  });

  it("as mais escolhidas primeiro; o nome desempata", () => {
    const lista = [
      padrao({ id: "a", titulo: "Banana", refeicao: "Lanche", vezes: 1 }),
      padrao({ id: "b", titulo: "Iogurte", refeicao: "Lanche", vezes: 5 }),
      padrao({ id: "c", titulo: "Abacate", refeicao: "Lanche", vezes: 1 }),
    ];
    expect(paraEstaRefeicao(lista, "Lanche").dela.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("nenhuma cadastrada: listas vazias", () => {
    expect(paraEstaRefeicao([], "Jantar")).toEqual({ dela: [], gerais: [] });
  });
});

describe("ler o formulário", () => {
  it("o mínimo é o nome", () => {
    const r = lerPadrao(form({ titulo: "   " }));
    expect(r).toEqual({ ok: false, erro: "Dê um nome a esta refeição." });
    expect(lerPadrao(form())).toMatchObject({ ok: true, dados: { titulo: "Marmita de frango", calorias: null, seguePlano: true } });
  });

  it("aceita número com vírgula e arredonda; vazio é sem número", () => {
    const r = lerPadrao(form({ calorias: "450,6", proteinas: "30", carboidratos: "", gorduras: " " }));
    expect(r).toMatchObject({ ok: true, dados: { calorias: 451, proteinas: 30, carboidratos: null, gorduras: null } });
  });

  it("recusa número estragado ou fora do razoável", () => {
    expect(lerPadrao(form({ calorias: "muitas" })).ok).toBe(false);
    expect(lerPadrao(form({ calorias: "-5" })).ok).toBe(false);
    expect(lerPadrao(form({ calorias: "999999" })).ok).toBe(false);
    expect(lerPadrao(form({ proteinas: "abc" })).ok).toBe(false);
  });

  it("limpa espaços e corta nomes e textos longos", () => {
    const r = lerPadrao(form({ titulo: "  Pão   com   ovo  ", refeicao: "  Café da manhã ", itens: "x".repeat(900) }));
    expect(r).toMatchObject({ ok: true, dados: { titulo: "Pão com ovo", refeicao: "Café da manhã" } });
    if (r.ok) expect(r.dados.itens).toHaveLength(600);
  });
});

describe("os números entram na soma do dia", () => {
  it("sem calorias não há análise", () => {
    expect(analiseDoPadrao(padrao({ id: "a", titulo: "Ovos" }))).toBeNull();
  });

  it("com calorias, vira uma análise: dentro do plano → sim, fora → não", () => {
    const base = padrao({ id: "a", titulo: "Marmita", itens: "frango, arroz; salada", calorias: 520, proteinas: 40 });
    const a = analiseDoPadrao(base)!;
    expect(a).toMatchObject({ descricao: "Marmita", calorias: 520, proteinas: 40, carboidratos: 0, gorduras: 0, noPlano: "sim" });
    expect(a.itens.map((i) => i.alimento)).toEqual(["frango", "arroz", "salada"]);
    expect(analiseDoPadrao({ ...base, seguePlano: false })!.noPlano).toBe("nao");
  });
});
