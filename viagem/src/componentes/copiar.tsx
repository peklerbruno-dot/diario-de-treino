"use client";

import { useState } from "react";

/** Compartilhar pelo menu do celular (WhatsApp etc.) ou, se não houver, copiar. */
export function Compartilhar({ texto, url, rotulo = "Compartilhar convite" }: { texto: string; url: string; rotulo?: string }) {
  const [feito, setFeito] = useState("");
  async function agir() {
    try {
      if (navigator.share) {
        await navigator.share({ text: texto, url });
        return;
      }
    } catch {
      /* cancelou o menu: cai no copiar */
    }
    await navigator.clipboard.writeText(`${texto} ${url}`);
    setFeito("Copiado!");
    setTimeout(() => setFeito(""), 2000);
  }
  return (
    <button type="button" onClick={agir} className="botao w-full">
      {feito || rotulo}
    </button>
  );
}

export function Copiar({ valor, rotulo = "Copiar" }: { valor: string; rotulo?: string }) {
  const [feito, setFeito] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(valor);
        setFeito(true);
        setTimeout(() => setFeito(false), 2000);
      }}
      className="botao-leve min-h-[40px] px-3 text-[14px]"
    >
      {feito ? "Copiado!" : rotulo}
    </button>
  );
}
