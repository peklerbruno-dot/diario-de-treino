"use client";

import { useEffect, useState } from "react";
import { avaliar, paraOVisor, teclar } from "@/lib/calculadora";
import { comCifrao } from "@/lib/dinheiro";
import { RodaDeValor } from "./roda-de-valor";

/**
 * O teclado do app, e não o do iPhone.
 *
 * O teclado numérico do iOS **não tem a tecla de mais**. Enquanto o valor era
 * um campo de texto comum, a soma que a planilha ensinou — "195+15+83" — só
 * funcionava em computador; no celular não havia como digitar o sinal. Este
 * teclado resolve isso, e de quebra tira três incômodos do caminho: não some
 * com metade da tela, não dá zoom ao focar, e não tem tecla de letra para
 * errar.
 *
 * O visor mostra o resultado enquanto se digita, porque uma conta que só se
 * confere depois de salvar não serve para nada.
 */

const TECLAS = [
  ["7", "8", "9", "/"],
  ["4", "5", "6", "*"],
  ["1", "2", "3", "-"],
  ["0", "00", "⌫", "+"],
] as const;

const DESENHO: Record<string, string> = {
  "/": "÷",
  "*": "×",
  "-": "−",
  "+": "+",
};
const NOME: Record<string, string> = {
  "/": "dividido por",
  "*": "vezes",
  "-": "menos",
  "+": "mais um lançamento",
  "⌫": "apagar",
  "00": "dois zeros",
};

/** O jeito de dizer o valor — digitar ou rolar — fica guardado neste aparelho. */
const CHAVE_DO_MODO = "financas-bp:modo-do-valor";
type Modo = "teclado" | "rolar";

function lerModo(): Modo {
  try {
    return window.localStorage.getItem(CHAVE_DO_MODO) === "rolar" ? "rolar" : "teclado";
  } catch {
    return "teclado";
  }
}

export function Teclado({ valor, aoMudar }: { valor: string; aoMudar: (novo: string) => void }) {
  const conta = avaliar(valor);
  const varios = (conta?.parcelas.length ?? 0) > 1;

  // O servidor renderiza com o teclado; quem preferiu rolar troca na primeira
  // pintura, em vez de a tela nascer diferente nos dois lados.
  const [modo, setModo] = useState<Modo>("teclado");
  useEffect(() => setModo(lerModo()), []);

  function escolher(novo: Modo) {
    setModo(novo);
    try {
      window.localStorage.setItem(CHAVE_DO_MODO, novo);
    } catch {
      // Sem armazenamento, a escolha vale só até fechar a tela.
    }
  }

  return (
    <div>
      <div className="rounded-folha bg-cartao px-4 py-3 shadow-baixa">
        <div className="mb-1 flex justify-end">
          <span
            role="group"
            aria-label="Como dizer o valor"
            className="inline-flex rounded-full bg-papel p-0.5 text-[12.5px] ring-1 ring-regua"
          >
            {(["teclado", "rolar"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={modo === m}
                onClick={() => escolher(m)}
                className={`min-h-[30px] rounded-full px-3 ${
                  modo === m ? "bg-cartao font-semibold text-tinta shadow-baixa" : "text-fosco"
                }`}
              >
                {m === "teclado" ? "Digitar" : "Rolar"}
              </button>
            ))}
          </span>
        </div>
        <p
          className="tabular min-h-[34px] text-[27px] font-semibold tracking-tight"
          aria-live="off"
        >
          {paraOVisor(valor) || <span className="text-fosco">0</span>}
        </p>
        <p className="mt-0.5 text-[13px] text-grafite" aria-live="polite">
          {conta ? (
            <>
              <span className="tabular">= {comCifrao(conta.totalCents)}</span>
              {varios && (
                <span className="text-fosco">
                  {" · "}vira {conta.parcelas.length} lançamentos
                </span>
              )}
            </>
          ) : (
            <span className="text-fosco">
              {modo === "rolar"
                ? "Role cada coluna até o valor, em reais inteiros."
                : "Digite o valor, em reais inteiros. Dá para somar: 195 + 15 + 83."}
            </span>
          )}
        </p>
      </div>

      {modo === "rolar" ? (
        <>
          <RodaDeValor
            reais={conta ? Math.floor(conta.totalCents / 100) : 0}
            aoMudar={(reais) => aoMudar(reais > 0 ? String(reais) : "")}
          />
          {varios && (
            <p className="mt-2 text-[12.5px] leading-snug text-fosco">
              Mexer na roda troca a soma por um valor só. Para somar, volte para <b>Digitar</b>.
            </p>
          )}
        </>
      ) : (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {TECLAS.flat().map((tecla) => {
            const operador = tecla in DESENHO;
            return (
              <button
                key={tecla}
                type="button"
                aria-label={NOME[tecla]}
                onClick={() => aoMudar(teclar(valor, tecla))}
                className={`flex h-[54px] items-center justify-center rounded-tecla text-[21px] shadow-baixa ${
                  operador ? "bg-linha text-grafite" : "bg-cartao text-tinta"
                }`}
              >
                {DESENHO[tecla] ?? tecla}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * A explicação curta de por que há dois tipos de sinal. Fica junto do teclado
 * na primeira vez, e some depois — mas o texto precisa existir em algum lugar,
 * porque a diferença não é adivinhável.
 */
export function ComoAsTeclasFuncionam() {
  return (
    <p className="mt-3 text-[12.5px] leading-snug text-fosco">
      <b className="text-grafite">+</b> separa em vários lançamentos, como a planilha fazia dentro
      da célula. <b className="text-grafite">× − ÷</b> são conta dentro de um valor só: "3 × 50" é
      um lançamento de 150.
    </p>
  );
}
