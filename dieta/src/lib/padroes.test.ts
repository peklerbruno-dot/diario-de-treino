import { describe, expect, it } from "vitest";
import { corDoDia, duracao, padroes, resumir, semanasDoMes, somarMeses, ultimoDiaDoMes, type DiaParaPadrao } from "./padroes";
import { somarDias } from "./datas";

const dia = (d: string, registros: DiaParaPadrao["registros"], extra: Partial<DiaParaPadrao> = {}): DiaParaPadrao => ({
  dia: d,
  seguiu: registros.filter((r) => r.estado === "seguiu").length,
  trocou: registros.filter((r) => r.estado === "trocou").length,
  pulou: registros.filter((r) => r.estado === "pulou").length,
  agua: 0,
  calorias: 0,
  fotos: [],
  registros,
  ...extra,
});
const reg = (nome: string, horario: string, estado: string, hora = "", humor = "") => ({ nome, horario, estado, nota: "", humor, hora });

describe("calendário", () => {
  it("monta as semanas de outubro de 2026 (começa numa quinta)", () => {
    const s = semanasDoMes("2026-10");
    expect(s[0]).toEqual([null, null, null, null, "2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(s.at(-1)).toEqual(["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"]);
    expect(s.every((l) => l.length === 7)).toBe(true);
  });
  it("soma meses atravessando o ano", () => {
    expect(somarMeses("2026-12", 1)).toBe("2027-01");
    expect(somarMeses("2026-01", -1)).toBe("2025-12");
    expect(ultimoDiaDoMes("2028-02")).toBe("2028-02-29");
  });
  it("pinta o dia pela fração seguida", () => {
    expect(corDoDia({ seguiu: 4, trocou: 1, pulou: 0, agua: 0, fotos: [] })).toBe("bom");
    expect(corDoDia({ seguiu: 2, trocou: 1, pulou: 1, agua: 0, fotos: [] })).toBe("parcial");
    expect(corDoDia({ seguiu: 1, trocou: 0, pulou: 3, agua: 0, fotos: [] })).toBe("ruim");
    expect(corDoDia({ seguiu: 0, trocou: 0, pulou: 0, agua: 500, fotos: [] })).toBe("so-agua");
    expect(corDoDia({ seguiu: 0, trocou: 0, pulou: 0, agua: 0, fotos: [] })).toBe("vazio");
  });
});

describe("resumo", () => {
  it("ignora os dias vazios nas médias", () => {
    const r = resumir(
      [dia("2026-10-01", [reg("Almoço", "12:30", "seguiu")], { agua: 2000, calorias: 1800 }), dia("2026-10-02", [])],
      2000,
    );
    expect(r).toMatchObject({ diasUsados: 1, diasBons: 1, mediaAgua: 2000, diasNaMetaDeAgua: 1, mediaKcal: 1800 });
  });
});

describe("padrões", () => {
  it("acha o almoço atrasado pela hora da foto e da marcação", () => {
    const dias = ["2026-10-01", "2026-10-02", "2026-10-03"].map((d, i) =>
      dia(d, [reg("Almoço", "12:30", "seguiu", i === 0 ? "" : "13:40")], i === 0 ? { fotos: [{ nome: "Almoço", hora: "13:30" }] } : {}),
    );
    const p = padroes(dias);
    expect(p[0].texto).toContain("Almoço: costuma acontecer 1h10 depois");
    expect(p[0].texto).toContain("~13h40");
  });
  it("não chama de atraso marcar o café de noite", () => {
    const dias = ["2026-10-01", "2026-10-02", "2026-10-03"].map((d) => dia(d, [reg("Café", "07:00", "seguiu", "21:00")]));
    expect(padroes(dias)).toEqual([]);
  });
  it("aponta a refeição mais pulada e a da fome", () => {
    const dias = [1, 2, 3, 4].map((n) =>
      dia(`2026-10-0${n}`, [reg("Lanche", "16:00", n % 2 ? "pulou" : "seguiu"), reg("Jantar", "20:00", "seguiu", "", n < 3 ? "mal" : "bem")]),
    );
    const textos = padroes(dias).map((p) => p.texto);
    expect(textos).toContain("Lanche: pulado em 2 de 4 dias.");
    expect(textos).toContain("Jantar: 2 vezes com fome demais ou ansiedade.");
  });
  it("acha o dia da semana difícil", () => {
    const dias: DiaParaPadrao[] = [];
    // 3 semanas a partir de domingo, 4/10/2026; sábado ruim.
    for (let i = 0; i < 21; i++) {
      const d = somarDias("2026-10-04", i);
      const sabado = i % 7 === 6;
      dias.push(dia(d, [reg("Almoço", "12:30", sabado ? "pulou" : "seguiu"), reg("Jantar", "20:00", sabado ? "trocou" : "seguiu")]));
    }
    expect(padroes(dias).map((p) => p.texto)).toContain("Sábados são o dia mais difícil: 0% no plano, contra 100% no resto da semana.");
  });
  it("formata durações", () => {
    expect(duracao(40)).toBe("40 min");
    expect(duracao(-60)).toBe("1h");
    expect(duracao(77)).toBe("1h15");
  });
});
