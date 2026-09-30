"use client";

import { useMemo, useRef, useState } from "react";
import { emReais, comCifrao } from "@/lib/dinheiro";
import { categoriaPelaNota } from "@/lib/busca";
import { categoriasDoTipo } from "@/lib/categorias";
import { categoriasDe, lancamentosVivos, loja } from "@/lib/loja";
import { categoriasPorUso, valoresRapidos } from "@/lib/valores-rapidos";
import { Botao, CampoDeTexto, Folha, Sobrescrito, Subtitulo } from "./pecas";
import { useEstado } from "./usar-loja";

/**
 * "Gastei R$ 15" em dois toques: o valor, e a categoria.
 *
 * Uma grade de valores em vez de uma lista de coisas: quem sai do caixa sabe
 * quanto pagou antes de pensar em como chamar o gasto. O toque no valor abre
 * uma confirmação curta; tocar numa categoria ali JÁ LANÇA — o segundo toque é
 * a escolha, não um "Salvar" a mais. Quem quiser escreve uma observação antes;
 * quem não quiser categoria tem "Lançar sem categoria"; e fechar cancela.
 *
 * Os valores vêm de `valoresRapidos`: uma escada fixa até onde cobre 95% dos
 * seus gastos, mais os valores quebrados que você repete.
 */
export function LancarPorValor({ data }: { data: string }) {
  const estado = useEstado();
  const valores = useMemo(
    () => valoresRapidos(lancamentosVivos(estado), data),
    // Só os lançamentos importam; a sincronização mexendo no resto do estado
    // não precisa recalcular a grade.
    [estado.lancamentos, data],
  );

  // O valor tocado, esperando a categoria. Nulo é a confirmação fechada.
  const [escolhido, setEscolhido] = useState<number | null>(null);
  // O ✓ que confirma, no próprio botão, que o lançamento entrou.
  const [tocado, setTocado] = useState<number | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  function lancou(valorCents: number) {
    setEscolhido(null);
    setTocado(valorCents);
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = setTimeout(() => setTocado(null), 900);
  }

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <Subtitulo>Gastei</Subtitulo>
        <span className="text-[12.5px] text-fosco">toque no valor, depois na categoria</span>
      </div>

      {valores.deSempre.length > 0 && (
        <>
          <Sobrescrito className="mt-3">Os seus de sempre</Sobrescrito>
          <Grade valores={valores.deSempre} tocado={tocado} aoTocar={setEscolhido} destaque />
        </>
      )}

      {valores.deSempre.length > 0 && <Sobrescrito className="mt-4">Redondos</Sobrescrito>}
      <Grade valores={valores.escada} tocado={tocado} aoTocar={setEscolhido} />

      {valores.medianaCents !== null && (
        <p className="mt-2.5 text-[12.5px] leading-snug text-fosco">
          Metade dos seus gastos do dia a dia fica até {comCifrao(valores.medianaCents)}; os botões
          vão até onde cabem quase todos eles.
        </p>
      )}

      {escolhido !== null && (
        <ConfirmarValor
          valorCents={escolhido}
          data={data}
          aoLancar={() => lancou(escolhido)}
          aoFechar={() => setEscolhido(null)}
        />
      )}
    </section>
  );
}

function Grade({
  valores,
  tocado,
  aoTocar,
  destaque,
}: {
  valores: number[];
  tocado: number | null;
  aoTocar: (valorCents: number) => void;
  destaque?: boolean;
}) {
  return (
    <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
      {valores.map((v) => {
        const acabou = tocado === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => aoTocar(v)}
            aria-label={`Gastei ${comCifrao(v)}`}
            className={`flex min-h-[50px] touch-manipulation items-center justify-center rounded-folha shadow-baixa transition-transform active:scale-95 ${
              acabou
                ? "bg-heroi text-heroi-tinta"
                : destaque
                  ? "bg-cartao text-tinta ring-1 ring-regua"
                  : "bg-cartao text-tinta"
            }`}
          >
            {acabou ? (
              <span className="text-[16px] font-semibold">✓</span>
            ) : (
              <span className="flex items-baseline gap-1">
                <span className="text-[11px] text-fosco">R$</span>
                <span className="tabular text-[17px] font-semibold">{emReais(v)}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A confirmação de um valor: categoria num toque, observação se quiser.
 *
 * As categorias do Diário vêm na ordem em que você mais usa, e a que a
 * observação sugere (a mesma nota já levou essa categoria antes) ganha um
 * contorno — sugestão, nunca escolha automática. Os botões vêm antes do campo
 * de texto de propósito: no iPhone o teclado sobe por cima da metade de baixo
 * da tela, e o que precisa continuar à vista enquanto se digita são eles.
 */
function ConfirmarValor({
  valorCents,
  data,
  aoLancar,
  aoFechar,
}: {
  valorCents: number;
  data: string;
  aoLancar: () => void;
  aoFechar: () => void;
}) {
  const estado = useEstado();
  const [nota, setNota] = useState("");
  const jaLancou = useRef(false);

  const vivos = lancamentosVivos(estado);
  const categorias = categoriasPorUso(
    categoriasDoTipo(categoriasDe(estado), "DIARIO"),
    vivos,
    data,
  );
  const sugerida = nota.trim() ? categoriaPelaNota(vivos, nota) : null;

  function lancar(categoria: string | null) {
    // Um toque duplo na categoria é um lançamento, não dois.
    if (jaLancou.current) return;
    jaLancou.current = true;
    loja.lancarRapido(valorCents, data, { categoria, nota });
    aoLancar();
  }

  return (
    <Folha titulo={`Gastei ${comCifrao(valorCents)}`} aoFechar={aoFechar}>
      <Sobrescrito>No quê? Um toque já lança</Sobrescrito>
      <div className="mt-2 flex flex-wrap gap-2">
        {categorias.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => lancar(c.id)}
            className={`min-h-[44px] touch-manipulation rounded-full bg-cartao px-4 text-[15px] text-tinta shadow-baixa active:scale-95 ${
              sugerida === c.id ? "ring-2 ring-saldo" : ""
            }`}
          >
            {c.nome}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <CampoDeTexto
          valor={nota}
          aoMudar={setNota}
          placeholder="Observação (opcional)"
          maxLength={500}
        />
      </div>

      <div className="mt-3 flex gap-2">
        <Botao onClick={() => lancar(null)} className="flex-1">
          Lançar sem categoria
        </Botao>
      </div>
      <p className="mt-2 text-[12.5px] text-fosco">
        Entra no Diário de hoje. Fechar esta janela cancela.
      </p>
    </Folha>
  );
}
