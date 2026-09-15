"use client";

import { useState } from "react";
import { FolhaDoDia } from "@/componentes/folha-do-dia";
import { Aviso, Dinheiro, Linha } from "@/componentes/pecas";
import { useAnoCalculado, useEstado } from "@/componentes/usar-loja";
import type { DiaCalculado, MesCalculado } from "@/lib/calculo";
import { curta, hoje, nomeDoDiaDaSemana, nomeDoMes, partesDaData } from "@/lib/datas";
import { comCifrao, redondo } from "@/lib/dinheiro";

/**
 * A tela do mês: a mesma coluna de dias da planilha, com o saldo andando linha a
 * linha. O que ela responde, e era a razão de a planilha existir: dá até o fim
 * do mês?
 */
export function TelaDoMes() {
  const agora = hoje();
  const inicial = partesDaData(agora);
  const [ano, setAno] = useState(inicial.ano);
  const [mes, setMes] = useState(inicial.mes);
  const [diaAberto, setDiaAberto] = useState<string | null>(null);

  const estado = useEstado();
  const anoCalculado = useAnoCalculado(ano);
  const doMes = anoCalculado.meses[mes - 1];

  const ehOMesDeHoje = ano === inicial.ano && mes === inicial.mes;
  const diaDeHoje = ehOMesDeHoje ? doMes.dias[inicial.dia - 1] : null;
  const diaSelecionado = diaAberto ? doMes.dias.find((d) => d.data === diaAberto) : null;

  function andar(passos: number) {
    const total = (mes - 1 + passos + 12 * 100) % 12;
    const anoNovo = ano + Math.floor((mes - 1 + passos) / 12);
    setMes(total + 1);
    setAno(anoNovo);
  }

  const vazio = estado.carregado && Object.keys(estado.lancamentos).length === 0;

  return (
    <div>
      <header className="flex items-center justify-between gap-2">
        <Seta rotulo="Mês anterior" onClick={() => andar(-1)}>
          ‹
        </Seta>
        <h1 className="text-[22px] font-semibold tracking-tight">
          {nomeDoMes(mes)} <span className="text-fosco">{ano}</span>
        </h1>
        <Seta rotulo="Próximo mês" onClick={() => andar(1)}>
          ›
        </Seta>
      </header>

      {vazio && (
        <div className="mt-4">
          <Aviso>
            Ainda não há nada aqui. Em <strong>Ajustes → Importar planilha</strong> dá para trazer o
            Termômetro inteiro de uma vez; ou toque no <strong>+</strong> e lance o primeiro valor.
          </Aviso>
        </div>
      )}

      <Painel mes={doMes} diaDeHoje={diaDeHoje} />

      <ListaDeDias
        mes={doMes}
        hoje={agora}
        aoAbrirDia={(d) => setDiaAberto(d.data)}
      />

      <Rodape mes={doMes} />

      {diaSelecionado && <FolhaDoDia dia={diaSelecionado} aoFechar={() => setDiaAberto(null)} />}
    </div>
  );
}

function Seta({
  children,
  rotulo,
  onClick,
}: {
  children: React.ReactNode;
  rotulo: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-regua text-[22px] text-grafite"
    >
      {children}
    </button>
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
  const noVermelho = mes.dias.find((d) => d.saldoCents < 0 && (!diaDeHoje || d.dia >= diaDeHoje.dia));

  return (
    <section className="mt-4 rounded-folha border border-reguafina bg-cartao p-4">
      <p className="text-[15px] text-grafite">
        {diaDeHoje ? `Saldo hoje, dia ${diaDeHoje.dia}` : `Saldo no fim de ${mes.nome}`}
      </p>
      <p className="mt-1">
        <Dinheiro cents={principal.saldoCents} papel="saldo" tamanho="gigante" />
      </p>

      {diaDeHoje && (
        <p className="mt-2 text-[15px] text-grafite">
          No fim de {mes.nome}, se nada mudar:{" "}
          <span className={`tabular ${fechamento < 0 ? "text-atencao" : "text-tinta"}`}>
            {comCifrao(fechamento)}
          </span>
        </p>
      )}

      {noVermelho && (
        <p className="mt-3 flex items-start gap-2 rounded-folha border border-atencao/40 p-3 text-[15px] leading-snug">
          <span aria-hidden className="text-atencao">
            ▲
          </span>
          <span>
            Fica negativo no dia <strong>{noVermelho.dia}</strong> ({curta(noVermelho.data)}):{" "}
            <span className="tabular text-atencao">{comCifrao(noVermelho.saldoCents)}</span>
          </span>
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-reguafina pt-3">
        <Bloco rotulo="Entradas" cents={mes.totais.entradasCents} papel="entrada" />
        <Bloco rotulo="Saídas" cents={mes.totais.saidasCents} papel="saida" />
        <Bloco rotulo="Diário" cents={mes.totais.diarioCents} papel="saida" />
      </div>
    </section>
  );
}

function Bloco({
  rotulo,
  cents,
  papel,
}: {
  rotulo: string;
  cents: number;
  papel: "entrada" | "saida";
}) {
  return (
    <div>
      <p className="text-[13px] text-fosco">{rotulo}</p>
      <p
        className={`tabular text-[17px] ${
          cents === 0 ? "text-grafite" : papel === "entrada" ? "text-entrada" : "text-saida"
        }`}
      >
        {redondo(cents)}
      </p>
    </div>
  );
}

function ListaDeDias({
  mes,
  hoje: agora,
  aoAbrirDia,
}: {
  mes: MesCalculado;
  hoje: string;
  aoAbrirDia: (dia: DiaCalculado) => void;
}) {
  return (
    <section className="mt-5">
      <div className="flex items-baseline justify-between px-1 pb-1 text-[13px] text-fosco">
        <span>Dia</span>
        <span>Saldo</span>
      </div>
      <ol className="overflow-hidden rounded-folha border border-reguafina bg-cartao">
        {mes.dias.map((dia) => {
          const ehHoje = dia.data === agora;
          const futuro = dia.data > agora;
          return (
            <li key={dia.data} className="border-b border-reguafina last:border-b-0">
              <button
                type="button"
                onClick={() => aoAbrirDia(dia)}
                aria-label={`Dia ${dia.dia}, ${nomeDoDiaDaSemana(dia.data)}. Saldo ${comCifrao(
                  dia.saldoCents,
                )}.`}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${
                  ehHoje ? "bg-saldo/10" : ""
                }`}
              >
                <span className="w-[54px] shrink-0 tabular text-[15px]">
                  {dia.dia}
                  <span className="ml-1 text-[13px] text-fosco">
                    {nomeDoDiaDaSemana(dia.data, true)}
                  </span>
                </span>

                <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3">
                  {dia.entradaCents > 0 && <Dinheiro cents={dia.entradaCents} papel="entrada" />}
                  {dia.saidaCents > 0 && <Dinheiro cents={dia.saidaCents} papel="saida" />}
                  {dia.diarioCents > 0 && <Dinheiro cents={dia.diarioCents} papel="diario" />}
                  {dia.temPrevisto && (
                    <span className="text-[13px] text-fosco">previsto</span>
                  )}
                </span>

                <span
                  className={`shrink-0 tabular text-[15px] ${
                    dia.saldoCents < 0 ? "text-atencao" : futuro ? "text-fosco" : "text-tinta"
                  }`}
                >
                  {comCifrao(dia.saldoCents)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** O rodapé da planilha, com as duas contas que lá estavam erradas já certas. */
function Rodape({ mes }: { mes: MesCalculado }) {
  const t = mes.totais;
  return (
    <section className="mt-6">
      <h2 className="mb-1 text-[17px] font-semibold tracking-tight">O mês fechado</h2>
      <div className="rounded-folha border border-reguafina bg-cartao px-4 py-1">
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
      </div>

      {t.investidoPercent === null && t.investidoCents > 0 && (
        <p className="mt-2 px-1 text-[13px] leading-snug text-fosco">
          O percentual investido é medido sobre a sua entrada. Este mês não tem nenhuma entrada
          marcada como dinheiro seu, então não há sobre o que medir.
        </p>
      )}
    </section>
  );
}
