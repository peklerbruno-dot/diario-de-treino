"use client";

import { useEffect, useRef } from "react";

/**
 * O valor por rolagem: quatro rodas de dígito, como a combinação de um cadeado.
 *
 * É a alternativa ao teclado para quem prefere escorregar o dedo até o número a
 * digitá-lo. Quatro rodas (milhar, centena, dezena, unidade) cobrem de R$ 0 a
 * R$ 9.999 sem que nenhum valor fique "longe": o de R$ 53 são duas rolagens
 * curtas, e não uma lista de cinquenta e três linhas. O app guarda reais
 * inteiros, então não há roda de centavos.
 *
 * A rolagem é a do navegador (com ímã, `scroll-snap`), então o dedo ganha a
 * inércia e a física do iPhone sem nenhuma biblioteca. O valor sobe ao vivo,
 * conforme cada dígito passa pelo meio, e tocar num número leva a roda até ele.
 */
const ALTURA = 44; // px de cada dígito
const LINHAS = 5; // quantos aparecem de uma vez; o do meio é o escolhido
const DIGITOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function RodaDeValor({
  reais,
  aoMudar,
}: {
  reais: number;
  aoMudar: (reais: number) => void;
}) {
  const valor = Math.min(9999, Math.max(0, Math.floor(reais)));
  const digitos = [
    Math.floor(valor / 1000) % 10,
    Math.floor(valor / 100) % 10,
    Math.floor(valor / 10) % 10,
    valor % 10,
  ];
  const ROTULOS = ["milhar", "centena", "dezena", "unidade"];

  // Duas rodas podem se mexer antes de a tela redesenhar; partir sempre do último
  // valor conhecido (e não do que a renderização anterior viu) evita que uma
  // roda desfaça a outra.
  const ultimos = useRef(digitos);
  ultimos.current = digitos;

  function mudar(coluna: number, digito: number) {
    const novos = [...ultimos.current];
    novos[coluna] = digito;
    ultimos.current = novos;
    aoMudar(novos[0] * 1000 + novos[1] * 100 + novos[2] * 10 + novos[3]);
  }

  return (
    <div
      className="relative mt-3 flex items-stretch justify-center gap-1.5 rounded-folha bg-cartao px-4 shadow-baixa"
      style={{ height: ALTURA * LINHAS }}
    >
      {/* A faixa do meio: é o número que está escolhido. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-3 rounded-tecla bg-papel ring-1 ring-regua"
        style={{ top: ALTURA * Math.floor(LINHAS / 2), height: ALTURA }}
      />
      <span
        aria-hidden
        className="z-10 flex items-center pr-1 text-[15px] font-medium text-fosco"
        style={{ height: ALTURA * LINHAS }}
      >
        R$
      </span>

      {digitos.map((digito, coluna) => (
        <Coluna
          key={ROTULOS[coluna]}
          rotulo={ROTULOS[coluna]}
          digito={digito}
          // O zero à esquerda ("0053") escolhido some para o fundo: só os
          // dígitos que fazem parte do número devem saltar aos olhos.
          zeroAEsquerda={digito === 0 && coluna < 3 && valor < 10 ** (3 - coluna)}
          aoMudar={(d) => mudar(coluna, d)}
        />
      ))}

      {/* O esmaecer de cima e de baixo dá a ideia de roda. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-folha"
        style={{
          background:
            "linear-gradient(to bottom, var(--cartao) 0%, transparent 34%, transparent 66%, var(--cartao) 100%)",
        }}
      />
    </div>
  );
}

function Coluna({
  digito,
  rotulo,
  zeroAEsquerda,
  aoMudar,
}: {
  digito: number;
  rotulo: string;
  zeroAEsquerda: boolean;
  aoMudar: (d: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Põe a roda no dígito de fora (abrir a tela, voltar do teclado). Durante a
  // rolagem do próprio dedo o dígito calculado já é o que está no meio, então
  // nada é forçado e a inércia não é cortada.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (Math.round(el.scrollTop / ALTURA) !== digito) el.scrollTop = digito * ALTURA;
  }, [digito]);

  function aoRolar() {
    const el = ref.current;
    if (!el) return;
    const indice = Math.min(9, Math.max(0, Math.round(el.scrollTop / ALTURA)));
    if (indice !== digito) aoMudar(indice);
  }

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={`Dígito da ${rotulo}`}
      tabIndex={0}
      onScroll={aoRolar}
      className="relative w-14 snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ height: ALTURA * LINHAS, touchAction: "pan-y" }}
    >
      <div style={{ paddingTop: ALTURA * 2, paddingBottom: ALTURA * 2 }}>
        {DIGITOS.map((d) => (
          <button
            key={d}
            type="button"
            role="option"
            aria-selected={d === digito}
            tabIndex={-1}
            onClick={() => ref.current?.scrollTo({ top: d * ALTURA, behavior: "smooth" })}
            className={`tabular flex w-full snap-center items-center justify-center text-[26px] ${
              d === digito
                ? zeroAEsquerda
                  ? "text-fosco opacity-40"
                  : "font-semibold text-tinta"
                : "text-fosco"
            }`}
            style={{ height: ALTURA }}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
