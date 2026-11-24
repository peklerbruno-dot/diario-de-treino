"use client";

import { useEffect, useState } from "react";
import { VERSAO_DO_APP } from "@/lib/loja";

/**
 * Antes de mostrar um saldo, confere se este é o código de agora.
 *
 * O iPhone abre o app com a cópia da última visita (o service worker serve o
 * que tem guardado quando o servidor demora a acordar) e pode retomar uma
 * página congelada de dias atrás. Esse código velho calcula com a regra velha
 * — e mostrava um saldo errado por um minuto, até a primeira sincronização
 * perceber a diferença. Aqui a conferência é a primeira coisa: um pedido
 * minúsculo, sem banco, que diz a versão do servidor.
 *
 *  - igual: segue, nada muda;
 *  - diferente: joga fora o que o aparelho guardou e recarrega (uma vez por
 *    versão, para nunca virar laço);
 *  - sem resposta (sem internet, servidor dormindo): segue depois de 2,5 s —
 *    offline o app tem de abrir com o que tem, e o saldo guardado é o melhor
 *    que existe.
 *
 * "conferindo" é o estado em que a tela esconde os números.
 */
export type Conferencia = "conferindo" | "ok" | "atualizando";

const CHAVE = "termometro.conferiuPara";
// Tem de ser o mesmo nome de `public/sw.js`.
const CACHE_DO_SW = "termometro-v7";
const ESPERA_MS = 2500;

export function useConferirVersao(): Conferencia {
  const [estado, setEstado] = useState<Conferencia>(
    // Em desenvolvimento a versão é "local" nos dois lados: nada a conferir.
    VERSAO_DO_APP === "local" ? "ok" : "conferindo",
  );

  useEffect(() => {
    if (VERSAO_DO_APP === "local") return;
    let vivo = true;
    const controle = new AbortController();
    const relogio = setTimeout(() => {
      controle.abort();
      if (vivo) setEstado("ok");
    }, ESPERA_MS);

    fetch("/api/saude", { cache: "no-store", signal: controle.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then(async (corpo: { versao?: string } | null) => {
        clearTimeout(relogio);
        if (!vivo) return;
        const doServidor = corpo?.versao;
        if (!doServidor || doServidor === VERSAO_DO_APP) {
          setEstado("ok");
          // Esta é a versão de agora: guarda esta página para a próxima abertura.
          void renovarGuardado();
          return;
        }
        // Uma vez por versão: se depois de recarregar o aparelho continuar
        // velho (rede caindo no meio), segue com o que tem em vez de girar.
        try {
          if (sessionStorage.getItem(CHAVE) === doServidor) {
            setEstado("ok");
            return;
          }
          sessionStorage.setItem(CHAVE, doServidor);
        } catch {
          // Sem sessionStorage: recarrega mesmo assim, uma vez já basta.
        }
        setEstado("atualizando");
        await descartarGuardado();
        window.location.reload();
      })
      .catch(() => {
        clearTimeout(relogio);
        if (vivo) setEstado("ok");
      });

    return () => {
      vivo = false;
      clearTimeout(relogio);
      controle.abort();
    };
  }, []);

  return estado;
}

/**
 * Guarda a página de agora para a próxima abertura.
 *
 * O service worker também faz isso, mas o iPhone o encerra assim que a página
 * é entregue — a busca em segundo plano morria no meio, e a cópia guardada
 * ficava dias para trás. A página, que continua viva, termina o trabalho.
 */
async function renovarGuardado() {
  try {
    const caminho = window.location.pathname;
    const resposta = await fetch(caminho, { cache: "no-store", credentials: "same-origin" });
    if (!resposta.ok || resposta.redirected || resposta.type !== "basic") return;
    const cache = await caches.open(CACHE_DO_SW);
    await cache.put(caminho, resposta);
  } catch {
    // Sem rede ou sem Cache API: fica a cópia que já existia.
  }
}

/** Apaga as páginas guardadas pelo service worker, para o recarregamento vir da rede. */
async function descartarGuardado() {
  try {
    const nomes = await caches.keys();
    await Promise.all(nomes.map((n) => caches.delete(n)));
  } catch {
    // Sem Cache API: o recarregamento segue pela rede de qualquer jeito.
  }
}
