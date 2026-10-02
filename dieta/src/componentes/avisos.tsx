"use client";

import { useCallback, useEffect, useState } from "react";
import { IconeCompartilhar, IconeSino } from "./icones";
import { Botao } from "./pecas";

/**
 * Ligar os avisos neste aparelho.
 *
 * No iPhone a sequência tem três exigências, e qualquer uma que falte faz o
 * botão simplesmente não fazer nada — por isso cada uma vira uma mensagem:
 *
 *  1. O app tem de estar **instalado na Tela de Início** (iOS 16.4 ou mais
 *     novo). No Safari comum, `PushManager` nem existe.
 *  2. O pedido de permissão tem de sair **direto do toque** no botão. Se houver
 *     qualquer espera antes dele, o iOS entende que não foi a pessoa que pediu
 *     e recusa sem perguntar. Por isso `requestPermission` é a primeira coisa
 *     em `ativar`.
 *  3. Recusou uma vez, só se desfaz nos Ajustes do iPhone — o app não pode
 *     perguntar de novo.
 */

export type EstadoDosAvisos = "carregando" | "sem-suporte" | "instalar" | "negado" | "desligado" | "ligado";

function deBase64(base64: string): Uint8Array<ArrayBuffer> {
  const preenchido = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(preenchido);
  const saida = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) saida[i] = bruto.charCodeAt(i);
  return saida;
}

const ehIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const instalado = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function nomeDoAparelho(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Navegador";
}

export function useAvisos(chavePublica: string) {
  const [estado, setEstado] = useState<EstadoDosAvisos>("carregando");
  const [erro, setErro] = useState("");

  const conferir = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setEstado(ehIOS() && !instalado() ? "instalar" : "sem-suporte");
      return;
    }
    if (Notification.permission === "denied") return setEstado("negado");
    const registro = await navigator.serviceWorker.getRegistration();
    const inscricao = await registro?.pushManager.getSubscription();
    setEstado(inscricao && Notification.permission === "granted" ? "ligado" : "desligado");
  }, []);

  useEffect(() => {
    conferir().catch(() => setEstado("sem-suporte"));
  }, [conferir]);

  const ativar = useCallback(async () => {
    setErro("");
    // Primeiro, e sem nenhuma espera antes: ver o item 2 do comentário acima.
    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") {
      setEstado(permissao === "denied" ? "negado" : "desligado");
      return;
    }
    try {
      if (!chavePublica) throw new Error("O servidor ainda não tem as chaves de notificação (veja Ajustes).");
      const registro = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const inscricao =
        (await registro.pushManager.getSubscription()) ??
        (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: deBase64(chavePublica) }));
      const r = await fetch("/api/aparelho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inscricao: inscricao.toJSON(), nome: nomeDoAparelho() }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.erro ?? "O servidor não aceitou o aparelho.");
      setEstado("ligado");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui ligar os avisos.");
      setEstado("desligado");
    }
  }, [chavePublica]);

  const desativar = useCallback(async () => {
    const registro = await navigator.serviceWorker.getRegistration();
    const inscricao = await registro?.pushManager.getSubscription();
    if (inscricao) {
      await fetch("/api/aparelho", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: inscricao.endpoint }),
      }).catch(() => undefined);
      await inscricao.unsubscribe().catch(() => undefined);
    }
    setEstado("desligado");
  }, []);

  return { estado, erro, ativar, desativar };
}

/** O convite que aparece no topo da tela Hoje enquanto os avisos não estão ligados. */
export function ConviteDeAvisos({ chavePublica }: { chavePublica: string }) {
  const { estado, erro, ativar } = useAvisos(chavePublica);
  if (estado === "carregando" || estado === "ligado" || estado === "sem-suporte") return null;

  return (
    <div className="mb-4 rounded-cartao bg-folha-clara p-4">
      <div className="flex gap-3">
        <span className="mt-0.5 text-folha">
          {estado === "instalar" ? <IconeCompartilhar /> : <IconeSino />}
        </span>
        <div className="flex-1">
          {estado === "instalar" && (
            <>
              <p className="font-semibold">Instale o app para receber os avisos</p>
              <p className="mt-1 text-[15px] leading-snug text-grafite">
                No Safari, toque em <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong> e abra
                pelo ícone. O iPhone só manda notificação para app instalado.
              </p>
            </>
          )}
          {estado === "negado" && (
            <>
              <p className="font-semibold">Os avisos foram recusados</p>
              <p className="mt-1 text-[15px] leading-snug text-grafite">
                Para ligar de novo: Ajustes do iPhone → <strong>Notificações</strong> → <strong>Dieta</strong> → Permitir.
              </p>
            </>
          )}
          {estado === "desligado" && (
            <>
              <p className="font-semibold">Receber um aviso na hora de cada refeição?</p>
              <Botao tipo="primario" onClick={ativar} className="mt-3">
                Ativar avisos
              </Botao>
              {erro && <p className="mt-2 text-[14px] text-pulou">{erro}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
