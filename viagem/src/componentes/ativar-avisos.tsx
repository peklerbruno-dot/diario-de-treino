"use client";

import { useEffect, useState } from "react";
import { cancelarAparelho, inscreverAparelho } from "@/acoes/avisos";

const paraBytes = (base64: string) => {
  const b = atob((base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

type Estado = "carregando" | "sem-suporte" | "instalar" | "negado" | "desligado" | "ligado";

/**
 * Ligar os avisos neste aparelho. No iPhone, o iOS só deixa site mandar aviso
 * se ele estiver instalado na tela de início — então, no Safari comum, o botão
 * explica isso em vez de falhar calado.
 */
export function AtivarAvisos({ chavePublica }: { chavePublica: string }) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [erro, setErro] = useState("");

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setEstado(ios && !instalado ? "instalar" : "sem-suporte");
        return;
      }
      if (Notification.permission === "denied") return setEstado("negado");
      const reg = await navigator.serviceWorker.getRegistration();
      const inscricao = await reg?.pushManager.getSubscription();
      setEstado(inscricao ? "ligado" : "desligado");
    })().catch(() => setEstado("sem-suporte"));
  }, []);

  async function ligar() {
    setErro("");
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") return setEstado(permissao === "denied" ? "negado" : "desligado");
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const inscricao = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: paraBytes(chavePublica) });
      const j = inscricao.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const r = await inscreverAparelho({ endpoint: j.endpoint, keys: j.keys });
      setEstado(r.ok ? "ligado" : "desligado");
      if (!r.ok) setErro("Não consegui registrar este aparelho. Tente de novo.");
    } catch {
      setErro("Não consegui ligar os avisos neste aparelho.");
    }
  }

  async function desligar() {
    const reg = await navigator.serviceWorker.getRegistration();
    const inscricao = await reg?.pushManager.getSubscription();
    if (inscricao) {
      await cancelarAparelho(inscricao.endpoint);
      await inscricao.unsubscribe();
    }
    setEstado("desligado");
  }

  const texto: Record<Estado, React.ReactNode> = {
    carregando: "…",
    "sem-suporte": "Este navegador não recebe avisos.",
    instalar: (
      <>
        No iPhone, os avisos só funcionam com o app instalado: abra no Safari → Compartilhar → <strong>Adicionar à Tela de Início</strong>, entre pelo ícone e volte aqui.
      </>
    ),
    negado: "Os avisos foram bloqueados neste aparelho. No iPhone: Ajustes → Notificações → Viagem → Permitir.",
    desligado: "Saiba na hora quando alguém lançar despesa, mandar lugar, abrir votação ou te passar uma tarefa — e receba o roteiro do dia de manhã.",
    ligado: "✓ Avisos ligados neste aparelho.",
  };

  return (
    <div className="space-y-3 text-[15px]">
      <p className={estado === "ligado" ? "text-verde" : "text-grafite"}>{texto[estado]}</p>
      {estado === "desligado" && (
        <button type="button" onClick={ligar} className="botao w-full">🔔 Ligar avisos neste aparelho</button>
      )}
      {estado === "ligado" && (
        <button type="button" onClick={desligar} className="text-[14px] text-fosco">Desligar neste aparelho</button>
      )}
      {erro && <p className="text-vermelho">{erro}</p>}
    </div>
  );
}
