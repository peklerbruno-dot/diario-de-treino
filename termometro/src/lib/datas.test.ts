import { describe, expect, it } from "vitest";
import { mesesDepois } from "./datas";

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
