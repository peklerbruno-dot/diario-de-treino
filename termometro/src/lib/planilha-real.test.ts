/**
 * Conferência contra a planilha de verdade.
 *
 * A planilha tem dinheiro real dentro, e este repositório é público: o arquivo
 * não mora aqui. Este teste só roda quando alguém aponta para ele:
 *
 *     PLANILHA=~/Downloads/Termometro.xlsx npm test
 *
 * Sem a variável, ele é pulado — e é assim que deve ser numa máquina qualquer.
 *
 * O que ele verifica é a única coisa que importa numa importação: o app chega
 * nos mesmos números que a planilha mostrava, mês a mês, do primeiro dia ao
 * último.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { calcularAno } from "./calculo";
import { lerPlanilha } from "./planilha";

const caminho = process.env.PLANILHA;
const temArquivo = !!caminho && existsSync(caminho);
const aba = process.env.PLANILHA_ABA;

// A planilha guardava frações de centavo (uma entrada era "=D11*0,4", que dá
// R$ 339,336). Ao virar dinheiro de verdade cada valor é arredondado, e a
// diferença acumulada no ano fica na casa dos centavos.
const TOLERANCIA_CENTAVOS = 20;

/** Sem o arquivo apontado, nem chega a ser lido: o teste inteiro é pulado. */
function abrir() {
  const pasta = XLSX.read(readFileSync(caminho!), { type: "buffer", cellFormula: true });
  const lida = lerPlanilha(pasta, { aba });
  const calculado = calcularAno({
    ano: lida.ano,
    lancamentos: lida.lancamentos,
    ajustes: { saldoInicialCents: lida.saldoInicialCents, rateioAptoPercent: 40 },
  });
  return { lida, calculado };
}

describe.skipIf(!temArquivo)("a planilha de verdade", () => {
  const { lida, calculado } = temArquivo
    ? abrir()
    : ({ lida: null, calculado: null } as unknown as ReturnType<typeof abrir>);

  it("traz lançamento de todos os doze meses", () => {
    expect(lida.resumoPorMes).toHaveLength(12);
    expect(lida.lancamentos.length).toBeGreaterThan(300);
  });

  it.each(Array.from({ length: 12 }, (_, i) => i + 1))(
    "fecha o mês %i com o mesmo saldo da planilha",
    (mes) => {
      const naPlanilha = lida.resumoPorMes[mes - 1];
      const noApp = calculado.meses[mes - 1].totais;

      expect(noApp.entradasCents).toBe(naPlanilha.entradasCents);
      expect(noApp.saidasCents).toBe(naPlanilha.saidasCents);
      expect(noApp.diarioCents).toBe(naPlanilha.diarioCents);
      expect(
        Math.abs(noApp.saldoFechamentoCents - naPlanilha.saldoFinalDaPlanilhaCents),
      ).toBeLessThanOrEqual(TOLERANCIA_CENTAVOS);
    },
  );
});
