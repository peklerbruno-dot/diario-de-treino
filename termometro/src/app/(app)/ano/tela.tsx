"use client";

import { useState } from "react";
import { Cartao, Dinheiro, Linha, Sobrescrito, Subtitulo, Titulo } from "@/componentes/pecas";
import { useAnoCalculado, useEstado } from "@/componentes/usar-loja";
import { MESES_CURTOS, hoje, partesDaData } from "@/lib/datas";
import { comCifrao, emReais } from "@/lib/dinheiro";
import { anosComDados } from "@/lib/loja";

/** O ano inteiro de uma vez: a linha do saldo e os doze meses em números. */
export function TelaDoAno() {
  const agora = hoje();
  const [ano, setAno] = useState(partesDaData(agora).ano);
  const estado = useEstado();
  const calculado = useAnoCalculado(ano);
  const anos = anosComDados(estado, [partesDaData(agora).ano, ano]);

  const t = calculado.totais;

  return (
    <div>
      <header className="flex items-center justify-between gap-3">
        <div>
          <Sobrescrito>O ano</Sobrescrito>
          <Titulo className="mt-0.5">{ano}</Titulo>
        </div>
        <label hidden={anos.length < 2} className="text-[15px] text-grafite">
          <span className="sr-only">Ano</span>
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="rounded-folha border border-regua bg-cartao px-3 py-2"
          >
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="mt-5">
        <Subtitulo className="mb-2">Mês a mês</Subtitulo>
        <Cartao className="overflow-hidden">
          <table className="w-full border-collapse whitespace-nowrap text-[15px]">
            <thead>
              <tr className="border-b border-linha text-[11px] uppercase tracking-wide text-fosco">
                <th scope="col" className="px-3 py-2 text-left font-normal">
                  Mês
                </th>
                <th scope="col" className="px-3 py-2 text-right font-normal">
                  Entradas
                </th>
                <th scope="col" className="px-3 py-2 text-right font-normal">
                  Saiu
                </th>
                <th scope="col" className="px-3 py-2 text-right font-normal">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody>
              {calculado.meses.map((mes) => (
                <tr key={mes.mes} className="border-b border-linha last:border-b-0">
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    {MESES_CURTOS[mes.mes - 1]}
                  </th>
                  <td className="tabular px-3 py-2 text-right text-entrada">
                    {emReais(mes.totais.entradasCents)}
                  </td>
                  <td className="tabular px-3 py-2 text-right text-saida">
                    {emReais(mes.totais.saidaTotalCents)}
                  </td>
                  <td
                    className={`tabular px-3 py-2 text-right font-medium ${
                      mes.totais.saldoFechamentoCents < 0 ? "text-atencao" : "text-saldo"
                    }`}
                  >
                    {emReais(mes.totais.saldoFechamentoCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>
        <p className="mt-1.5 px-1 text-[12.5px] text-fosco">
          Valores em reais. “Saiu” é saídas mais o diário; “Saldo” é como o mês terminou.
        </p>
      </section>

      <section className="mt-6">
        <Subtitulo className="mb-2">O ano inteiro</Subtitulo>
        <Cartao className="px-4 py-1">
          <Linha rotulo="Começou com">
            <span className="tabular text-[15px]">{comCifrao(calculado.saldoInicialCents)}</span>
          </Linha>
          <Linha rotulo="Entradas">
            <Dinheiro cents={t.entradasCents} papel="entrada" />
          </Linha>
          <Linha rotulo="Saídas">
            <Dinheiro cents={t.saidasCents} papel="saida" />
          </Linha>
          <Linha rotulo="Diário">
            <Dinheiro cents={t.diarioCents} papel="diario" />
          </Linha>
          <Linha rotulo="Entrada sua" detalhe="sem repasse de fora">
            <span className="tabular text-[15px]">{comCifrao(t.entradaPropriaCents)}</span>
          </Linha>
          <Linha rotulo="Investido">
            <span className="tabular text-[15px]">
              {comCifrao(t.investidoCents)}
              {t.entradaPropriaCents > 0 && (
                <span className="ml-2 text-fosco">
                  {((t.investidoCents / t.entradaPropriaCents) * 100).toFixed(1)}%
                </span>
              )}
            </span>
          </Linha>
          <Linha rotulo="Sobrou no ano" forte>
            <Dinheiro cents={t.performanceCents} papel="saldo" />
          </Linha>
          <Linha rotulo="Termina com" forte>
            <Dinheiro cents={calculado.saldoFinalCents} papel="saldo" />
          </Linha>
        </Cartao>
      </section>
    </div>
  );
}
