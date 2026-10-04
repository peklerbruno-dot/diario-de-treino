import { describe, expect, it } from "vitest";
import { diasSeguidos } from "./sequencia";

const cinco = () => 5;
const d = (seguiu: number[]) => seguiu.map((s, i) => ({ dia: `d${i}`, seguiu: s }));

describe("diasSeguidos", () => {
  it("conta os dias bons a partir de ontem quando hoje ainda não fechou", () => {
    expect(diasSeguidos(d([1, 5, 4, 5, 2, 5]), cinco)).toBe(3);
  });

  it("conta hoje quando hoje já fechou os 80%", () => {
    expect(diasSeguidos(d([4, 5, 1]), cinco)).toBe(2);
  });

  it("dia sem refeição no plano não quebra nem conta", () => {
    const total = (dia: string) => (dia === "d2" ? 0 : 5);
    expect(diasSeguidos(d([0, 5, 0, 5, 1]), total)).toBe(2);
  });

  it("zero quando ontem não foi bom", () => {
    expect(diasSeguidos(d([5, 2, 5, 5]), cinco)).toBe(1);
    expect(diasSeguidos(d([0, 2, 5]), cinco)).toBe(0);
  });
});
