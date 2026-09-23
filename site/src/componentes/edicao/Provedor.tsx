"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Aviso = { texto: string; tom: "ok" | "erro"; acao?: { rotulo: string; fazer: () => void } };

type Contexto = {
  /** Quem entrou, ou null para o visitante. */
  equipe: { nome: string } | null;
  /** A equipe pode olhar o site como um visitante vê, sem os botões. */
  comoVisitante: boolean;
  alternarVisitante: () => void;
  /** Mostrar os botões de edição? */
  editando: boolean;
  avisar: (a: Aviso) => void;
};

const Ctx = createContext<Contexto>({
  equipe: null,
  comoVisitante: false,
  alternarVisitante: () => {},
  editando: false,
  avisar: () => {},
});

export const useEdicao = () => useContext(Ctx);

const CHAVE_VISITANTE = "chazit-como-visitante";

export function ProvedorEdicao({ equipe, children }: { equipe: { nome: string } | null; children: React.ReactNode }) {
  const [comoVisitante, setComoVisitante] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    try {
      setComoVisitante(sessionStorage.getItem(CHAVE_VISITANTE) === "1");
    } catch {}
  }, []);

  const alternarVisitante = useCallback(() => {
    setComoVisitante((v) => {
      try {
        sessionStorage.setItem(CHAVE_VISITANTE, v ? "0" : "1");
      } catch {}
      return !v;
    });
  }, []);

  const avisar = useCallback((a: Aviso) => {
    setAviso(a);
    clearTimeout(relogio.current);
    relogio.current = setTimeout(() => setAviso(null), a.acao ? 9000 : 4000);
  }, []);

  return (
    <Ctx.Provider value={{ equipe, comoVisitante, alternarVisitante, editando: !!equipe && !comoVisitante, avisar }}>
      {children}
      {aviso ? (
        <div className="fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4" role="status" aria-live="polite">
          <div
            className={`flex max-w-md items-center gap-4 rounded-2xl px-5 py-3 font-corpo text-[15px] shadow-2xl ${
              aviso.tom === "ok" ? "bg-marinho text-white" : "bg-red-700 text-white"
            }`}
          >
            <span>{aviso.texto}</span>
            {aviso.acao ? (
              <button
                type="button"
                className="shrink-0 rounded-lg bg-white/15 px-3 py-1.5 font-bold hover:bg-white/25"
                onClick={() => {
                  aviso.acao?.fazer();
                  setAviso(null);
                }}
              >
                {aviso.acao.rotulo}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Ctx.Provider>
  );
}
