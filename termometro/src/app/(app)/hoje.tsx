"use client";

import { useState } from "react";
import { AtalhosRapidos } from "@/componentes/atalhos-rapidos";
import { FolhaDeLancamento } from "@/componentes/folha-de-lancamento";
import { Botao, Cartao, Dinheiro, Selo, Sobrescrito, Subtitulo, Titulo } from "@/componentes/pecas";
import { useAnoCalculado } from "@/componentes/usar-loja";
import { hoje, nomeDoDiaDaSemana, nomeDoMes, partesDaData } from "@/lib/datas";
import { comCifrao } from "@/lib/dinheiro";
import { NOME_DO_TIPO, type Tipo } from "@/lib/tipos";

/**
 * A tela de abrir o app.
 *
 * Quem abre isto está quase sempre com o celular na mão depois de gastar algo,
 * e quer duas respostas: quanto eu tenho, e quanto ainda posso gastar hoje. O
 * resto do app responde o mês e o ano; esta tela responde agora.
 */
export function TelaDeHoje() {
  const agora = hoje();
  const { ano, mes, dia } = partesDaData(agora);
  const [lancando, setLancando] = useState<Tipo | null>(null);

  const anoCalculado = useAnoCalculado(ano);
  const doMes = anoCalculado.meses[mes - 1];
  const doDia = doMes.dias[dia - 1];

  return (
    <div>
      <p className="text-[13px] text-fosco">{nomeDoDiaDaSemana(agora)}</p>
      <Titulo className="mt-0.5">
        {dia} de {nomeDoMes(mes)}
      </Titulo>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div>
          <Cartao escuro className="mt-4 px-5 py-4">
            <Sobrescrito escuro>Saldo agora</Sobrescrito>
            <p className="mt-1">
              <Dinheiro cents={doDia.saldoCents} tamanho="gigante" />
            </p>
            <p className="mt-2 text-[13px] text-heroi-fosco">
              No fim de {nomeDoMes(mes)}, se nada mudar:{" "}
              <b className="tabular whitespace-nowrap text-heroi-tinta">
                {comCifrao(doMes.totais.saldoFechamentoCents)}
              </b>
            </p>
          </Cartao>

          <div className="mt-3 flex gap-2">
            <Botao onClick={() => setLancando("ENTRADA")} className="flex-1 !text-[15px]">
              + Entrada
            </Botao>
            <Botao onClick={() => setLancando("SAIDA")} className="flex-1 !text-[15px]">
              + Saída
            </Botao>
            <Botao
              tipo="primario"
              onClick={() => setLancando("DIARIO")}
              className="flex-1 !text-[15px]"
            >
              + Diário
            </Botao>
          </div>
        </div>

        <section className="mt-6 lg:mt-4">
          <Subtitulo className="mb-2">Lançado hoje</Subtitulo>
          {doDia.lancamentos.length === 0 ? (
            <Cartao className="px-4 py-3.5">
              <p className="text-[14.5px] text-grafite">
                Nada ainda. Toque em <b>+ Diário</b> e registre o primeiro.
              </p>
            </Cartao>
          ) : (
            <Cartao className="px-4 py-1">
              {doDia.lancamentos.map((l) => (
                <div
                  key={l.id}
                  className="flex items-baseline justify-between gap-3 border-b border-linha py-2.5 last:border-b-0"
                >
                  <span className="min-w-0 text-[14.5px]">
                    <span className={l.previsto ? "text-grafite" : ""}>
                      {l.nota || NOME_DO_TIPO[l.tipo]}
                    </span>
                    {l.previsto && <Selo tom="quieto">previsto</Selo>}
                  </span>
                  <Dinheiro cents={l.valorCents} papel={corDe(l.tipo)} />
                </div>
              ))}
            </Cartao>
          )}

          <AtalhosRapidos data={agora} />
        </section>
      </div>

      {lancando && (
        <FolhaDeLancamento data={agora} tipoInicial={lancando} aoFechar={() => setLancando(null)} />
      )}
    </div>
  );
}

const corDe = (tipo: Tipo) =>
  tipo === "ENTRADA" ? "entrada" : tipo === "SAIDA" ? "saida" : "diario";
