"use client";

import { salvarCambios } from "@/acoes/viagem";
import { Formulario } from "./formulario";
import { Aviso } from "./pecas";
import { LISTA_DE_MOEDAS } from "@/lib/dinheiro";

export function FormularioDeCambio({ viagemId, moedaBase, cambios }: { viagemId: string; moedaBase: string; cambios: Record<string, number> }) {
  return (
    <Formulario acao={salvarCambios} botao="Salvar câmbio">
      {(e) => (
        <>
          {e?.valores?.ok && <Aviso tom="ok">Câmbio salvo.</Aviso>}
          <input type="hidden" name="viagemId" value={viagemId} />
          <p className="text-[14px] text-fosco">Quanto vale 1 unidade de cada moeda em {moedaBase}. É a sugestão para cada despesa nova — dá para ajustar em cada uma.</p>
          {LISTA_DE_MOEDAS.filter((m) => m !== moedaBase).map((m) => (
            <label key={m} className="flex items-center gap-3">
              <span className="w-24 font-medium">1 {m} =</span>
              <input name={`cambio_${m}`} inputMode="decimal" className="campo flex-1 tabular-nums" defaultValue={cambios[m] != null ? String(cambios[m]).replace(".", ",") : ""} />
              <span className="text-fosco">{moedaBase}</span>
            </label>
          ))}
          <button name="buscar" value="1" className="botao-leve w-full">Buscar câmbio de hoje</button>
        </>
      )}
    </Formulario>
  );
}
