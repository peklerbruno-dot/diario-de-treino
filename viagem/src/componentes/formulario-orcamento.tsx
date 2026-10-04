"use client";

import { salvarOrcamento } from "@/acoes/orcamento";
import { CATEGORIAS_DE_DESPESA } from "@/lib/contas";
import { paraCampo } from "@/lib/dinheiro";
import type { Orcamento } from "@/lib/orcamento";
import { Formulario } from "./formulario";
import { Aviso } from "./pecas";

export function FormularioDeOrcamento({ viagemId, orcamento, moeda }: { viagemId: string; orcamento: Orcamento; moeda: string }) {
  const v = (n?: number) => (n ? paraCampo(n) : "");
  return (
    <Formulario acao={salvarOrcamento} botao="Salvar orçamento">
      {(e) => (
        <>
          {e?.valores?.ok && <Aviso tom="ok">Orçamento salvo.</Aviso>}
          <input type="hidden" name="viagemId" value={viagemId} />
          <p className="text-[14px] text-fosco">Em {moeda}. Deixe vazio o que não quiser acompanhar. A partir de 80% o app avisa.</p>
          <label className="block">
            <span className="rotulo">Total do grupo</span>
            <input name="total" inputMode="decimal" className="campo tabular-nums" defaultValue={v(orcamento.total)} placeholder="20.000,00" />
          </label>
          <label className="block">
            <span className="rotulo">Por pessoa (o que cada um consome)</span>
            <input name="porPessoa" inputMode="decimal" className="campo tabular-nums" defaultValue={v(orcamento.porPessoa)} placeholder="5.000,00" />
          </label>
          <fieldset className="space-y-2">
            <legend className="rotulo">Por categoria (do grupo)</legend>
            {CATEGORIAS_DE_DESPESA.map((c) => (
              <label key={c.valor} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-[15px]">{c.emoji} {c.nome}</span>
                <input name={`cat_${c.valor}`} inputMode="decimal" className="campo flex-1 py-2 tabular-nums" defaultValue={v(orcamento.categorias?.[c.valor])} />
              </label>
            ))}
          </fieldset>
        </>
      )}
    </Formulario>
  );
}
