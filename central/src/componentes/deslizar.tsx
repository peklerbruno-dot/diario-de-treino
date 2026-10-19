"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Os gestos do celular, como no app de e-mail do iPhone: deslizar a linha
 * para a direita ou para a esquerda faz a ação daquele lado; segurar abre o
 * "adiar". No computador nada muda: os botões continuam lá.
 */

interface Lado {
  rotulo: string;
  /** Classe de fundo (ver tailwind.config.ts). */
  fundo: string;
  acao: () => void;
}

const LIMITE = 88;
const SEGURAR_MS = 550;

export function Deslizavel({
  children,
  direita,
  esquerda,
  segurar,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
  /** Deslizar para a direita (→). */
  direita?: Lado;
  /** Deslizar para a esquerda (←). */
  esquerda?: Lado;
  segurar?: () => void;
}) {
  const [dx, setDx] = useState(0);
  const [solto, setSolto] = useState(true);
  const ini = useRef<{ x: number; y: number } | null>(null);
  const eixo = useRef<"x" | "y" | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Depois de um gesto, o toque não vale como clique (não abre o item).
  const engolirClique = useRef(false);

  const pararRelogio = () => {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = null;
  };
  useEffect(() => pararRelogio, []);

  const lado = dx > 0 ? direita : dx < 0 ? esquerda : undefined;
  const passou = Math.abs(dx) >= LIMITE;

  return (
    <div className={`relative overflow-hidden rounded-lg lg:overflow-visible ${className}`}>
      {lado && (
        <div
          className={`absolute inset-0 flex items-center px-5 text-[14px] font-medium text-white transition-opacity ${lado.fundo} ${
            dx > 0 ? "justify-start" : "justify-end"
          } ${passou ? "opacity-100" : "opacity-60"}`}
          aria-hidden
        >
          {lado.rotulo}
        </div>
      )}
      <div
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, touchAction: "pan-y", WebkitTouchCallout: "none" }}
        className={`relative bg-fundo ${solto ? "transition-transform duration-200" : ""}`}
        onTouchStart={(e) => {
          const t = e.touches[0];
          ini.current = { x: t.clientX, y: t.clientY };
          eixo.current = null;
          engolirClique.current = false;
          setSolto(false);
          if (segurar) {
            relogio.current = setTimeout(() => {
              engolirClique.current = true;
              ini.current = null;
              segurar();
            }, SEGURAR_MS);
          }
        }}
        onTouchMove={(e) => {
          if (!ini.current) return;
          const t = e.touches[0];
          const mx = t.clientX - ini.current.x;
          const my = t.clientY - ini.current.y;
          if (!eixo.current && (Math.abs(mx) > 8 || Math.abs(my) > 8)) {
            eixo.current = Math.abs(mx) > Math.abs(my) ? "x" : "y";
            pararRelogio();
          }
          if (eixo.current !== "x") return;
          engolirClique.current = true;
          if ((mx > 0 && !direita) || (mx < 0 && !esquerda)) return setDx(0);
          // Depois do limite, a linha resiste um pouco.
          const r = Math.abs(mx) > LIMITE ? Math.sign(mx) * (LIMITE + (Math.abs(mx) - LIMITE) * 0.35) : mx;
          setDx(r);
        }}
        onTouchEnd={() => {
          pararRelogio();
          setSolto(true);
          const acao = passou ? lado?.acao : undefined;
          ini.current = null;
          if (acao) {
            setDx(Math.sign(dx) * window.innerWidth);
            setTimeout(acao, 160);
          } else setDx(0);
        }}
        onTouchCancel={() => {
          pararRelogio();
          setSolto(true);
          setDx(0);
        }}
        onClickCapture={(e) => {
          if (engolirClique.current) {
            e.preventDefault();
            e.stopPropagation();
            engolirClique.current = false;
          }
        }}
        onContextMenu={(e) => segurar && e.preventDefault()}
      >
        {children}
      </div>
    </div>
  );
}

/** O dia de hoje em São Paulo, "AAAA-MM-DD", no navegador. */
function hojeSP(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function somar(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const proximoDia = (dia: string, alvo: number) => {
  const sem = new Date(`${dia}T12:00:00Z`).getUTCDay();
  return somar(dia, (alvo - sem + 7) % 7 || 7);
};

/**
 * Para quando adiar: três escolhas prontas e uma data qualquer. No celular
 * sobe de baixo; no computador aparece no meio.
 */
export function MenuAdiar({ titulo, onEscolher, onFechar }: { titulo: string; onEscolher: (dia: string) => void; onFechar: () => void }) {
  const hoje = hojeSP();
  const [outra, setOutra] = useState("");
  // Quem abriu segurando ainda está com o dedo na tela: o toque de soltar
  // não pode valer como escolha (nem como fechar).
  const abertoEm = useRef(Date.now());
  const cedo = () => Date.now() - abertoEm.current < 500;
  const amanha = somar(hoje, 1);
  // No domingo, a segunda seguinte já é "amanhã": a semana que vem é a outra.
  const segunda = proximoDia(hoje, 1) === amanha ? somar(amanha, 7) : proximoDia(hoje, 1);
  const opcoes = [
    { nome: "Amanhã", dia: amanha },
    { nome: "No fim de semana", dia: proximoDia(hoje, 6) },
    { nome: "Na semana que vem", dia: segunda },
  ];
  const dataCurta = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "numeric" });

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 lg:items-center" onClick={() => !cedo() && onFechar()}>
      <div
        className="seguro-embaixo w-full max-w-md rounded-t-2xl bg-superficie px-5 pb-6 pt-4 shadow-xl lg:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Adiar"
      >
        <p className="text-[13px] font-semibold text-fosco">Adiar</p>
        <p className="mt-0.5 line-clamp-2 text-[15px]">{titulo}</p>
        <div className="mt-4 divide-y divide-linha">
          {opcoes.map((o) => (
            <button key={o.nome} onClick={() => !cedo() && onEscolher(o.dia)} className="flex w-full items-baseline justify-between py-3 text-left text-[16px]">
              {o.nome}
              <span className="numeros text-[14px] text-fosco">{dataCurta(o.dia)}</span>
            </button>
          ))}
          <div className="flex items-center justify-between gap-3 py-3">
            <input
              type="date"
              min={somar(hoje, 1)}
              value={outra}
              onChange={(e) => setOutra(e.target.value)}
              className="rounded-md border border-linha bg-transparent px-2 py-1 text-[15px]"
              aria-label="Outra data"
            />
            <button disabled={!outra} onClick={() => onEscolher(outra)} className="text-[15px] font-medium text-destaque disabled:opacity-40">
              Adiar para esta data
            </button>
          </div>
        </div>
        <button onClick={onFechar} className="mt-2 w-full py-2 text-[15px] text-fosco">
          Cancelar
        </button>
      </div>
    </div>
  );
}
