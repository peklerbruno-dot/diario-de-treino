"use client";

import { useActionState, useEffect } from "react";
import { acaoDeEntrar } from "../acoes";

/**
 * Quem chega à tela de entrada saiu, ou nunca entrou: as páginas que o
 * aparelho guardou para abrir rápido eram de quem estava aqui antes. Se a
 * próxima pessoa a entrar recebesse a cópia da anterior, abriria a tela — e os
 * dados do aparelho — de outra conta. Só as páginas são apagadas; os arquivos
 * do app (/_next/static) não têm dono e ficam.
 */
async function esquecerPaginasGuardadas() {
  if (typeof caches === "undefined") return;
  for (const nome of await caches.keys()) {
    if (!nome.startsWith("termometro-")) continue;
    const cache = await caches.open(nome);
    for (const pedido of await cache.keys()) {
      if (!new URL(pedido.url).pathname.startsWith("/_next/static/")) await cache.delete(pedido);
    }
  }
}

export function FormularioDeEntrada() {
  const [estado, agir, esperando] = useActionState(acaoDeEntrar, null);

  useEffect(() => {
    void esquecerPaginasGuardadas().catch(() => undefined);
  }, []);

  return (
    <form action={agir} className="mt-8">
      <label htmlFor="codigo" className="block text-[15px] text-grafite">
        Código de acesso
      </label>
      <input
        id="codigo"
        name="codigo"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        className="mt-2 w-full rounded-folha border border-regua bg-cartao px-4 py-3 outline-none focus:border-saldo"
      />

      {estado?.erro && (
        <p role="alert" className="mt-3 text-[15px] text-atencao">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={esperando}
        className="mt-5 w-full rounded-folha bg-tinta px-4 py-3 text-[17px] font-medium text-papel disabled:opacity-60"
      >
        {esperando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
