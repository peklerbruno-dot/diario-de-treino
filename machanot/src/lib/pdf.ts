/**
 * Fase 5 — PDF da tabela de preços, para mandar no grupo dos pais.
 * O jsPDF só é carregado quando alguém clica em baixar.
 */
import type { Resultado } from "@/lib/calculo";
import type { EstadoMachane } from "@/lib/estado";
import { linhasDaGrade } from "@/lib/divulgacao";
import { dataCurta, reais } from "@/lib/dinheiro";

export async function baixarPdfDePrecos(e: EstadoMachane, r: Resultado): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const margem = 48;
  const largura = doc.internal.pageSize.getWidth() - margem * 2;
  let y = margem + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(e.nome, margem, y);

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  const periodo =
    e.dataInicio && e.dataFim
      ? `${dataCurta(e.dataInicio)} a ${dataCurta(e.dataFim)}`
      : String(e.ano);
  doc.text(
    `${periodo}  ·  grandes ${e.diasGrandes} dias  ·  pequenos/babys ${e.diasPequenos} dias`,
    margem,
    y,
  );

  y += 26;

  const colunas = [
    { rotulo: "", x: margem, largura: largura * 0.32 },
    { rotulo: "grandes", x: margem + largura * 0.32, largura: largura * 0.17 },
    { rotulo: "grandes 2ª leva", x: margem + largura * 0.49, largura: largura * 0.17 },
    { rotulo: "pequenos", x: margem + largura * 0.66, largura: largura * 0.17 },
    { rotulo: "pequenos 2ª leva", x: margem + largura * 0.83, largura: largura * 0.17 },
  ];

  const direita = (texto: string, x: number, w: number, yy: number) =>
    doc.text(texto, x + w - 4, yy, { align: "right" });

  doc.setTextColor(60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  for (const c of colunas.slice(1)) direita(c.rotulo, c.x, c.largura, y);
  y += 6;
  doc.setDrawColor(200);
  doc.line(margem, y, margem + largura, y);
  y += 16;

  doc.setFontSize(10);
  for (const [chave, rotulo] of linhasDaGrade) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30);
    doc.text(rotulo, margem, y);
    const valores = [
      r.precosGrandes[chave],
      r.segundaLevaGrandes[chave],
      r.precosPequenos[chave],
      r.segundaLevaPequenos[chave],
    ];
    valores.forEach((v, i) => {
      const col = colunas[i + 1]!;
      direita(`R$ ${reais(v)}`, col.x, col.largura, y);
    });
    y += 18;
  }

  y += 6;
  doc.setDrawColor(220);
  doc.line(margem, y, margem + largura, y);
  y += 20;

  doc.setFontSize(9);
  doc.setTextColor(110);
  const rodape = [
    `A segunda leva (inscrição tardia) soma R$ ${reais(
      e.politica.acrescimoSegundaLevaCents,
    )} a qualquer uma das linhas acima.`,
    "Bolsas: o movimento mantém um fundo para quem precisa. Procure a coordenação —",
    "ninguém deixa de ir à machané por dinheiro.",
  ];
  for (const linha of rodape) {
    doc.text(linha, margem, y);
    y += 13;
  }

  const nome = `precos-${e.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
  doc.save(nome);
}
