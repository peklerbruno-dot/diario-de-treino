"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * A fila do modo sem internet. Despesa lançada sem sinal fica guardada no
 * celular (localStorage) e sobe sozinha quando a conexão volta — ao abrir o
 * app, ao voltar o sinal, ou a cada 30 s enquanto houver algo esperando.
 */

type Item = { id: string; campos: Record<string, string>; criadoEm: number; erro?: string };
const chave = (viagemId: string) => `viagem-fila:${viagemId}`;
const EVENTO = "viagem-fila-mudou";

function ler(viagemId: string): Item[] {
  try {
    return JSON.parse(localStorage.getItem(chave(viagemId)) ?? "[]");
  } catch {
    return [];
  }
}
function gravar(viagemId: string, itens: Item[]) {
  try {
    localStorage.setItem(chave(viagemId), JSON.stringify(itens));
  } catch {
    /* sem armazenamento: nada a fazer */
  }
  window.dispatchEvent(new Event(EVENTO));
}

/** Guarda uma despesa para enviar depois. Devolve false se o aparelho não deixar guardar. */
export function guardarNaFila(viagemId: string, campos: Record<string, string>): boolean {
  try {
    const id = campos.idCliente || crypto.randomUUID();
    gravar(viagemId, [...ler(viagemId).filter((i) => i.id !== id), { id, campos: { ...campos, idCliente: id }, criadoEm: Date.now() }]);
    return true;
  } catch {
    return false;
  }
}

export function Fila({ viagemId }: { viagemId: string }) {
  const router = useRouter();
  const [itens, setItens] = useState<Item[]>([]);
  const [online, setOnline] = useState(true);

  const enviar = useCallback(async () => {
    const pendentes = ler(viagemId).filter((i) => !i.erro);
    if (!pendentes.length || !navigator.onLine) return;
    let mudou = false;
    for (const item of pendentes) {
      try {
        const r = await fetch(`/api/v/${viagemId}/despesas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.campos),
        });
        const atual = ler(viagemId);
        if (r.ok) {
          gravar(viagemId, atual.filter((i) => i.id !== item.id));
          mudou = true;
        } else if (r.status === 422 || r.status === 403) {
          const j = (await r.json().catch(() => ({}))) as { erro?: string };
          gravar(viagemId, atual.map((i) => (i.id === item.id ? { ...i, erro: j.erro ?? "Não deu para salvar." } : i)));
        } else {
          break; // servidor fora ou sessão vencida: tenta mais tarde
        }
      } catch {
        break; // caiu a rede no meio
      }
    }
    if (mudou) router.refresh();
  }, [viagemId, router]);

  useEffect(() => {
    const atualizar = () => {
      setItens(ler(viagemId));
      setOnline(navigator.onLine);
    };
    atualizar();
    enviar();
    const aoVoltar = () => {
      atualizar();
      enviar();
    };
    window.addEventListener("online", aoVoltar);
    window.addEventListener("offline", atualizar);
    window.addEventListener(EVENTO, atualizar);
    const relogio = setInterval(enviar, 30_000);
    return () => {
      window.removeEventListener("online", aoVoltar);
      window.removeEventListener("offline", atualizar);
      window.removeEventListener(EVENTO, atualizar);
      clearInterval(relogio);
    };
  }, [viagemId, enviar]);

  const esperando = itens.filter((i) => !i.erro);
  const comErro = itens.filter((i) => i.erro);
  if (online && itens.length === 0) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)]" role="status">
      <div className="mx-auto max-w-2xl space-y-1 px-3 pt-2">
        {!online && (
          <div className="rounded-folha bg-ambar-fraco px-3 py-2 text-[14px] text-ambar shadow-cartao">
            📶 Sem internet — mostrando o que já estava salvo no celular.
          </div>
        )}
        {esperando.length > 0 && (
          <div className="rounded-folha bg-realce-fraco px-3 py-2 text-[14px] shadow-cartao">
            ⏳ {esperando.length} {esperando.length === 1 ? "despesa esperando" : "despesas esperando"} a internet para subir.
          </div>
        )}
        {comErro.map((i) => (
          <div key={i.id} className="flex items-center gap-2 rounded-folha bg-vermelho-fraco px-3 py-2 text-[14px] text-vermelho shadow-cartao">
            <span className="flex-1">“{i.campos.descricao}” não subiu: {i.erro}</span>
            <button type="button" onClick={() => gravar(viagemId, ler(viagemId).filter((x) => x.id !== i.id))} className="font-semibold">
              Descartar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Registra o service worker (offline e avisos). Uma vez por abertura do app. */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
