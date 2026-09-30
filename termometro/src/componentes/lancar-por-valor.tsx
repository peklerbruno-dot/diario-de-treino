"use client";

import { useMemo, useRef, useState } from "react";
import { emReais, comCifrao } from "@/lib/dinheiro";
import { lancamentosVivos, loja } from "@/lib/loja";
import { valoresRapidos } from "@/lib/valores-rapidos";
import { Sobrescrito, Subtitulo } from "./pecas";
import { useEstado } from "./usar-loja";

/**
 * "Gastei R$ 15" num toque.
 *
 * Uma grade de valores em vez de uma lista de coisas: quem sai do caixa sabe
 * quanto pagou antes de pensar em como chamar o gasto. Um toque lança no
 * Diário de hoje e acabou; o Desfazer que aparece embaixo é a rede de
 * segurança. Categoria e observação ficam para depois (tocar no lançamento
 * abre a edição), porque pedir isso agora é o que faz ninguém lançar.
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

  // O ✓ que confirma o toque no próprio botão, por um instante.
  const [tocado, setTocado] = useState<number | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Um toque fantasma (o iPhone às vezes entrega o mesmo toque duas vezes)
  // não pode virar dois cafés. Dois toques DE PROPÓSITO no mesmo valor, com
  // um respiro entre eles, continuam valendo dois.
  const ultimo = useRef<{ valor: number; quando: number } | null>(null);

  function tocar(valorCents: number) {
    const agora = Date.now();
    if (
      ultimo.current &&
      ultimo.current.valor === valorCents &&
      agora - ultimo.current.quando < 450
    ) {
      return;
    }
    ultimo.current = { valor: valorCents, quando: agora };
    loja.lancarRapido(valorCents, data);
    setTocado(valorCents);
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = setTimeout(() => setTocado(null), 900);
  }

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <Subtitulo>Gastei</Subtitulo>
        <span className="text-[12.5px] text-fosco">um toque lança no diário de hoje</span>
      </div>

      {valores.deSempre.length > 0 && (
        <>
          <Sobrescrito className="mt-3">Os seus de sempre</Sobrescrito>
          <Grade valores={valores.deSempre} tocado={tocado} aoTocar={tocar} destaque />
        </>
      )}

      {valores.deSempre.length > 0 && <Sobrescrito className="mt-4">Redondos</Sobrescrito>}
      <Grade valores={valores.escada} tocado={tocado} aoTocar={tocar} />

      {valores.medianaCents !== null && (
        <p className="mt-2.5 text-[12.5px] leading-snug text-fosco">
          Metade dos seus gastos do dia a dia fica até {comCifrao(valores.medianaCents)}; os botões
          vão até onde cabem quase todos eles.
        </p>
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
            aria-label={`Lançar ${comCifrao(v)} no diário de hoje`}
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
