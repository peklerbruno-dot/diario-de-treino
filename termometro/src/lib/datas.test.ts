import { describe, expect, it } from "vitest";
import { dataExiste, mesesDepois } from "./datas";

describe("meses depois", () => {
  it("anda de mês em mês no mesmo dia", () => {
    expect(mesesDepois("2026-01-15", 1)).toBe("2026-02-15");
    expect(mesesDepois("2026-11-15", 3)).toBe("2027-02-15");
  });

  it("o dia 31 desce quando o mês não o tem, sem pular para o mês seguinte", () => {
    expect(mesesDepois("2026-01-31", 1)).toBe("2026-02-28");
    expect(mesesDepois("2026-01-31", 3)).toBe("2026-04-30");
    expect(mesesDepois("2028-01-31", 1)).toBe("2028-02-29"); // bissexto
  });
});

describe("um dia que existe", () => {
  it("aceita o calendário e recusa o que não está nele", () => {
    expect(dataExiste("2026-02-28")).toBe(true);
    expect(dataExiste("2028-02-29")).toBe(true);
    expect(dataExiste("2026-02-31")).toBe(false);
    expect(dataExiste("2026-13-01")).toBe(false);
    expect(dataExiste("")).toBe(false);
    expect(dataExiste("26-01-01")).toBe(false);
  });

  it("um ano fora de 2000–2100 é dedo errado, não data", () => {
    expect(dataExiste("0206-05-10")).toBe(false);
    expect(dataExiste("2999-01-01")).toBe(false);
  });
});
