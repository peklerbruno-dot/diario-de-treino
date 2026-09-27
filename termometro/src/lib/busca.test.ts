import { describe, expect, it } from "vitest";
import { buscarLancamentos, categoriaPelaNota } from "./busca";
import type { Categoria } from "./categorias";
import type { Lancamento } from "./tipos";

let n = 0;
const l = (data: string, nota: string | null, categoria: string | null = null): Lancamento => ({
  id: `id-${++n}`,
  data,
  tipo: "DIARIO",
  valorCents: 1000,
  nota,
  categoria,
});

const categorias: Categoria[] = [{ id: "saude", nome: "Saúde", tipos: ["DIARIO"] }];

describe("a busca", () => {
  it("acha pela nota, sem acento e sem maiúscula", () => {
    const achados = buscarLancamentos([l("2026-01-05", "Café da manhã")], categorias, "cafe");
    expect(achados).toHaveLength(1);
  });

  it("acha pelo nome da categoria", () => {
    const achados = buscarLancamentos([l("2026-01-05", null, "saude")], categorias, "saúde");
    expect(achados).toHaveLength(1);
  });

  it("mais recente primeiro, apagado fica de fora, uma letra não busca", () => {
    const velho = l("2026-01-05", "seguro");
    const novo = l("2026-08-10", "seguro do carro");
    const morto = { ...l("2026-09-01", "seguro"), apagadoEm: "2026-09-02T00:00:00.000Z" };
    const achados = buscarLancamentos([velho, morto, novo], categorias, "seguro");
    expect(achados.map((x) => x.data)).toEqual(["2026-08-10", "2026-01-05"]);
    expect(buscarLancamentos([velho], categorias, "s")).toEqual([]);
  });
});

describe("a categoria que a nota levou da última vez", () => {
  it("vem do lançamento mais recente com a mesma nota", () => {
    const historia = [
      l("2026-01-05", "ifood", "mercado"),
      l("2026-08-10", "ifood", "comida"),
      l("2026-05-01", "IFOOD ", "lazer"),
    ];
    expect(categoriaPelaNota(historia, "ifood")).toBe("comida");
  });

  it("nota nunca vista, sem sugestão", () => {
    expect(categoriaPelaNota([l("2026-01-05", "ifood", "comida")], "uber")).toBeNull();
  });
});
