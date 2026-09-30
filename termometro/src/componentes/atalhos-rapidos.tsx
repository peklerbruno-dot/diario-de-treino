"use client";

import { useState } from "react";
import { CHAVE_DOS_ATALHOS, partidaDoAtalho, type AtalhoFixo } from "@/lib/atalhos";
import { curta } from "@/lib/datas";
import { emReais } from "@/lib/dinheiro";
import { atalhosDe } from "@/lib/loja";
import { NOME_DO_TIPO } from "@/lib/tipos";
import { FolhaDeLancamento } from "./folha-de-lancamento";
import { Sobrescrito } from "./pecas";
import { useEstado } from "./usar-loja";

/**
 * A fileira de lançamento rápido da tela Hoje.
 *
 * Embaixo dos lançamentos do dia havia espaço vazio e, todo dia, os mesmos três
 * gastos para registrar. O atalho guarda o que não muda — a coluna, a categoria
 * e a observação — e deixa na tela só a pergunta que muda: quanto.
 *
 * Tocar num atalho **abre a folha de sempre**, já preenchida, em vez de gravar
 * direto. É um toque a mais e um arrependimento a menos: um botão que lança
 * sozinho é um jeito novo de registrar R$ 40 sem ver, e desfazer custa mais
 * caro do que conferir.
 */
export function AtalhosRapidos({ data }: { data: string }) {
  const estado = useEstado();
  const atalhos = atalhosDe(estado);
  const [tocado, setTocado] = useState<AtalhoFixo | null>(null);

  // O jeito rápido padrão agora são os botões de valor ("Gastei"). Os atalhos
  // com nome só aparecem depois que você monta os seus em Ajustes — os três
  // palpites de exemplo, sozinhos, eram exatamente o "foco no que foi
  // consumido" que você não queria na tela inicial.
  if (estado.ajustes[CHAVE_DOS_ATALHOS] === undefined || atalhos.length === 0) return null;

  return (
    <section className="mt-5">
      <Sobrescrito>Lançar rápido</Sobrescrito>

      {/* A fileira sangra até a borda da tela no celular: um botão cortado na
          margem é o que conta que há mais coisa para o lado. No computador ela
          quebra em linhas, porque lá sobra largura e rolar de lado com o mouse
          é pior do que só olhar.
          `relative` não é enfeite: um filho posicionado em `absolute` só é
          recortado por um ancestral posicionado. Sem ele, um texto escondido
          dentro de um botão fora da vista continuava contando para a largura
          da página — e o app inteiro passava a rolar de lado no celular. */}
      <div className="fileira relative -mx-4 mt-1.5 flex gap-2 px-4 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        {atalhos.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setTocado(a)}
            // O nome vai no rótulo, e não num texto escondido dentro do
            // botão: é uma frase só para quem ouve a tela, em vez de o título
            // e a explicação chegarem grudados.
            aria-label={`${a.titulo} — ${NOME_DO_TIPO[a.tipo].toLowerCase()}, lançar em ${curta(data)}`}
            className="flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-cartao px-4 text-[14.5px] text-tinta shadow-baixa"
          >
            {a.titulo}
            {a.valorPadraoCents !== null && a.valorPadraoCents > 0 && (
              <span className="tabular text-[12.5px] text-fosco">
                {emReais(a.valorPadraoCents)}
              </span>
            )}
          </button>
        ))}
      </div>

      {tocado && (
        <FolhaDeLancamento
          data={data}
          partida={partidaDoAtalho(tocado)}
          aoFechar={() => setTocado(null)}
        />
      )}
    </section>
  );
}
