import type { Cor } from "@/lib/padroes";

/** A cor de cada dia, a mesma no calendário, no relatório e na página do dia. */
export const FUNDO: Record<Cor, string> = {
  bom: "bg-folha text-sobre-cor",
  parcial: "bg-troca text-sobre-cor",
  ruim: "bg-pulou text-sobre-cor",
  "so-agua": "bg-regua text-tinta",
  vazio: "bg-papel text-fosco",
};

export const LEGENDA: { cor: Cor; rotulo: string }[] = [
  { cor: "bom", rotulo: "80%+ no plano" },
  { cor: "parcial", rotulo: "metade ou mais" },
  { cor: "ruim", rotulo: "menos da metade" },
  { cor: "so-agua", rotulo: "sem refeição marcada" },
];

export const ESTADO = {
  seguiu: { rotulo: "Segui", cor: "bg-folha-clara text-folha", ponto: "bg-folha" },
  trocou: { rotulo: "Troquei", cor: "bg-troca-clara text-troca", ponto: "bg-troca" },
  pulou: { rotulo: "Pulei", cor: "bg-pulou-clara text-pulou", ponto: "bg-pulou" },
} as Record<string, { rotulo: string; cor: string; ponto: string }>;
