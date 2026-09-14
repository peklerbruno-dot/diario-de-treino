"use client";

import { useMemo, useState } from "react";
import { useMachane } from "@/components/machane/provedor";
import { Cartao, CartaoCorpo, CartaoDescricao, CartaoTitulo, CartaoTopo } from "@/components/ui/card";
import { Campo, AreaTexto, Selecao } from "@/components/ui/input";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Aviso } from "@/components/ui/avisos";
import { CampoDinheiro, CampoInteiro } from "@/components/campos";
import { brl, pct } from "@/lib/dinheiro";
import { valorDoGastoCents, type TipoGasto } from "@/lib/calculo";
import {
  CATEGORIAS_GASTO,
  COR_CATEGORIA,
  TIPOS_GASTO,
  TIPO_GASTO_FORMULA,
} from "@/lib/textos";
import type { CategoriaGasto, GastoEstado } from "@/lib/estado";
import { marcarRevisado } from "@/app/actions";

function Composicao({
  fatias,
  total,
}: {
  fatias: { categoria: string; valorCents: number }[];
  total: number;
}) {
  if (total <= 0) return null;
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full border border-borda">
        {fatias.map((f) => (
          <div
            key={f.categoria}
            title={`${CATEGORIAS_GASTO[f.categoria as CategoriaGasto] ?? f.categoria}: ${brl(f.valorCents)}`}
            style={{
              width: `${(f.valorCents / total) * 100}%`,
              backgroundColor: COR_CATEGORIA[f.categoria] ?? "#999",
            }}
          />
        ))}
      </div>
      <ul className="mt-3 space-y-1 text-xs">
        {fatias.map((f) => (
          <li key={f.categoria} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: COR_CATEGORIA[f.categoria] ?? "#999" }}
            />
            <span className="flex-1">
              {CATEGORIAS_GASTO[f.categoria as CategoriaGasto] ?? f.categoria}
            </span>
            <span className="tabular text-suave">{pct(f.valorCents / total)}</span>
            <span className="tabular w-24 text-right font-medium">{brl(f.valorCents)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LinhaGasto({ g }: { g: GastoEstado }) {
  const { estado, resultado, editarGasto, removerGasto, somenteLeitura } = useMachane();
  const [revisando, setRevisando] = useState(false);
  const valor = valorDoGastoCents(g, estado.diariaCents, resultado.totalPessoas);
  const usaPessoasDias = g.tipo === "POR_DIARIA" || g.tipo === "CACHE_DIARIO";

  return (
    <div
      className={`rounded-md border p-3 ${
        g.revisado ? "border-borda bg-papel" : "border-atencao/40 bg-atencaoFundo/40"
      }`}
    >
      <div className="grid gap-2 lg:grid-cols-[minmax(160px,1.4fr)_150px_150px_120px_90px_90px_auto]">
        <Campo
          aria-label="Descrição"
          value={g.descricao}
          disabled={somenteLeitura}
          onChange={(e) => editarGasto(g.id, { descricao: e.target.value })}
        />
        <Selecao
          aria-label="Categoria"
          value={g.categoria}
          disabled={somenteLeitura}
          onChange={(e) => editarGasto(g.id, { categoria: e.target.value as CategoriaGasto })}
        >
          {Object.entries(CATEGORIAS_GASTO).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Selecao>
        <Selecao
          aria-label="Tipo de gasto"
          value={g.tipo}
          disabled={somenteLeitura}
          title={TIPO_GASTO_FORMULA[g.tipo]}
          onChange={(e) => {
            const tipo = e.target.value as TipoGasto;
            const precisa = tipo === "POR_DIARIA" || tipo === "CACHE_DIARIO";
            editarGasto(g.id, {
              tipo,
              ...(precisa && g.pessoas === undefined ? { pessoas: 1 } : {}),
              ...(precisa && g.dias === undefined ? { dias: estado.diasGrandes } : {}),
            });
          }}
        >
          {Object.entries(TIPOS_GASTO).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Selecao>
        <CampoDinheiro
          valor={g.valorCents}
          disabled={somenteLeitura || g.tipo === "POR_DIARIA"}
          aoMudar={(c) => editarGasto(g.id, { valorCents: c })}
        />
        {usaPessoasDias ? (
          <>
            <CampoInteiro
              valor={g.pessoas ?? 0}
              disabled={somenteLeitura}
              aoMudar={(n) => editarGasto(g.id, { pessoas: n })}
            />
            <CampoInteiro
              valor={g.dias ?? 0}
              max={60}
              disabled={somenteLeitura}
              aoMudar={(n) => editarGasto(g.id, { dias: n })}
            />
          </>
        ) : (
          <>
            <span className="hidden lg:block" />
            <span className="hidden lg:block" />
          </>
        )}
        <div className="flex items-center justify-end gap-2">
          <span className="tabular text-sm font-semibold">{brl(valor)}</span>
          <Botao
            variante="sutil"
            tamanho="icone"
            aria-label={`Apagar ${g.descricao}`}
            disabled={somenteLeitura}
            onClick={() => {
              if (confirm(`Apagar "${g.descricao}"?`)) void removerGasto(g.id);
            }}
          >
            ×
          </Botao>
        </div>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <AreaTexto
            aria-label="Observação"
            className="min-h-[38px] text-xs"
            value={g.observacao}
            disabled={somenteLeitura}
            placeholder="De onde veio este número? (orçamento, contrato, e-mail de quem, quando)"
            onChange={(e) => editarGasto(g.id, { observacao: e.target.value })}
          />
          {!g.observacao.trim() ? (
            <p className="mt-1 text-[11px] text-erro">
              Sem observação. Em seis meses ninguém vai lembrar de onde saiu este valor — e a
              machané não pode ser publicada assim.
            </p>
          ) : null}
          <p className="mt-1 text-[11px] text-suave">{TIPO_GASTO_FORMULA[g.tipo]}</p>
        </div>
        {!g.revisado ? (
          <Botao
            variante="contorno"
            tamanho="pequeno"
            disabled={somenteLeitura || revisando}
            onClick={() => {
              setRevisando(true);
              void marcarRevisado(g.id, true).then((r) => {
                setRevisando(false);
                if (r.ok) editarGasto(g.id, { revisado: true });
              });
            }}
          >
            Conferi este valor
          </Botao>
        ) : null}
      </div>

      {!g.revisado ? (
        <p className="mt-2 text-[11px] text-atencao">
          <Selo variante="atencao">não revisado</Selo> herdado de outra machané — confira antes de
          publicar.
        </p>
      ) : null}
    </div>
  );
}

export function TelaCustos() {
  const { estado, resultado, adicionarGasto, somenteLeitura } = useMachane();
  const [filtro, setFiltro] = useState<"todos" | "nao-revisados">("todos");

  const porCategoria = useMemo(() => {
    const grupos = new Map<CategoriaGasto, GastoEstado[]>();
    for (const g of estado.gastos) {
      const atual = grupos.get(g.categoria) ?? [];
      atual.push(g);
      grupos.set(g.categoria, atual);
    }
    return Array.from(grupos.entries()).sort((a, b) => {
      const soma = (lista: GastoEstado[]) =>
        lista.reduce(
          (s, g) => s + valorDoGastoCents(g, estado.diariaCents, resultado.totalPessoas),
          0,
        );
      return soma(b[1]) - soma(a[1]);
    });
  }, [estado.gastos, estado.diariaCents, resultado.totalPessoas]);

  const naoRevisados = estado.gastos.filter((g) => !g.revisado).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Cartao>
          <CartaoTopo className="flex items-start justify-between gap-3">
            <div>
              <CartaoTitulo>Gastos fixos</CartaoTitulo>
              <CartaoDescricao>
                Tudo que não é diária de participante. A soma percorre a lista inteira — não há
                intervalo de linhas para errar.
              </CartaoDescricao>
            </div>
            <Botao onClick={() => void adicionarGasto()} disabled={somenteLeitura}>
              Novo gasto
            </Botao>
          </CartaoTopo>
          <CartaoCorpo className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              Total de gastos fixos:{" "}
              <strong className="tabular">{brl(resultado.gastosFixosCents)}</strong>
            </span>
            <span className="text-suave">
              + hospedagem {brl(resultado.hospedagemCents)} ={" "}
              <strong className="tabular text-texto">{brl(resultado.custoTotalCents)}</strong>
            </span>
            {naoRevisados > 0 ? (
              <Botao
                variante={filtro === "nao-revisados" ? "padrao" : "contorno"}
                tamanho="pequeno"
                onClick={() =>
                  setFiltro(filtro === "nao-revisados" ? "todos" : "nao-revisados")
                }
              >
                {naoRevisados} sem revisão
              </Botao>
            ) : null}
          </CartaoCorpo>
        </Cartao>

        <Cartao>
          <CartaoTopo>
            <CartaoTitulo>Composição</CartaoTitulo>
          </CartaoTopo>
          <CartaoCorpo>
            <Composicao
              fatias={resultado.gastosPorCategoria}
              total={resultado.gastosFixosCents}
            />
          </CartaoCorpo>
        </Cartao>
      </div>

      {porCategoria.map(([categoria, gastos]) => {
        const visiveis = filtro === "nao-revisados" ? gastos.filter((g) => !g.revisado) : gastos;
        if (visiveis.length === 0) return null;
        const subtotal = gastos.reduce(
          (s, g) => s + valorDoGastoCents(g, estado.diariaCents, resultado.totalPessoas),
          0,
        );
        return (
          <Cartao key={categoria}>
            <CartaoTopo className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: COR_CATEGORIA[categoria] }}
                />
                <CartaoTitulo>{CATEGORIAS_GASTO[categoria]}</CartaoTitulo>
                <span className="text-xs text-suave">{gastos.length} linha(s)</span>
              </div>
              <span className="tabular text-sm font-semibold">{brl(subtotal)}</span>
            </CartaoTopo>
            <CartaoCorpo className="space-y-2">
              {visiveis.map((g) => (
                <LinhaGasto key={g.id} g={g} />
              ))}
            </CartaoCorpo>
          </Cartao>
        );
      })}

      {estado.gastos.length === 0 ? (
        <Aviso tom="neutro">
          Nenhum gasto fixo ainda. Transporte, alimentação, seguro, cachês, material e o fundo de
          bolsas entram aqui.
        </Aviso>
      ) : null}
    </div>
  );
}
