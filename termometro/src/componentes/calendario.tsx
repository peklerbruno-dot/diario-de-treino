"use client";

import type { DiaCalculado, MesCalculado } from "@/lib/calculo";
import { diaDaSemana, nomeDoDiaDaSemana } from "@/lib/datas";
import { comCifrao, emReais } from "@/lib/dinheiro";

const CABECALHO = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/**
 * O mês inteiro numa tela só.
 *
 * A lista responde "como o saldo chegou até aqui"; o calendário responde "como
 * é a forma deste mês" — onde estão os dias caros, quanto tempo falta até o
 * salário. Em cada célula cabem os três valores do dia e o saldo do fim dele,
 * que é o que a versão pequena não conseguia mostrar.
 *
 * Os centavos saem daqui: numa célula de 51 px eles roubariam o espaço dos
 * reais, e para bater o olho no mês eles não mudam nada. O dia aberto mostra o
 * valor exato.
 */
export function Calendario({
  mes,
  hoje,
  aoAbrirDia,
}: {
  mes: MesCalculado;
  hoje: string;
  aoAbrirDia: (dia: DiaCalculado) => void;
}) {
  const vaziosAntes = diaDaSemana(mes.dias[0].data);

  return (
    <div className="rounded-cartao bg-cartao p-2 shadow-cartao">
      <div className="grid grid-cols-7 gap-[3px]">
        {CABECALHO.map((d) => (
          <div key={d} className="pb-1 text-center text-[10px] text-fosco">
            {d}
          </div>
        ))}

        {Array.from({ length: vaziosAntes }, (_, i) => (
          <div key={`vazio-${i}`} />
        ))}

        {mes.dias.map((dia) => {
          const ehHoje = dia.data === hoje;
          const futuro = dia.data > hoje;
          return (
            <button
              key={dia.data}
              type="button"
              onClick={() => aoAbrirDia(dia)}
              aria-label={`Dia ${dia.dia}, ${nomeDoDiaDaSemana(dia.data)}. Saldo ${comCifrao(
                dia.saldoCents,
              )}.`}
              className={`relative h-[92px] overflow-hidden rounded-[11px] px-1 pb-1 pt-1.5 text-left ${
                ehHoje ? "bg-saldo/10 ring-[1.5px] ring-saldo" : "bg-papel"
              }`}
            >
              <span
                className={`block text-[12.5px] ${
                  ehHoje ? "font-bold" : futuro ? "text-fosco" : "font-medium"
                }`}
              >
                {dia.dia}
              </span>

              <span className={`tabular mt-0.5 block leading-[1.35] ${futuro ? "opacity-60" : ""}`}>
                {dia.entradaCents > 0 && (
                  <span className="block text-[9.5px] text-entrada">
                    +{emReais(dia.entradaCents).split(",")[0]}
                  </span>
                )}
                {dia.saidaCents > 0 && (
                  <span className="block text-[9.5px] text-saida">
                    −{emReais(dia.saidaCents).split(",")[0]}
                  </span>
                )}
                {dia.diarioCents > 0 && (
                  <span className="block text-[9.5px] text-diario">
                    −{emReais(dia.diarioCents).split(",")[0]}
                  </span>
                )}
              </span>

              <span
                className={`tabular absolute inset-x-1 bottom-1 text-right text-[11px] font-semibold ${
                  dia.saldoCents < 0 ? "text-atencao" : futuro ? "text-grafite" : ""
                }`}
              >
                {emReais(dia.saldoCents).split(",")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
