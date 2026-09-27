import { describe, expect, it } from "vitest";
import { lerBackup } from "./backup";

const backupBom = JSON.stringify({
  gerado: "2026-09-27T00:00:00.000Z",
  lancamentos: [
    { id: "a", data: "2026-01-05", tipo: "DIARIO", valorCents: 3800 },
    { id: "b", data: "2026-01-06", tipo: "ENTRADA", valorCents: 100000, apagadoEm: null },
  ],
  fixos: [{ id: "f1", tipo: "SAIDA", dia: 10, valorCents: 90000 }],
  ajustes: { "saldoInicial:2026": { valor: "202300", atualizadoEm: "2026-01-01T00:00:00.000Z" } },
});

describe("ler o backup de volta", () => {
  it("devolve lançamentos, fixos e ajustes", () => {
    const lido = lerBackup(backupBom);
    if ("erro" in lido) throw new Error(lido.erro);
    expect(lido.lancamentos).toHaveLength(2);
    expect(lido.fixos).toHaveLength(1);
    expect(lido.ajustes).toEqual([{ chave: "saldoInicial:2026", valor: "202300" }]);
    expect(lido.ignoradas).toBe(0);
  });

  it("linha quebrada é ignorada e contada, o resto volta", () => {
    const meio = JSON.parse(backupBom);
    meio.lancamentos.push({ id: "", data: "quando?", tipo: "PIX", valorCents: "muito" });
    const lido = lerBackup(JSON.stringify(meio));
    if ("erro" in lido) throw new Error(lido.erro);
    expect(lido.lancamentos).toHaveLength(2);
    expect(lido.ignoradas).toBe(1);
  });

  it("arquivo que não é backup recusa com frase de gente", () => {
    expect(lerBackup("isto não é json")).toHaveProperty("erro");
    expect(lerBackup('{"foto":"da praia"}')).toHaveProperty("erro");
    expect(lerBackup('{"lancamentos":[],"fixos":[]}')).toHaveProperty("erro");
  });
});
