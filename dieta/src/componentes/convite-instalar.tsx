"use client";

import { useEffect, useState } from "react";
import { IconeCompartilhar } from "./icones";

/**
 * O aviso de que isto aqui ainda é o Safari, e não o app.
 *
 * A diferença não salta aos olhos — a mesma tela, só que com a barra de
 * endereço em cima e a do Safari embaixo — e no iPhone ela custa caro: fora do
 * modo app não há notificação nenhuma. Desde o iOS 26 a folha "Adicionar à
 * Tela de Início" tem a chave "Abrir como App Web"; desligada, o ícone abre o
 * Safari comum, que é exatamente o sintoma de "barras em cima e embaixo".
 *
 * O aviso some sozinho quando o app abre em modo app (`standalone`), e pode ser
 * dispensado por uma semana.
 */

const CHAVE = "dieta.conviteDeInstalar";
const UMA_SEMANA = 7 * 24 * 60 * 60 * 1000;

export function ConviteParaInstalar() {
  const [mostrar, setMostrar] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const app =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dispensado = 0;
    try {
      dispensado = Number(localStorage.getItem(CHAVE) ?? 0);
    } catch {
      /* navegador sem armazenamento: mostra mesmo */
    }
    setMostrar(ios && !app && Date.now() - dispensado > UMA_SEMANA);
  }, []);

  if (!mostrar) return null;

  const dispensar = () => {
    try {
      localStorage.setItem(CHAVE, String(Date.now()));
    } catch {
      /* sem armazenamento: só fecha */
    }
    setMostrar(false);
  };

  return (
    <div className="mb-4 rounded-cartao bg-agua-clara px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-agua">
          <IconeCompartilhar className="h-5 w-5" />
        </span>
        <p className="flex-1 text-[15px] font-medium leading-snug">Abrindo no Safari, não como app</p>
        <button type="button" onClick={() => setAberto((a) => !a)} className="shrink-0 text-[14px] font-medium text-agua" aria-expanded={aberto}>
          {aberto ? "Fechar" : "Como resolver"}
        </button>
      </div>
      {aberto && (
        <div className="mt-2 pl-8 text-[14.5px] leading-snug">
          <ol className="list-decimal space-y-0.5 pl-4 text-grafite">
            <li>Se já existe um ícone do Dieta na Tela de Início, apague-o.</li>
            <li>
              Aqui no Safari: <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong>.
            </li>
            <li>
              Deixe <strong>ligada</strong> a opção <strong>“Abrir como App Web”</strong> → <strong>Adicionar</strong>.
            </li>
            <li>Abra sempre pelo ícone. Lá dentro você entra com o código uma vez só.</li>
          </ol>
          <button type="button" onClick={dispensar} className="mt-2 text-[14px] text-agua underline">
            Não mostrar por uma semana
          </button>
        </div>
      )}
    </div>
  );
}
