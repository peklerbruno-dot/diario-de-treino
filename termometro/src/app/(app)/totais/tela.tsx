"use client";

import Link from "next/link";
import { useState } from "react";
import { Aviso, Cartao, Seta, Sobrescrito, Subtitulo, Titulo } from "@/componentes/pecas";
import { useEstado } from "@/componentes/usar-loja";
import { categoriasDe, lancamentosVivos } from "@/lib/loja";
import { hoje, nomeDoMes, partesDaData } from "@/lib/datas";
import { comCifrao } from "@/lib/dinheiro";
import { SEM_CATEGORIA } from "@/lib/categorias";
import { doPeriodo, totaisPorCategoria } from "@/lib/totais";
import { NOME_DO_TIPO, TIPOS, type Tipo } from "@/lib/tipos";

/**
 * Para onde o dinheiro foi.
 *
 * O saldo responde "quanto sobrou"; esta tela responde "sobrou pouco por quê",
 * que é a pergunta que faz alguém mudar alguma coisa — porque ela aponta um
 * lugar onde dá para mexer.
 *
 * Uma coluna por vez, e não as três juntas: entrada e saída não se comparam na
 * mesma lista, e o que se quer saber é sempre "das minhas saídas, quanto foi
 * para o apartamento", nunca "do meu dinheiro todo".
 */
export function TelaDosTotais() {
  const agora = hoje();
  const inicial = partesDaData(agora);
  const [ano, setAno] = useState(inicial.ano);
  const [mes, setMes] = useState<number | null>(inicial.mes);
  const [tipo, setTipo] = useState<Tipo>("DIARIO");

  const estado = useEstado();
  const categorias = categoriasDe(estado);
  const lancamentos = doPeriodo(lancamentosVivos(estado), ano, mes);
  const totais = totaisPorCategoria(lancamentos, categorias, tipo);

  function andar(passos: number) {
    if (mes === null) {
      setAno(ano + passos);
      return;
    }
    const bruto = mes - 1 + passos;
    setMes((((bruto % 12) + 12) % 12) + 1);
    setAno(ano + Math.floor(bruto / 12));
  }

  return (
    <div>
      <Sobrescrito>Para onde foi</Sobrescrito>
      <Titulo className="mt-0.5">Totais</Titulo>

      <div className="lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="lg:sticky lg:top-8">
          <header className="mt-3 flex items-center justify-between gap-2">
            <Seta rotulo="Anterior" onClick={() => andar(-1)}>
              ‹
            </Seta>
            <button
              type="button"
              onClick={() => setMes(mes === null ? inicial.mes : null)}
              className="rounded-folha bg-cartao px-4 py-2 text-[16px] font-medium shadow-baixa"
            >
              {mes === null ? `${ano} inteiro` : `${nomeDoMes(mes)} ${ano}`}
            </button>
            <Seta rotulo="Próximo" onClick={() => andar(1)}>
              ›
            </Seta>
          </header>
          <p className="mt-1.5 text-center text-[12.5px] text-fosco">
            Toque no período para {mes === null ? "voltar ao mês" : "ver o ano inteiro"}
          </p>

          <div className="mt-4 flex gap-1.5">
            {TIPOS.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tipo === t}
                onClick={() => setTipo(t)}
                className={`min-h-[40px] flex-1 rounded-folha text-[15px] shadow-baixa ${
                  tipo === t ? "bg-heroi font-semibold text-heroi-tinta" : "bg-cartao text-tinta"
                }`}
              >
                {NOME_DO_TIPO[t]}
              </button>
            ))}
          </div>

          <Cartao className="mt-3 px-5 py-4">
            <Sobrescrito>
              {NOME_DO_TIPO[tipo]} {mes === null ? `em ${ano}` : `em ${nomeDoMes(mes)}`}
            </Sobrescrito>
            <p className="tabular mt-1 text-[32px] font-bold leading-none tracking-tight">
              {comCifrao(totais.totalCents)}
            </p>
          </Cartao>
        </div>

        <div>
          {totais.categorias.length === 0 ? (
            <div className="mt-4">
              <Aviso>
                Nada nesta coluna no período. Se você acabou de começar a marcar categorias, só os
                lançamentos novos aparecem aqui — os antigos ficam em “Sem categoria” até você abrir
                e escolher.
              </Aviso>
            </div>
          ) : (
            <section className="mt-5 lg:mt-3">
              <Subtitulo className="mb-2">Por categoria</Subtitulo>
              <Cartao className="px-4 py-1">
                {totais.categorias.map((c) => (
                  <div key={c.id} className="border-b border-linha py-3 last:border-b-0">
                    <div className="flex items-baseline justify-between gap-3">
                      {/* "Sem categoria" é o único nome que leva a algum lugar: ele é
                      o convite, e aparece exatamente onde incomoda. */}
                      {c.nome === SEM_CATEGORIA ? (
                        <Link
                          href="/classificar"
                          className="min-w-0 truncate text-[15px] font-medium"
                        >
                          {c.nome}{" "}
                          <span className="text-[13px] font-normal text-saldo">classificar</span>
                        </Link>
                      ) : (
                        <span className="min-w-0 truncate text-[15px] font-medium">{c.nome}</span>
                      )}
                      <span className="tabular shrink-0 text-[15px] font-semibold">
                        {comCifrao(c.centavos)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Barra parte={c.parte} />
                      <span className="tabular w-[62px] shrink-0 text-right text-[12px] text-fosco">
                        {Math.round(c.parte * 100)}% · {c.quantos}
                      </span>
                    </div>
                  </div>
                ))}
              </Cartao>
              <p className="mt-2 px-1 text-[12.5px] leading-snug text-fosco">
                A porcentagem é sobre o total desta coluna no período, e o número ao lado é quantos
                lançamentos entraram na linha. Previsto conta junto: um mês pela metade respondido
                só pelo confirmado não responde nada.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A barra é o desenho da mesma fatia que o número ao lado já diz — serve para
 * comparar as linhas de relance, não para ser lida sozinha. Por isso não tem
 * cor própria: cor aqui sugeriria um sentido que a categoria não tem.
 */
function Barra({ parte }: { parte: number }) {
  return (
    <span className="block h-[6px] flex-1 overflow-hidden rounded-full bg-papel">
      <span
        className="block h-full rounded-full bg-grafite"
        style={{ width: `${Math.max(parte * 100, parte > 0 ? 2 : 0)}%` }}
      />
    </span>
  );
}
