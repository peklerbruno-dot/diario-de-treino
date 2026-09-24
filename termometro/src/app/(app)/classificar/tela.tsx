"use client";

import Link from "next/link";
import { useState } from "react";
import { Aviso, Cartao, Sobrescrito, Subtitulo, Titulo } from "@/componentes/pecas";
import { useEstado } from "@/componentes/usar-loja";
import { categoriasDoTipo } from "@/lib/categorias";
import { aClassificar, quantosSemCategoria, type GrupoSemCategoria } from "@/lib/classificar";
import { comCifrao } from "@/lib/dinheiro";
import { categoriasDe, lancamentosVivos, loja } from "@/lib/loja";
import { NOME_DO_TIPO } from "@/lib/tipos";

/**
 * Classificar o que veio da planilha.
 *
 * Um por um, 815 vezes, ninguém faz — e a aba Totais ficaria para sempre
 * dizendo "sem categoria, 96%", que é o mesmo que não ter categoria nenhuma.
 * Juntando por nota, centenas de lançamentos viram uma dúzia de decisões.
 *
 * Os grupos vêm do maior para o menor em dinheiro: é onde está o que muda a
 * resposta da tela de totais, e é por onde vale começar quando a paciência dá
 * para três toques.
 */
export function TelaDeClassificar() {
  const estado = useEstado();
  const categorias = categoriasDe(estado);
  const lancamentos = lancamentosVivos(estado);
  const grupos = aClassificar(lancamentos);
  const faltam = quantosSemCategoria(lancamentos);

  const [feitos, setFeitos] = useState(0);

  function classificar(grupo: GrupoSemCategoria, categoria: string) {
    const porId = new Map(lancamentos.map((l) => [l.id, l]));
    const mudados = grupo.ids
      .map((id) => porId.get(id))
      .filter((l) => l !== undefined)
      .map((l) => ({ ...l, categoria }));

    loja.salvarVariosLancamentos(mudados);
    setFeitos((n) => n + mudados.length);
  }

  return (
    <div>
      <Sobrescrito>O que veio da planilha</Sobrescrito>
      <Titulo className="mt-0.5">Classificar</Titulo>

      {grupos.length === 0 ? (
        <div className="mt-4">
          <Aviso>
            {feitos > 0
              ? `Pronto — ${feitos} lançamento${feitos === 1 ? "" : "s"} classificado${
                  feitos === 1 ? "" : "s"
                }. Não sobrou nenhum sem categoria.`
              : "Nenhum lançamento sem categoria. Não há o que fazer aqui."}
            <span className="mt-2 block">
              <Link href="/totais" className="text-saldo underline">
                Ver os totais
              </Link>
            </span>
          </Aviso>
        </div>
      ) : (
        <>
          <p className="mt-2 text-[14.5px] leading-relaxed text-grafite">
            Faltam <b>{faltam}</b> lançamentos sem categoria, em <b>{grupos.length}</b> grupos. Um
            toque classifica o grupo inteiro — a planilha repetia “aluguel” doze vezes, e quem diz
            “aluguel” uma vez está dizendo das doze.
          </p>
          {feitos > 0 && (
            <p className="mt-1.5 text-[13px] text-entrada" role="status">
              {feitos} classificado{feitos === 1 ? "" : "s"} até agora.
            </p>
          )}

          <div className="mt-4 space-y-2">
            {grupos.map((g) => (
              <Cartao key={g.chave} className="px-4 py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[15.5px] font-medium">
                    {g.nota ?? <span className="text-fosco">sem nota</span>}
                  </span>
                  <span className="tabular shrink-0 text-[15px] font-semibold">
                    {comCifrao(g.totalCents)}
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-fosco">
                  {NOME_DO_TIPO[g.tipo]} · {g.quantos} lançamento{g.quantos === 1 ? "" : "s"}
                </p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {categoriasDoTipo(categorias, g.tipo).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => classificar(g, c.id)}
                      className="min-h-[34px] rounded-full bg-papel px-3.5 text-[13.5px] text-tinta"
                    >
                      {c.nome}
                    </button>
                  ))}
                </div>
              </Cartao>
            ))}
          </div>

          <p className="mt-4 px-1 text-[12.5px] leading-snug text-fosco">
            Dá para parar no meio e voltar depois: o que já foi classificado fica. E dá para mudar
            um lançamento sozinho a qualquer momento, abrindo o dia.
          </p>
        </>
      )}
    </div>
  );
}
