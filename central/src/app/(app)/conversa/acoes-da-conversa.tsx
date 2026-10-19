"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CATEGORIAS } from "@/lib/categorias";
import { MenuAdiar } from "@/componentes/deslizar";
import { adiar, arquivarNoGmail, corrigirCategoria, marcarResolvida, porPrazoNaAgenda } from "../acoes";

const acao =
  "rounded-full bg-superficie px-3.5 py-1.5 text-[14px] font-medium text-grafite shadow-[0_1px_2px_rgba(40,30,10,0.06)] hover:text-tinta disabled:opacity-40";

/** As ações da conversa, em texto, numa linha só. A categoria se troca no próprio rótulo. */
export function Acoes(p: { id: string; categoria: string; resolvida: boolean; temPrazo: boolean; linkGmail: string }) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [aviso, setAviso] = useState<{ texto: string; link?: string } | null>(null);
  const [adiando, setAdiando] = useState(false);
  const fazer = (f: () => Promise<unknown>) => comecar(async () => void (await f()));

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <button className={acao} disabled={pendente} onClick={() => fazer(() => marcarResolvida(p.id, !p.resolvida))}>
          {p.resolvida ? "Reabrir" : "Marcar como resolvida"}
        </button>
        <button
          className={acao}
          disabled={pendente}
          onClick={() =>
            fazer(async () => {
              const r = await arquivarNoGmail(p.id);
              if (!r.ok) setAviso({ texto: r.erro });
              else router.refresh();
            })
          }
        >
          Arquivar
        </button>
        {!p.resolvida && (
          <button className={acao} disabled={pendente} onClick={() => setAdiando(true)}>
            Adiar
          </button>
        )}
        {p.temPrazo && (
          <button
            className={acao}
            disabled={pendente}
            onClick={() =>
              fazer(async () => {
                const r = await porPrazoNaAgenda(p.id);
                setAviso(r.ok ? { texto: "Prazo posto na agenda.", link: r.link } : { texto: r.erro });
              })
            }
          >
            Pôr prazo na agenda
          </button>
        )}
        <a href={p.linkGmail} target="_blank" rel="noreferrer" className={acao}>
          Abrir no Gmail
        </a>
        <label className="flex items-center gap-1 px-1 text-[14px] text-fosco">
          Categoria:
          <select
            defaultValue={p.categoria}
            disabled={pendente}
            onChange={(e) => fazer(() => corrigirCategoria(p.id, e.target.value))}
            className="cursor-pointer bg-transparent text-[14px] text-grafite outline-none hover:text-tinta"
          >
            {CATEGORIAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      {adiando && (
        <MenuAdiar
          titulo="A conversa some das listas até o dia escolhido, ou até chegar mensagem nova."
          onFechar={() => setAdiando(false)}
          onEscolher={(dia) => {
            setAdiando(false);
            fazer(async () => {
              await adiar(`c:${p.id}`, dia);
              setAviso({ texto: "Adiada." });
              router.refresh();
            });
          }}
        />
      )}
      {aviso && (
        <p className="mt-2 text-[14px] text-grafite">
          {aviso.texto}{" "}
          {aviso.link && (
            <a href={aviso.link} target="_blank" rel="noreferrer" className="underline">
              Ver
            </a>
          )}
        </p>
      )}
    </div>
  );
}
