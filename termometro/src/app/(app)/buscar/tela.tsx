"use client";

import { useState } from "react";
import { FolhaDeLancamento } from "@/componentes/folha-de-lancamento";
import { Cartao, Dinheiro, Selo, Sobrescrito, Titulo } from "@/componentes/pecas";
import { useEstado } from "@/componentes/usar-loja";
import { buscarLancamentos } from "@/lib/busca";
import { nomeDaCategoria } from "@/lib/categorias";
import { curta } from "@/lib/datas";
import { categoriasDe, lancamentosVivos } from "@/lib/loja";
import { NOME_DO_TIPO, type Lancamento, type Tipo } from "@/lib/tipos";

/**
 * "Quando foi a última vez que paguei o seguro?"
 *
 * Um campo, uma lista. Tudo está no aparelho, então a resposta aparece a cada
 * letra, sem servidor. Tocar numa linha abre o lançamento para editar — a
 * busca é também o jeito de achar aquele valor errado de três meses atrás.
 */
export function TelaDeBusca() {
  const estado = useEstado();
  const categorias = categoriasDe(estado);
  const [termo, setTermo] = useState("");
  const [editando, setEditando] = useState<Lancamento | null>(null);

  const achados = buscarLancamentos(lancamentosVivos(estado), categorias, termo);

  return (
    <div>
      <Sobrescrito>Procurar</Sobrescrito>
      <Titulo className="mt-0.5">Buscar</Titulo>

      <input
        type="search"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="seguro, ifood, mercado…"
        autoFocus
        enterKeyHint="search"
        aria-label="O que procurar"
        className="mt-4 w-full rounded-folha border border-regua bg-cartao px-4 py-3 text-[17px] outline-none focus:border-saldo"
      />

      {termo.trim().length >= 2 && achados.length === 0 && (
        <p className="mt-4 text-[15px] text-grafite">
          Nada com “{termo.trim()}” na nota nem na categoria.
        </p>
      )}

      {achados.length > 0 && (
        <Cartao className="mt-4 px-4 py-1">
          {achados.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setEditando(l)}
              className="flex w-full items-baseline justify-between gap-3 border-b border-linha py-2.5 text-left last:border-b-0"
            >
              <span className="min-w-0">
                <span className="block truncate text-[15px]">
                  {l.nota || NOME_DO_TIPO[l.tipo]}
                  {l.previsto && <Selo tom="quieto">previsto</Selo>}
                </span>
                <span className="tabular mt-0.5 block text-[12.5px] text-fosco">
                  {curta(l.data)}/{l.data.slice(0, 4)} · {NOME_DO_TIPO[l.tipo]}
                  {l.categoria ? ` · ${nomeDaCategoria(categorias, l.categoria)}` : ""}
                </span>
              </span>
              <Dinheiro cents={l.valorCents} papel={corDe(l.tipo)} />
            </button>
          ))}
          {achados.length >= 80 && (
            <p className="py-2.5 text-[12.5px] text-fosco">
              Mostrando os 80 mais recentes — refine a busca.
            </p>
          )}
        </Cartao>
      )}

      {editando && (
        <FolhaDeLancamento
          data={editando.data}
          lancamento={editando}
          aoFechar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

const corDe = (tipo: Tipo) =>
  tipo === "ENTRADA" ? "entrada" : tipo === "SAIDA" ? "saida" : "diario";
