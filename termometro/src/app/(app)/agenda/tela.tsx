"use client";

import { useState } from "react";
import { FolhaDoDia } from "@/componentes/folha-do-dia";
import { Aviso, Cartao, Dinheiro, Selo, Sobrescrito, Subtitulo, Titulo } from "@/componentes/pecas";
import { useAnoCalculado } from "@/componentes/usar-loja";
import type { DiaCalculado } from "@/lib/calculo";
import { hoje, nomeDoDiaDaSemana, nomeDoMes, partesDaData } from "@/lib/datas";
import { emReais } from "@/lib/dinheiro";
import { NOME_DO_TIPO, type Tipo } from "@/lib/tipos";

/**
 * O que ainda vai acontecer.
 *
 * Saiu da tela de Hoje e virou aba porque são duas perguntas de tamanhos
 * diferentes. Hoje responde "quanto eu tenho agora" — uma olhada de três
 * segundos, com o celular na mão. Esta responde "o que está vindo", que é o que
 * se olha sentado, antes de decidir uma compra ou uma viagem. Espremida embaixo
 * da primeira, cortada em cinco linhas, ela não respondia nem uma coisa nem
 * outra.
 *
 * O gasto do dia a dia fica de fora: ele não é compromisso, é o que sobra
 * depois deles.
 */
export function TelaDaAgenda() {
  const agora = hoje();
  const { ano } = partesDaData(agora);
  const anoCalculado = useAnoCalculado(ano);
  const [diaAberto, setDiaAberto] = useState<DiaCalculado | null>(null);

  const meses = mesesQueVem(anoCalculado, agora);
  const total = meses.reduce((soma, m) => soma + m.saldoCents, 0);

  return (
    <div>
      <Sobrescrito>Daqui para a frente</Sobrescrito>
      <Titulo className="mt-0.5">O que vem</Titulo>

      {meses.length === 0 ? (
        <div className="mt-4">
          <Aviso>
            Nada marcado daqui até o fim do ano. Em <strong>Fixos</strong> dá para cadastrar o que
            se repete — salário, aluguel, fatura — e mandar preencher os meses que faltam.
          </Aviso>
        </div>
      ) : (
        <>
          <p className="mt-2 text-[14.5px] leading-relaxed text-grafite">
            Tudo o que está marcado daqui até o fim do ano, sem o gasto do dia a dia. No saldo,{" "}
            <b className={total < 0 ? "text-atencao" : "text-entrada"}>
              {total < 0 ? "−" : "+"}R$ {emReais(Math.abs(total))}
            </b>
            .
          </p>

          {meses.map((mes) => (
            <section key={mes.chave} className="mt-5">
              <Subtitulo className="mb-2 first-letter:uppercase">{mes.nome}</Subtitulo>
              <Cartao className="px-4 py-1">
                {mes.dias.map((dia) =>
                  dia.lancamentos.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setDiaAberto(dia)}
                      className="flex w-full items-baseline justify-between gap-3 border-b border-linha py-3 text-left last:border-b-0"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[15px]">
                          {l.nota || NOME_DO_TIPO[l.tipo]}
                          {l.previsto && <Selo tom="quieto">previsto</Selo>}
                        </span>
                        <span className="mt-0.5 block text-[12.5px] text-fosco">
                          dia {dia.dia} · {nomeDoDiaDaSemana(dia.data)}
                        </span>
                      </span>
                      <Dinheiro cents={l.valorCents} papel={corDe(l.tipo)} />
                    </button>
                  )),
                )}
              </Cartao>
            </section>
          ))}
        </>
      )}

      {diaAberto && <FolhaDoDia dia={diaAberto} aoFechar={() => setDiaAberto(null)} />}
    </div>
  );
}

const corDe = (tipo: Tipo) =>
  tipo === "ENTRADA" ? "entrada" : tipo === "SAIDA" ? "saida" : "diario";

interface MesQueVem {
  chave: string;
  nome: string;
  dias: DiaCalculado[];
  /** O que este mês mexe no saldo: entradas menos saídas. */
  saldoCents: number;
}

/** Os dias que ainda vêm, agrupados por mês, sem o gasto do dia a dia. */
function mesesQueVem(ano: ReturnType<typeof useAnoCalculado>, agora: string): MesQueVem[] {
  const meses: MesQueVem[] = [];

  for (const mes of ano.meses) {
    const dias: DiaCalculado[] = [];
    let saldo = 0;

    for (const dia of mes.dias) {
      if (dia.data <= agora) continue;
      const compromissos = dia.lancamentos.filter((l) => l.tipo !== "DIARIO");
      if (compromissos.length === 0) continue;

      dias.push({ ...dia, lancamentos: compromissos });
      for (const l of compromissos) {
        saldo += l.tipo === "ENTRADA" ? l.valorCents : -l.valorCents;
      }
    }

    if (dias.length > 0) {
      meses.push({
        chave: `${mes.ano}-${mes.mes}`,
        nome: `${nomeDoMes(mes.mes)} de ${mes.ano}`,
        dias,
        saldoCents: saldo,
      });
    }
  }

  return meses;
}
