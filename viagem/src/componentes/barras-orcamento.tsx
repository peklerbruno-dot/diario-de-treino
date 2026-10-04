import Link from "next/link";
import { formatar } from "@/lib/dinheiro";
import type { Linha } from "@/lib/orcamento";

const COR = { ok: "bg-verde", atencao: "bg-ambar", estourou: "bg-vermelho" } as const;
const PALAVRA = { ok: "", atencao: "atenção", estourou: "passou" } as const;

/** Uma linha de orçamento: nome, gasto de quanto, e a barra — com a palavra escrita, não só a cor. */
export function BarraDeOrcamento({ nome, linha, moeda }: { nome: React.ReactNode; linha: Linha; moeda: string }) {
  const pct = Math.round(linha.fracao * 100);
  return (
    <li className="px-4 py-2.5">
      <div className="flex justify-between gap-2 text-[15px]">
        <span>{nome}</span>
        <span className="tabular-nums">
          {formatar(linha.gasto, moeda)} <span className="text-fosco">de {formatar(linha.limite, moeda)}</span>
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-linha">
          <div className={`h-1.5 rounded-full ${COR[linha.estado]}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <span className={`w-20 text-right text-[12px] font-semibold ${linha.estado === "ok" ? "text-fosco" : linha.estado === "atencao" ? "text-ambar" : "text-vermelho"}`}>
          {pct}%{PALAVRA[linha.estado] && ` · ${PALAVRA[linha.estado]}`}
        </span>
      </div>
    </li>
  );
}

export const LinkDoOrcamento = ({ viagemId, texto }: { viagemId: string; texto: string }) => (
  <Link href={`/v/${viagemId}/contas/orcamento`} className="text-[15px] font-semibold text-realce">{texto}</Link>
);
