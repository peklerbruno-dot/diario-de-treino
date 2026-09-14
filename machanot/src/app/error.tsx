"use client";

import { useEffect } from "react";
import { Botao } from "@/components/ui/button";
import { Cartao, CartaoCorpo } from "@/components/ui/card";

/**
 * Tela de erro em português.
 *
 * O padrão do Next é "Application error: a server-side exception has occurred",
 * que não ajuda ninguém — muito menos quem não programa. Aqui a pessoa lê o que
 * aconteceu, o que fazer, e sabe que nada do que ela digitou se perdeu.
 */
export default function Erro({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Recarregar a página inteira, e não o `reset` do Next: testado com o banco
  // fora do ar e de volta, o reset (mesmo com router.refresh) remontava o
  // trecho quebrado com a resposta velha e a tela continuava no erro. Recarregar
  // sempre funciona, que é o que importa para quem está do outro lado.
  function tentarDeNovo() {
    window.location.reload();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5">
      <Cartao>
        <CartaoCorpo className="space-y-3">
          <h1 className="text-lg font-semibold">O sistema não respondeu agora</h1>
          <p className="text-sm leading-relaxed">
            Alguma coisa falhou do lado do servidor — quase sempre o banco de dados demorando a
            acordar depois de um tempo parado. <strong>Nada do que você digitou se perdeu:</strong>{" "}
            o que já estava salvo continua salvo.
          </p>
          <p className="text-sm leading-relaxed">
            Tente de novo. Se insistir em dar errado por mais de alguns minutos, avise quem cuida da
            parte técnica e mostre o código abaixo.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Botao onClick={tentarDeNovo}>Tentar de novo</Botao>
            <a href="/" className="text-sm text-acento underline">
              voltar para a lista de machanot
            </a>
          </div>
          {error.digest ? (
            <p className="border-t border-borda pt-2 font-mono text-[11px] text-suave">
              código do erro: {error.digest}
            </p>
          ) : null}
        </CartaoCorpo>
      </Cartao>
    </main>
  );
}
