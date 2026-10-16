import { describe, expect, it } from "vitest";
import { emFaixas } from "./faixas";

describe("emFaixas", () => {
  it("eventos separados ficam numa faixa só", () => {
    const r = emFaixas([{ ini: 540, fim: 600 }, { ini: 600, fim: 660 }]);
    expect(r.map((e) => [e.faixa, e.faixas])).toEqual([[0, 1], [0, 1]]);
  });
  it("sobrepostos dividem a largura", () => {
    const r = emFaixas([{ ini: 540, fim: 660 }, { ini: 570, fim: 600 }, { ini: 600, fim: 630 }]);
    expect(r.map((e) => [e.faixa, e.faixas])).toEqual([[0, 2], [1, 2], [1, 2]]);
  });
});
