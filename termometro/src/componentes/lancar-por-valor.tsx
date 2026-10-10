"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { emReais, comCifrao } from "@/lib/dinheiro";
import { categoriaPelaNota } from "@/lib/busca";
import { categoriasDoTipo } from "@/lib/categorias";
import { categoriasDe, lancamentosVivos, loja } from "@/lib/loja";
import {
  CHAVE_DOS_VALORES,
  categoriasPorUso,
  lerPreferencias,
  valoresRapidos,
} from "@/lib/valores-rapidos";
import { FolhaDeLancamento } from "./folha-de-lancamento";
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
 * Os valores vêm de `valoresRapidos`: os que você usa, em destaque, e
 * redondos tapando os buracos. O último botão, "Outro", abre o teclado.
 */
export function LancarPorValor({ data }: { data: string }) {
  const estado = useEstado();
  const preferencias = estado.ajustes[CHAVE_DOS_VALORES]?.valor;
  const valores = useMemo(
    () => valoresRapidos(lancamentosVivos(estado), data, lerPreferencias(preferencias)),
    // Só os lançamentos e as preferências importam; a sincronização mexendo
    // no resto do estado não precisa recalcular a grade.
    [estado.lancamentos, preferencias, data],
  );

  // O valor tocado, esperando a categoria. Nulo é a confirmação fechada.
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const [outroValor, setOutroValor] = useState(false);
  // O ✓ que confirma, no próprio botão, que o lançamento entrou.
  const [tocado, setTocado] = useState<number | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  function lancou(valorCents: number) {
    setEscolhido(null);
    setTocado(valorCents);
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = setTimeout(() => setTocado(null), 900);
  }

  const temSeus = valores.botoes.some((b) => b.seu);

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <Subtitulo>Gastei</Subtitulo>
        <span className="text-[12.5px] text-fosco">toque no valor, depois na categoria</span>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
        {valores.botoes.map(({ valorCents: v, seu }) => {
          const acabou = tocado === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setEscolhido(v)}
              aria-label={`Gastei ${comCifrao(v)}`}
              className={`flex min-h-[50px] touch-manipulation items-center justify-center rounded-folha shadow-baixa transition-transform active:scale-95 ${
                acabou
                  ? "bg-heroi text-heroi-tinta"
                  : seu
                    ? "bg-cartao text-tinta ring-1 ring-regua"
                    : "bg-cartao text-grafite"
              }`}
            >
              {acabou ? (
                <span className="text-[16px] font-semibold">✓</span>
              ) : (
                <span className="flex items-baseline gap-1">
                  <span className="text-[11px] text-fosco">R$</span>
                  <span className={`tabular text-[17px] ${seu ? "font-bold" : "font-medium"}`}>
                    {emReais(v)}
                  </span>
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setOutroValor(true)}
          className="flex min-h-[50px] touch-manipulation items-center justify-center rounded-folha bg-papel text-[15px] text-tinta ring-1 ring-regua active:scale-95"
        >
          Outro
        </button>
      </div>

      <p className="mt-2.5 text-[12.5px] leading-snug text-fosco">
        {temSeus
          ? "Em destaque, os valores que você mais usa; os outros tapam os buracos. "
          : "Conforme você usa, os seus valores de sempre aparecem aqui. "}
        <Link href="/ajustes#botoes-do-gastei" className="underline">
          Escolher os botões
        </Link>
      </p>

      {escolhido !== null && (
        <ConfirmarValor
          valorCents={escolhido}
          data={data}
          aoLancar={() => lancou(escolhido)}
          aoFechar={() => setEscolhido(null)}
        />
      )}

      {outroValor && (
        <FolhaDeLancamento data={data} tipoInicial="DIARIO" aoFechar={() => setOutroValor(false)} />
      )}
    </section>
  );
}

const CHAVE_DO_CREDITO = "financas-bp:ultimo-credito";
const lembrarCredito = (): boolean => {
  try {
    return window.localStorage.getItem(CHAVE_DO_CREDITO) === "1";
  } catch {
    return false;
  }
};
const guardarCredito = (credito: boolean) => {
  try {
    window.localStorage.setItem(CHAVE_DO_CREDITO, credito ? "1" : "0");
  } catch {
    // Sem armazenamento, a escolha vale só para este lançamento.
  }
};

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
  // O jeito de pagar fica entre um lançamento e o seguinte: quem usa mais o
  // crédito não precisa marcá-lo toda vez.
  const [credito, setCredito] = useState(lembrarCredito);
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
    guardarCredito(credito);
    loja.lancarRapido(valorCents, data, { categoria, nota, credito });
    aoLancar();
  }

  return (
    <Folha titulo={`Gastei ${comCifrao(valorCents)}`} aoFechar={aoFechar}>
      <div className="mb-3 flex gap-2" role="group" aria-label="Como pagou">
        {([false, true] as const).map((c) => (
          <button
            key={String(c)}
            type="button"
            aria-pressed={credito === c}
            onClick={() => setCredito(c)}
            className={`min-h-[40px] flex-1 rounded-full text-[14.5px] shadow-baixa ${
              credito === c ? "bg-heroi font-semibold text-heroi-tinta" : "bg-cartao text-tinta"
            }`}
          >
            {c ? "No crédito" : "Débito / Pix"}
          </button>
        ))}
      </div>
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
