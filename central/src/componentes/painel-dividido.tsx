"use client";

import { useEffect, useRef, useState } from "react";

const CHAVE = "central:largura-da-lista";
const MIN = 280;
const PADRAO = 400;

/**
 * Lista e conversa lado a lado, com a divisória arrastável — como redimensionar
 * uma janela. A largura escolhida fica guardada neste navegador. No celular
 * não há divisória: uma coisa de cada vez.
 */
export function PainelDividido({
  esquerda,
  direita,
  mostrarDireita,
}: {
  esquerda: React.ReactNode;
  direita: React.ReactNode;
  /** No celular, qual lado aparece (o outro some). */
  mostrarDireita: boolean;
}) {
  const [largura, setLargura] = useState(PADRAO);
  const caixa = useRef<HTMLDivElement>(null);
  const arrastando = useRef(false);

  useEffect(() => {
    try {
      const salva = Number(localStorage.getItem(CHAVE));
      if (salva >= MIN) setLargura(salva);
    } catch {}
  }, []);

  useEffect(() => {
    const mover = (e: PointerEvent) => {
      if (!arrastando.current || !caixa.current) return;
      const ini = caixa.current.getBoundingClientRect().left;
      const max = caixa.current.clientWidth * 0.75;
      setLargura(Math.round(Math.min(max, Math.max(MIN, e.clientX - ini))));
    };
    const soltar = () => {
      if (!arrastando.current) return;
      arrastando.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setLargura((l) => {
        try {
          localStorage.setItem(CHAVE, String(l));
        } catch {}
        return l;
      });
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    };
  }, []);

  return (
    <div ref={caixa} className="lg:-my-12 lg:flex lg:h-screen" style={{ ["--lista" as string]: `${largura}px` }}>
      <div className={`${mostrarDireita ? "hidden lg:block" : ""} lg:w-[var(--lista)] lg:shrink-0 lg:overflow-y-auto lg:py-12 lg:pr-8`}>
        {esquerda}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Arraste para mudar a largura da lista"
        title="Arraste para mudar a largura"
        onPointerDown={(e) => {
          e.preventDefault();
          arrastando.current = true;
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
        }}
        onDoubleClick={() => {
          setLargura(PADRAO);
          try {
            localStorage.setItem(CHAVE, String(PADRAO));
          } catch {}
        }}
        className="group relative hidden w-px shrink-0 cursor-col-resize bg-linha lg:block"
      >
        {/* A área de pegar é mais larga que a linha que se vê. */}
        <span className="absolute inset-y-0 -left-2 -right-2" />
        <span className="absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-regua opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className={`${mostrarDireita ? "" : "hidden lg:block"} min-w-0 lg:flex-1 lg:overflow-y-auto lg:py-12 lg:pl-12`}>{direita}</div>
    </div>
  );
}
