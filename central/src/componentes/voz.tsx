"use client";

import { useEffect, useRef, useState } from "react";

/* O reconhecimento de fala do próprio navegador (Chrome, Edge, Safari), em
   português. Grátis e sem servidor: o áudio vai para o serviço do navegador. */
interface Reconhecimento {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type Construtor = new () => Reconhecimento;

function construtor(): Construtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: Construtor; webkitSpeechRecognition?: Construtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Um botão de microfone: fala, e o texto entra no campo. Some onde o navegador não suporta. */
export function BotaoDeVoz({ aoFalar }: { aoFalar: (texto: string) => void }) {
  const [suportado, setSuportado] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState("");
  const rec = useRef<Reconhecimento | null>(null);

  useEffect(() => setSuportado(Boolean(construtor())), []);

  function alternar() {
    if (ouvindo) {
      rec.current?.stop();
      return;
    }
    const C = construtor();
    if (!C) return;
    const r = new C();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript;
      if (t.trim()) aoFalar(t.trim());
    };
    r.onend = () => setOuvindo(false);
    r.onerror = (e) => {
      setErro(e.error === "not-allowed" ? "Permita o microfone no navegador." : "");
      setOuvindo(false);
    };
    rec.current = r;
    setErro("");
    setOuvindo(true);
    r.start();
  }

  if (!suportado) return null;
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={alternar}
        aria-label={ouvindo ? "Parar de ouvir" : "Ditar"}
        title={ouvindo ? "Parar" : "Ditar por voz"}
        className={`inline-flex items-center gap-1.5 text-[14px] ${ouvindo ? "text-atencao" : "text-fosco hover:text-tinta"}`}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4" aria-hidden>
          <rect x="7" y="2.5" width="6" height="10" rx="3" />
          <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5" strokeLinecap="round" />
        </svg>
        {ouvindo ? "Ouvindo… toque para parar" : "Ditar"}
      </button>
      {erro && <span className="text-[13px] text-atencao">{erro}</span>}
    </span>
  );
}
