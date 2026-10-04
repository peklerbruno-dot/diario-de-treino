"use client";

import { useState } from "react";
import { comCifrao, paraCentavos } from "@/lib/dinheiro";
import { hoje } from "@/lib/datas";
import {
  guardarPreferenciasDosValores,
  lancamentosVivos,
  preferenciasDosValores,
  type Estado,
} from "@/lib/loja";
import { valoresRapidos } from "@/lib/valores-rapidos";
import { Botao, CampoDeValor, Subtitulo } from "./pecas";

/**
 * A última palavra sobre os botões do Gastei.
 *
 * O app escolhe sozinho pelo que você usa, e quase sempre acerta; isto é para
 * o "quase". Tocar num botão o esconde (some da tela Hoje, e o app põe outro
 * no lugar); fixar um valor faz ele aparecer sempre, mesmo sem história.
 */
export function EditorDeValores({ estado }: { estado: Estado }) {
  const preferencias = preferenciasDosValores(estado);
  const { botoes } = valoresRapidos(lancamentosVivos(estado), hoje(), preferencias);
  const [novo, setNovo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const fixado = new Set(preferencias.fixados);

  function esconder(reais: number) {
    guardarPreferenciasDosValores({
      fixados: preferencias.fixados.filter((v) => v !== reais),
      escondidos: [...preferencias.escondidos, reais],
    });
  }

  function mostrar(reais: number) {
    guardarPreferenciasDosValores({
      ...preferencias,
      escondidos: preferencias.escondidos.filter((v) => v !== reais),
    });
  }

  function fixar() {
    const cents = paraCentavos(novo);
    if (cents === null || cents < 100) {
      setErro("Digite um valor em reais, como 38.");
      return;
    }
    const reais = Math.round(cents / 100);
    guardarPreferenciasDosValores({
      fixados: [...preferencias.fixados, reais],
      escondidos: preferencias.escondidos.filter((v) => v !== reais),
    });
    setNovo("");
    setErro(null);
  }

  return (
    <section id="botoes-do-gastei" className="mt-6 scroll-mt-6">
      <Subtitulo>Botões do Gastei</Subtitulo>
      <p className="mt-1 text-[15px] leading-relaxed text-grafite">
        O app escolhe pelos valores que você usa. Toque num botão que você não usa para escondê-lo
        — outro entra no lugar. Para um valor que faz falta, fixe abaixo.
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {botoes.map(({ valorCents, seu }) => {
          const reais = valorCents / 100;
          return (
            <button
              key={valorCents}
              type="button"
              onClick={() => esconder(reais)}
              aria-label={`Esconder ${comCifrao(valorCents)}`}
              className={`min-h-[40px] rounded-full bg-cartao px-3.5 text-[15px] shadow-baixa active:scale-95 ${
                seu ? "font-semibold text-tinta" : "text-grafite"
              }`}
            >
              {reais}
              {fixado.has(reais) && <span className="ml-1 text-[12px] text-fosco">fixo</span>}
              <span aria-hidden className="ml-1.5 text-fosco">
                ×
              </span>
            </button>
          );
        })}
      </div>

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          fixar();
        }}
      >
        <label className="block flex-1">
          <span className="block text-[14px] text-grafite">Fixar um valor</span>
          <CampoDeValor valor={novo} aoMudar={setNovo} />
        </label>
        <Botao submit disabled={!novo.trim()}>
          Fixar
        </Botao>
      </form>
      {erro && (
        <p role="alert" className="mt-2 text-[14px] text-atencao">
          {erro}
        </p>
      )}

      {preferencias.escondidos.length > 0 && (
        <div className="mt-3">
          <p className="text-[14px] text-grafite">Escondidos — toque para voltar</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {preferencias.escondidos.map((reais) => (
              <button
                key={reais}
                type="button"
                onClick={() => mostrar(reais)}
                className="min-h-[36px] rounded-full bg-papel px-3 text-[14px] text-fosco line-through ring-1 ring-regua"
              >
                {reais}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
