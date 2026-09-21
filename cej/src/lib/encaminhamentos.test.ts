import { describe, expect, it } from "vitest";
import { agrupar, quantosPedemAtencao, urgenciaDe, urgenciaVisivel } from "./encaminhamentos";

const HOJE = "2026-06-10";
const item = (prazo: string | null, estado: "ABERTO" | "FEITO" | "CANCELADO" = "ABERTO") => ({
  prazo,
  estado,
});

describe("urgência", () => {
  it("separa atrasado, hoje, a semana e o resto", () => {
    expect(urgenciaDe(item("2026-06-09"), HOJE)).toBe("VENCIDO");
    expect(urgenciaDe(item("2026-06-10"), HOJE)).toBe("HOJE");
    expect(urgenciaDe(item("2026-06-17"), HOJE)).toBe("ESTA_SEMANA");
    expect(urgenciaDe(item("2026-06-18"), HOJE)).toBe("DEPOIS");
    expect(urgenciaDe(item(null), HOJE)).toBe("SEM_PRAZO");
  });

  it("não deixa o que já foi feito aparecer como atrasado", () => {
    expect(urgenciaVisivel(item("2026-01-01", "FEITO"), HOJE)).toBeNull();
    expect(urgenciaVisivel(item("2026-01-01", "CANCELADO"), HOJE)).toBeNull();
    expect(urgenciaVisivel(item("2026-01-01", "ABERTO"), HOJE)).toBe("VENCIDO");
  });
});

describe("agrupar para a tela", () => {
  it("põe as caixas na ordem da urgência e deixa 'sem prazo' por último", () => {
    const caixas = agrupar(
      [item(null), item("2026-06-20"), item("2026-06-01"), item("2026-06-10")],
      HOJE,
    );
    expect(caixas.map((c) => c.urgencia)).toEqual(["VENCIDO", "HOJE", "DEPOIS", "SEM_PRAZO"]);
  });

  it("não devolve caixa vazia — a tela não deveria ter que filtrar de novo", () => {
    const caixas = agrupar([item("2026-06-20")], HOJE);
    expect(caixas).toHaveLength(1);
    expect(caixas[0].urgencia).toBe("DEPOIS");
  });

  it("dentro da caixa, o prazo mais próximo primeiro", () => {
    const caixas = agrupar([item("2026-06-05"), item("2026-06-01"), item("2026-06-03")], HOJE);
    expect(caixas[0].itens.map((i) => i.prazo)).toEqual([
      "2026-06-01", "2026-06-03", "2026-06-05",
    ]);
  });
});

describe("o número na aba", () => {
  it("conta só o que está aberto e já bateu o prazo", () => {
    const lista = [
      item("2026-06-01"),           // atrasado
      item("2026-06-10"),           // hoje
      item("2026-06-30"),           // adiante
      item(null),                   // sem prazo
      item("2026-06-01", "FEITO"),  // atrasado mas resolvido
    ];
    expect(quantosPedemAtencao(lista, HOJE)).toBe(2);
  });
});
