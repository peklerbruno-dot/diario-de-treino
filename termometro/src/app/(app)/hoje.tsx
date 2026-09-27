"use client";

import { useState } from "react";
import { AtalhosRapidos } from "@/componentes/atalhos-rapidos";
import { FolhaDeLancamento } from "@/componentes/folha-de-lancamento";
import { Botao, Cartao, Dinheiro, Selo, Sobrescrito, Subtitulo, Titulo } from "@/componentes/pecas";
import { useAnoCalculado } from "@/componentes/usar-loja";
import { curta, hoje, nomeDoDiaDaSemana, nomeDoMes, partesDaData } from "@/lib/datas";
import { comCifrao } from "@/lib/dinheiro";
import {
  previstosVencidos,
  primeiroDiaNoVermelho,
  sobraPorDia,
  type AnoCalculado,
} from "@/lib/calculo";
import { lancamentosVivos, loja } from "@/lib/loja";
import { useEstado } from "@/componentes/usar-loja";
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
            <DaPorDia ano={anoCalculado} agora={agora} />
          </Cartao>

          <AvisoDoVermelho ano={anoCalculado} agora={agora} />

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
          <Vencidos agora={agora} />

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
                  {/* `truncate`: uma observação comprida termina em …, em vez
                      de esticar a página inteira para o lado. */}
                  <span className="min-w-0 truncate text-[14.5px]">
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

/**
 * A frase que a planilha nunca soube dizer: quanto dá por dia.
 *
 * É o fechamento previsto do mês — que já desconta tudo o que ainda vem —
 * dividido pelos dias que faltam. Quem abre o app depois de um gasto quer
 * exatamente isto: "posso ou não posso?".
 */
function DaPorDia({ ano, agora }: { ano: AnoCalculado; agora: string }) {
  const sobra = sobraPorDia(ano, agora);
  if (!sobra) return null;

  if (sobra.porDiaCents === 0) {
    return (
      <p className="mt-1 text-[13px] text-heroi-fosco">
        O mês já fecha abaixo de zero — cada gasto agora aprofunda.
      </p>
    );
  }

  return (
    <p className="mt-1 text-[13px] text-heroi-fosco">
      Dá <b className="tabular text-heroi-tinta">{comCifrao(sobra.porDiaCents)}</b> por dia até o
      fim do mês
      {sobra.gastoDeHojeCents > 0 ? (
        <>
          {" "}
          — hoje já foi{" "}
          <b className="tabular text-heroi-tinta">{comCifrao(sobra.gastoDeHojeCents)}</b>
        </>
      ) : null}
      .
    </p>
  );
}

/** O aviso que o motor sempre soube dar e nenhuma tela mostrava. */
function AvisoDoVermelho({ ano, agora }: { ano: AnoCalculado; agora: string }) {
  const dia = primeiroDiaNoVermelho(ano, agora);
  if (!dia) return null;

  return (
    <p className="mt-2 text-[13px] leading-snug text-atencao">
      Se nada mudar, o saldo cruza o zero em <b>{curta(dia.data)}</b> ({comCifrao(dia.saldoCents)}).
    </p>
  );
}

/**
 * Os previstos que passaram da data sem ninguém dizer se aconteceram.
 *
 * Cada um distorce o saldo em silêncio: a tela jura que o dinheiro saiu, e
 * talvez não tenha saído. Conferir aqui é um toque por linha — "Aconteceu"
 * confirma, "Não houve" apaga (com desfazer) — e o cartão some sozinho quando
 * não há o que conferir.
 */
function Vencidos({ agora }: { agora: string }) {
  const estado = useEstado();
  const vencidos = previstosVencidos(lancamentosVivos(estado), agora);
  if (vencidos.length === 0) return null;

  const mostrados = vencidos.slice(0, 4);

  return (
    <section className="mb-5">
      <Subtitulo className="mb-2">Aconteceu mesmo?</Subtitulo>
      <Cartao className="px-4 py-1">
        {mostrados.map((l) => (
          <div
            key={l.id}
            className="flex items-center justify-between gap-2 border-b border-linha py-2.5 last:border-b-0"
          >
            <span className="min-w-0">
              <span className="block truncate text-[14.5px]">{l.nota || NOME_DO_TIPO[l.tipo]}</span>
              <span className="tabular block text-[12.5px] text-fosco">
                {curta(l.data)} · {comCifrao(l.valorCents)}
              </span>
            </span>
            <span className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => loja.confirmarLancamento(l.id)}
                className="min-h-[38px] rounded-full bg-heroi px-3.5 text-[13px] font-semibold text-heroi-tinta"
              >
                Aconteceu
              </button>
              <button
                type="button"
                onClick={() => loja.apagarLancamento(l.id)}
                className="min-h-[38px] rounded-full bg-papel px-3 text-[13px] text-grafite"
              >
                Não houve
              </button>
            </span>
          </div>
        ))}
        {vencidos.length > mostrados.length && (
          <p className="py-2.5 text-[12.5px] text-fosco">
            E mais {vencidos.length - mostrados.length} — estão nos dias do Mês.
          </p>
        )}
        {vencidos.length > 1 && (
          <div className="border-t border-linha py-2.5">
            <button
              type="button"
              onClick={() => {
                for (const l of vencidos) loja.confirmarLancamento(l.id);
              }}
              className="text-[13.5px] font-medium text-tinta underline"
            >
              Aconteceram todos como previsto
            </button>
          </div>
        )}
      </Cartao>
    </section>
  );
}
