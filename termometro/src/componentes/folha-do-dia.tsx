"use client";

import { useState } from "react";
import type { DiaCalculado } from "@/lib/calculo";
import { nomeDoDiaDaSemana, porExtenso } from "@/lib/datas";
import { loja } from "@/lib/loja";
import { NOME_DO_TIPO, type Lancamento, type Tipo } from "@/lib/tipos";
import { FolhaDeLancamento } from "./folha-de-lancamento";
import { Botao, Dinheiro, Folha } from "./pecas";

/** O que aconteceu num dia, e o que dá para fazer com isso. */
export function FolhaDoDia({ dia, aoFechar }: { dia: DiaCalculado; aoFechar: () => void }) {
  const [editando, setEditando] = useState<Lancamento | null>(null);
  const [novo, setNovo] = useState<Tipo | null>(null);

  if (editando) {
    return (
      <FolhaDeLancamento
        data={dia.data}
        lancamento={editando}
        aoFechar={() => setEditando(null)}
      />
    );
  }
  if (novo) {
    return <FolhaDeLancamento data={dia.data} tipoInicial={novo} aoFechar={() => setNovo(null)} />;
  }

  return (
    <Folha titulo={`${dia.dia} · ${nomeDoDiaDaSemana(dia.data)}`} aoFechar={aoFechar}>
      <p className="-mt-2 mb-3 text-[13px] text-fosco">{porExtenso(dia.data)}</p>

      {dia.lancamentos.length === 0 ? (
        <p className="py-2 text-[15px] text-grafite">Nada lançado neste dia.</p>
      ) : (
        <ul className="mb-2">
          {dia.lancamentos.map((l) => (
            <li key={l.id} className="border-b border-reguafina">
              <div className="py-2.5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditando(l)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <Dinheiro
                      cents={l.valorCents}
                      papel={
                        l.tipo === "ENTRADA" ? "entrada" : l.tipo === "SAIDA" ? "saida" : "diario"
                      }
                      tamanho="grande"
                    />
                    <span className="ml-2 text-[15px] text-grafite">
                      {l.nota || NOME_DO_TIPO[l.tipo]}
                    </span>
                  </button>

                  {l.previsto && (
                    <Botao
                      onClick={() => loja.confirmarLancamento(l.id)}
                      className="shrink-0 !px-3 !text-[15px]"
                    >
                      Aconteceu
                    </Botao>
                  )}
                </div>
                <p className="mt-0.5 text-[13px] text-fosco">
                  {[
                    l.nota ? NOME_DO_TIPO[l.tipo] : null,
                    l.previsto ? "previsto" : null,
                    l.rendaPropria ? "dinheiro seu" : null,
                    l.investimento ? "investimento" : null,
                    l.apartamento ? "apartamento" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-baseline justify-between border-t border-regua pt-3">
        <span className="text-[15px] text-grafite">Saldo no fim do dia</span>
        <Dinheiro cents={dia.saldoCents} papel="saldo" tamanho="grande" />
      </div>

      <div className="mt-4 flex gap-2">
        <Botao onClick={() => setNovo("ENTRADA")} className="flex-1">
          + Entrada
        </Botao>
        <Botao onClick={() => setNovo("SAIDA")} className="flex-1">
          + Saída
        </Botao>
        <Botao onClick={() => setNovo("DIARIO")} className="flex-1">
          + Diário
        </Botao>
      </div>
    </Folha>
  );
}
