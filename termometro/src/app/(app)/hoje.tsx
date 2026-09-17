"use client";

import { useState } from "react";
import { FolhaDeLancamento } from "@/componentes/folha-de-lancamento";
import { Botao, Cartao, Dinheiro, Selo, Sobrescrito, Subtitulo, Titulo } from "@/componentes/pecas";
import { useAnoCalculado } from "@/componentes/usar-loja";
import { sobraPorDia } from "@/lib/calculo";
import { curta, hoje, nomeDoDiaDaSemana, nomeDoMes, partesDaData } from "@/lib/datas";
import { comCifrao } from "@/lib/dinheiro";
import { NOME_DO_TIPO, type Lancamento, type Tipo } from "@/lib/tipos";

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
  const sobra = sobraPorDia(anoCalculado, agora);

  const oQueVem = proximosCompromissos(anoCalculado, agora);

  return (
    <div>
      <p className="text-[13px] text-fosco">{nomeDoDiaDaSemana(agora)}</p>
      <Titulo className="mt-0.5">
        {dia} de {nomeDoMes(mes)}
      </Titulo>

      <Cartao escuro className="mt-4 px-5 py-4">
        <Sobrescrito escuro>Saldo agora</Sobrescrito>
        <p className="mt-1">
          <Dinheiro cents={doDia.saldoCents} tamanho="gigante" />
        </p>

        {sobra && (
          <div className="mt-4 border-t border-white/10 pt-3">
            <div className="flex items-baseline justify-between gap-3">
              <Sobrescrito escuro>Dá para gastar hoje</Sobrescrito>
              <b
                className={`tabular shrink-0 text-[19px] ${
                  sobra.porDiaCents < 0 ? "text-atencao" : ""
                }`}
              >
                {comCifrao(sobra.porDiaCents)}
              </b>
            </div>
            <Barra usado={sobra.gastoDeHojeCents} total={sobra.porDiaCents} />
            <p className="mt-1.5 text-[12px] leading-snug text-heroi-fosco">
              {sobra.porDiaCents < 0 ? (
                <>
                  As contas que ainda vêm passam do que há em caixa. Faltam {sobra.diasRestantes}{" "}
                  dias no mês.
                </>
              ) : sobra.gastoDeHojeCents > 0 ? (
                <>
                  Já gastou {comCifrao(sobra.gastoDeHojeCents)} hoje. Repartido pelos{" "}
                  {sobra.diasRestantes} dias que faltam no mês.
                </>
              ) : (
                <>
                  O que sobra depois das contas que ainda vêm, repartido pelos {sobra.diasRestantes}{" "}
                  dias que faltam no mês.
                </>
              )}
            </p>
          </div>
        )}
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

      <section className="mt-6">
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
      </section>

      {oQueVem.length > 0 && (
        <section className="mt-6">
          <Subtitulo className="mb-2">O que vem</Subtitulo>
          <Cartao className="px-4 py-1">
            {oQueVem.map((l) => (
              <div
                key={l.id}
                className="flex items-baseline justify-between gap-3 border-b border-linha py-2.5 last:border-b-0"
              >
                <span className="min-w-0 truncate text-[14.5px]">
                  <span className="tabular text-fosco">{curta(l.data)}</span>
                  <span className="mx-1.5 text-fosco">·</span>
                  {l.nota || NOME_DO_TIPO[l.tipo]}
                </span>
                <Dinheiro cents={l.valorCents} papel={corDe(l.tipo)} />
              </div>
            ))}
          </Cartao>
        </section>
      )}

      {lancando && (
        <FolhaDeLancamento data={agora} tipoInicial={lancando} aoFechar={() => setLancando(null)} />
      )}
    </div>
  );
}

const corDe = (tipo: Tipo) =>
  tipo === "ENTRADA" ? "entrada" : tipo === "SAIDA" ? "saida" : "diario";

/**
 * A barra que mostra quanto do dia já foi gasto. Passou do limite, ela enche e
 * fica vermelha — sem esconder o excesso atrás de uma barra cheia e calma.
 */
function Barra({ usado, total }: { usado: number; total: number }) {
  if (total <= 0) return null;
  const parte = Math.min(usado / total, 1);
  const estourou = usado > total;
  return (
    <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-white/15">
      <div
        className={`h-full rounded-full ${estourou ? "bg-atencao" : "bg-saldo"}`}
        style={{ width: `${Math.max(parte * 100, usado > 0 ? 4 : 0)}%` }}
      />
    </div>
  );
}

/**
 * O que ainda vai acontecer: as contas e entradas dos próximos dias, sem o
 * gasto do dia a dia — esse não é compromisso, é o que sobra depois deles.
 */
function proximosCompromissos(
  ano: ReturnType<typeof useAnoCalculado>,
  agora: string,
): Lancamento[] {
  const proximos: Lancamento[] = [];
  for (const mes of ano.meses) {
    for (const dia of mes.dias) {
      if (dia.data <= agora) continue;
      for (const l of dia.lancamentos) {
        if (l.tipo !== "DIARIO") proximos.push(l);
      }
    }
  }
  return proximos.slice(0, 5);
}
