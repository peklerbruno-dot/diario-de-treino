"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { quando } from "@/lib/datas";

interface Resultado {
  triadas: number;
  naFila: number;
  erros: string[];
  erro?: string;
}

/** Mais velho que isto, a Central busca de novo ao ser aberta. */
const VELHO_MS = 10 * 60_000;
/** Aberta e parada na tela, busca de novo a cada quinze minutos. */
const INTERVALO_MS = 15 * 60_000;

/**
 * Sem botão: a Central se atualiza sozinha ao abrir (se a última busca tiver
 * mais de dez minutos), ao voltar para a aba, e a cada quinze minutos aberta.
 * Fora disso, quem atualiza é o agendador (ver docs/COLOCAR-NO-AR.md).
 */
export function Atualizar({ ultima }: { ultima: string | null }) {
  const router = useRouter();
  const [rodando, setRodando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [desde, setDesde] = useState<Date | null>(ultima ? new Date(ultima) : null);
  const ocupado = useRef(false);

  const rodar = useCallback(
    async (fila = 0) => {
      if (ocupado.current) return;
      ocupado.current = true;
      setRodando(true);
      try {
        const r = await fetch("/api/sincronizar", { method: "POST" });
        const j = (await r.json()) as Resultado;
        if (!r.ok) throw new Error(j.erro ?? `Erro ${r.status}`);
        setDesde(new Date());
        // Conta desconectada já tem o aviso dela no topo do Hoje; aqui só o resto.
        setAviso(j.erros.find((e) => !e.includes("Reconecte")) ?? null);
        router.refresh();
        // A primeira leitura tem mais conversas do que cabe numa rodada:
        // continua sozinha até a fila acabar (com um teto, por segurança).
        if (j.naFila && !j.erros.length && fila < 5) {
          ocupado.current = false;
          return rodar(fila + 1);
        }
      } catch (e) {
        setAviso(`Não deu para atualizar: ${(e as Error).message}`);
      } finally {
        ocupado.current = false;
        setRodando(false);
      }
    },
    [router],
  );

  useEffect(() => {
    const precisa = () => !desde || Date.now() - desde.getTime() > VELHO_MS;
    if (precisa()) rodar();
    const ao_voltar = () => document.visibilityState === "visible" && precisa() && rodar();
    document.addEventListener("visibilitychange", ao_voltar);
    const t = setInterval(() => document.visibilityState === "visible" && rodar(), INTERVALO_MS);
    return () => {
      document.removeEventListener("visibilitychange", ao_voltar);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rodar]);

  return (
    <div className="max-w-[12rem] text-right text-xs text-fosco">
      <p>{rodando ? "Atualizando…" : desde ? `Atualizado ${quando(desde)}` : "Ainda não atualizado"}</p>
      {aviso && !rodando && <p className="mt-0.5 text-alerta">{aviso}</p>}
    </div>
  );
}
