"use client";

import { useEffect, useRef, useState } from "react";
import { Calendario } from "@/componentes/calendario";
import { FolhaDoDia } from "@/componentes/folha-do-dia";
import { IconeCalendario, IconeLista } from "@/componentes/icones";
import {
  Aviso,
  Cartao,
  Dinheiro,
  Linha,
  Seta,
  Sobrescrito,
  Subtitulo,
  Titulo,
} from "@/componentes/pecas";
import { useAnoCalculado, useEstado } from "@/componentes/usar-loja";
import type { DiaCalculado, MesCalculado } from "@/lib/calculo";
import { curta, hoje, nomeDoDiaDaSemana, nomeDoMes, partesDaData } from "@/lib/datas";
import { comCifrao, semCentavos } from "@/lib/dinheiro";
import { classeDoSaldo, corDoSaldo, faixaDoMes } from "@/lib/escala";

type Visao = "lista" | "calendario";

/**
 * A tela do mês: a mesma coluna de dias da planilha, com o saldo andando linha
 * a linha. O que ela responde, e era a razão de a planilha existir: dá até o
 * fim do mês?
 */
export function TelaDoMes() {
  const agora = hoje();
  const inicial = partesDaData(agora);
  const [ano, setAno] = useState(inicial.ano);
  const [mes, setMes] = useState(inicial.mes);
  const [visao, setVisao] = useState<Visao>("lista");
  const [diaAberto, setDiaAberto] = useState<string | null>(null);

  const estado = useEstado();
  const anoCalculado = useAnoCalculado(ano);
  const doMes = anoCalculado.meses[mes - 1];

  const ehOMesDeHoje = ano === inicial.ano && mes === inicial.mes;
  const diaDeHoje = ehOMesDeHoje ? doMes.dias[inicial.dia - 1] : null;
  const diaSelecionado = diaAberto ? doMes.dias.find((d) => d.data === diaAberto) : null;

  function andar(passos: number) {
    const bruto = mes - 1 + passos;
    setMes((((bruto % 12) + 12) % 12) + 1);
    setAno(ano + Math.floor(bruto / 12));
  }

  const vazio = estado.carregado && Object.keys(estado.lancamentos).length === 0;

  return (
    <div>
      <header className="flex items-center justify-between gap-2">
        <Seta rotulo="Mês anterior" onClick={() => andar(-1)}>
          ‹
        </Seta>
        <Titulo>
          {nomeDoMes(mes)} <span className="font-normal text-fosco">{ano}</span>
        </Titulo>
        <Seta rotulo="Próximo mês" onClick={() => andar(1)}>
          ›
        </Seta>
      </header>

      {vazio && (
        <div className="mt-4">
          <Aviso>
            Ainda não há nada aqui. Em <strong>Ajustes → Importar planilha</strong> dá para trazer o
            Termômetro inteiro de uma vez; ou toque em <strong>Lançar</strong> e registre o primeiro
            valor.
          </Aviso>
        </div>
      )}

      <Painel mes={doMes} diaDeHoje={diaDeHoje} />

      <div className="mt-4 flex items-center justify-between">
        <Sobrescrito>{visao === "lista" ? "Dia a dia" : "O mês inteiro"}</Sobrescrito>
        <AlternarVisao visao={visao} aoTrocar={setVisao} />
      </div>

      <div className="mt-2">
        {visao === "lista" ? (
          <ListaDeDias mes={doMes} hoje={agora} aoAbrirDia={(d) => setDiaAberto(d.data)} />
        ) : (
          <Calendario mes={doMes} hoje={agora} aoAbrirDia={(d) => setDiaAberto(d.data)} />
        )}
      </div>

      <Rodape mes={doMes} />

      {diaSelecionado && <FolhaDoDia dia={diaSelecionado} aoFechar={() => setDiaAberto(null)} />}
    </div>
  );
}

function AlternarVisao({ visao, aoTrocar }: { visao: Visao; aoTrocar: (v: Visao) => void }) {
  return (
    <div className="flex gap-1 rounded-full bg-cartao p-1 shadow-baixa">
      {(
        [
          ["lista", "Lista", IconeLista],
          ["calendario", "Calendário", IconeCalendario],
        ] as const
      ).map(([chave, nome, Icone]) => (
        <button
          key={chave}
          type="button"
          aria-label={nome}
          aria-pressed={visao === chave}
          onClick={() => aoTrocar(chave)}
          className={`flex h-8 w-11 items-center justify-center rounded-full ${
            visao === chave ? "bg-heroi text-heroi-tinta" : "text-fosco"
          }`}
        >
          <Icone />
        </button>
      ))}
    </div>
  );
}

/**
 * O número grande é um só: o saldo de hoje quando o mês é este, o saldo do
 * fechamento quando não é. Abaixo dele, a projeção — e o aviso de quando o
 * dinheiro acaba, que é a única coisa que precisa gritar.
 */
function Painel({ mes, diaDeHoje }: { mes: MesCalculado; diaDeHoje: DiaCalculado | null }) {
  const principal = diaDeHoje ?? mes.dias[mes.dias.length - 1];
  const fechamento = mes.totais.saldoFechamentoCents;
  const noVermelho = mes.dias.find(
    (d) => d.saldoCents < 0 && (!diaDeHoje || d.dia >= diaDeHoje.dia),
  );

  return (
    <>
      <Cartao escuro className="mt-4 px-5 py-4">
        <Sobrescrito escuro>
          {diaDeHoje
            ? `Saldo hoje · ${diaDeHoje.dia} de ${mes.nome}`
            : `Saldo no fim de ${mes.nome}`}
        </Sobrescrito>
        <p className="mt-1">
          <Dinheiro cents={principal.saldoCents} tamanho="gigante" />
        </p>
        {diaDeHoje && (
          <p className="mt-2 text-[13.5px] text-heroi-fosco">
            No fim de {mes.nome}, se nada mudar:{" "}
            <b className="tabular text-heroi-tinta">{comCifrao(fechamento)}</b>
          </p>
        )}
      </Cartao>

      {noVermelho && (
        <p className="mt-2 flex items-start gap-2 rounded-folha bg-cartao p-3 text-[14px] leading-snug shadow-baixa ring-1 ring-atencao/40">
          <span aria-hidden className="text-atencao">
            ▲
          </span>
          <span>
            Fica negativo no dia <b>{noVermelho.dia}</b> ({curta(noVermelho.data)}):{" "}
            <span className="tabular text-atencao">{comCifrao(noVermelho.saldoCents)}</span>
          </span>
        </p>
      )}
    </>
  );
}

/**
 * As cinco colunas da planilha, com a coluna do saldo pintada.
 *
 * A mancha de cor é o que a planilha tinha e o app não: dá para ver a forma do
 * mês — onde aperta, onde folga, em que dia vira — antes de ler número nenhum.
 * A cor nunca está sozinha, porque o número está escrito dentro da célula.
 *
 * Célula vazia quer dizer zero, como na planilha. O travessão que havia ali
 * antes era ruído repetido trinta vezes: o olho já lê o branco como "não teve".
 */
function ListaDeDias({
  mes,
  hoje: agora,
  aoAbrirDia,
}: {
  mes: MesCalculado;
  hoje: string;
  aoAbrirDia: (dia: DiaCalculado) => void;
}) {
  const linhaDeHoje = useRef<HTMLTableRowElement>(null);
  const faixa = faixaDoMes(mes.dias.map((d) => d.saldoCents));

  // A lista abre no dia de hoje, e não no dia 1º: quem abre o app está quase
  // sempre olhando para agora, e rolar dezessete linhas toda vez cansa.
  useEffect(() => {
    linhaDeHoje.current?.scrollIntoView({ block: "center" });
  }, [mes.mes, mes.ano]);

  return (
    <div className="overflow-hidden rounded-cartao bg-cartao px-2 pb-1 pt-2.5 shadow-cartao">
      <table className="tabular w-full border-collapse">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-fosco">
            <th scope="col" className="pb-2 pl-1.5 text-left font-medium">
              Dia
            </th>
            <th scope="col" className="pb-2 pl-1 text-right font-medium">
              Entrada
            </th>
            <th scope="col" className="pb-2 pl-1 text-right font-medium">
              Saída
            </th>
            <th scope="col" className="pb-2 pl-1 text-right font-medium">
              Diário
            </th>
            <th scope="col" className="pb-2 pl-1 pr-1.5 text-right font-medium">
              Saldo
            </th>
          </tr>
        </thead>
        <tbody>
          {mes.dias.map((dia) => {
            const ehHoje = dia.data === agora;
            const futuro = dia.data > agora;
            const cor = classeDoSaldo(corDoSaldo(dia.saldoCents, faixa));
            return (
              <tr key={dia.data} ref={ehHoje ? linhaDeHoje : undefined}>
                <td className="py-[3px] pl-1.5 pr-1">
                  <button
                    type="button"
                    onClick={() => aoAbrirDia(dia)}
                    aria-label={`${ehHoje ? "Hoje, dia" : "Dia"} ${dia.dia}, ${nomeDoDiaDaSemana(
                      dia.data,
                    )}. Saldo ${comCifrao(dia.saldoCents)}.`}
                    className={`flex w-full items-baseline gap-1 whitespace-nowrap rounded-[8px] px-1 py-1 text-left text-[13.5px] ${
                      ehHoje ? "bg-saldo font-bold text-white" : futuro ? "text-fosco" : ""
                    }`}
                  >
                    <span className={ehHoje ? "" : "font-medium"}>{dia.dia}</span>
                    <span className={`text-[10.5px] ${ehHoje ? "text-white/75" : "text-fosco"}`}>
                      {nomeDoDiaDaSemana(dia.data, true)}
                    </span>
                  </button>
                </td>
                <Valor cents={dia.entradaCents} classe="text-entrada" fraco={futuro} />
                <Valor cents={dia.saidaCents} classe="text-saida" fraco={futuro} />
                <Valor cents={dia.diarioCents} classe="text-diario" fraco={futuro} />
                <td className="py-[3px] pl-1 pr-1.5">
                  <span
                    className={`block rounded-[8px] px-1.5 py-1 text-right text-[13.5px] font-semibold ${cor}`}
                  >
                    {semCentavos(dia.saldoCents)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Uma célula de valor. Vazia quando é zero — a planilha fazia assim, e é o
 * branco que deixa as cifras que existem saltarem da coluna.
 */
function Valor({ cents, classe, fraco }: { cents: number; classe: string; fraco: boolean }) {
  return (
    <td
      className={`whitespace-nowrap py-[3px] pl-1 text-right text-[12.5px] ${classe} ${
        fraco ? "opacity-55" : ""
      }`}
    >
      {cents === 0 ? "" : semCentavos(cents)}
    </td>
  );
}

/** O rodapé da planilha, com as duas contas que lá estavam erradas já certas. */
function Rodape({ mes }: { mes: MesCalculado }) {
  const t = mes.totais;
  return (
    <section className="mt-6">
      <Subtitulo className="mb-2">O mês fechado</Subtitulo>
      <Cartao className="px-4 py-1">
        <Linha rotulo="Entradas">
          <Dinheiro cents={t.entradasCents} papel="entrada" />
        </Linha>
        <Linha rotulo="Saídas">
          <Dinheiro cents={t.saidasCents} papel="saida" />
        </Linha>
        <Linha rotulo="Diário">
          <Dinheiro cents={t.diarioCents} papel="diario" />
        </Linha>
        <Linha rotulo="Saída total" detalhe="saídas + diário">
          <span className="tabular text-[15px]">{comCifrao(t.saidaTotalCents)}</span>
        </Linha>
        <Linha rotulo="Média por dia" detalhe={`${mes.dias.length} dias`}>
          <span className="tabular text-[15px]">{comCifrao(t.mediaDiariaCents)}</span>
        </Linha>
        <Linha rotulo="Entrada sua" detalhe="sem repasse de fora">
          <span className="tabular text-[15px]">{comCifrao(t.entradaPropriaCents)}</span>
        </Linha>
        <Linha rotulo="Investido">
          <span className="tabular text-[15px]">
            {comCifrao(t.investidoCents)}
            {t.investidoPercent !== null && (
              <span className="ml-2 text-fosco">{t.investidoPercent.toFixed(1)}%</span>
            )}
          </span>
        </Linha>
        {t.aptoCents > 0 && (
          <Linha rotulo="Apartamento" detalhe="parte da outra pessoa">
            <span className="tabular text-[15px]">
              {comCifrao(t.aptoCents)}
              <span className="ml-2 text-fosco">{comCifrao(t.aptoParteDoOutroCents)}</span>
            </span>
          </Linha>
        )}
        <Linha rotulo="Performance" detalhe="entradas − saída total" forte>
          <Dinheiro cents={t.performanceCents} papel="saldo" />
        </Linha>
        <Linha rotulo="Saldo no fim do mês" forte>
          <Dinheiro cents={t.saldoFechamentoCents} papel="saldo" />
        </Linha>
      </Cartao>

      {t.investidoPercent === null && t.investidoCents > 0 && (
        <p className="mt-2 px-1 text-[12.5px] leading-snug text-fosco">
          O percentual investido é medido sobre a sua entrada. Este mês não tem nenhuma entrada
          marcada como dinheiro seu, então não há sobre o que medir.
        </p>
      )}
    </section>
  );
}
