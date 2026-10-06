import { describe, expect, it } from "vitest";
import { diaEmSaoPaulo, prazoPorExtenso, quando } from "./datas";

const agora = new Date("2026-10-06T23:00:00Z"); // 20h de terça em São Paulo

describe("datas", () => {
  it("usa o dia de São Paulo, não o de Greenwich", () => {
    expect(diaEmSaoPaulo(new Date("2026-10-07T01:30:00Z"))).toBe("2026-10-06");
  });
  it("mostra hora para hoje e 'ontem' para ontem", () => {
    expect(quando(new Date("2026-10-06T13:05:00Z"), agora)).toBe("10:05");
    expect(quando(new Date("2026-10-05T18:45:00Z"), agora)).toBe("ontem");
  });
  it("conta quanto falta para o prazo", () => {
    expect(prazoPorExtenso(new Date("2026-10-06T00:00:00Z"), agora)).toMatchObject({ vencido: false, perto: true });
    expect(prazoPorExtenso(new Date("2026-10-07T00:00:00Z"), agora).texto).toContain("amanhã");
    expect(prazoPorExtenso(new Date("2026-10-04T00:00:00Z"), agora)).toMatchObject({ vencido: true });
    expect(prazoPorExtenso(new Date("2026-10-18T00:00:00Z"), agora).texto).toContain("em 12 dias");
  });
});
