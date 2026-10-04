"use client";

import { useState } from "react";
import type { RespostaDeTroca } from "@/lib/semana";
import { Folha } from "./foto-do-prato";
import { Botao, campo } from "./pecas";

/**
 * "Posso trocar isso?" — você descreve o que quer comer no lugar, e o app
 * responde com base no plano da nutricionista: pode, pode com ajuste, ou
 * melhor não (e qual a troca mais próxima).
 */

const VEREDITO = {
  pode: { rotulo: "Pode", cor: "bg-folha-clara text-folha" },
  "com-ajuste": { rotulo: "Pode, com ajuste", cor: "bg-troca-clara text-troca" },
  "melhor-nao": { rotulo: "Melhor não", cor: "bg-pulou-clara text-pulou" },
} as const;

const EXEMPLOS = ["Posso comer pizza no jantar de hoje?", "Troco o PF por um hambúrguer?", "Vou num aniversário, o que escolho?"];

export function PossoTrocar({ refeicoes, sugerida }: { refeicoes: { id: string; nome: string }[]; sugerida?: string }) {
  const [aberto, setAberto] = useState(false);
  const [refeicaoId, setRefeicaoId] = useState(sugerida ?? "");
  const [pergunta, setPergunta] = useState("");
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState("");
  const [resposta, setResposta] = useState<RespostaDeTroca | null>(null);

  const perguntar = async () => {
    setErro("");
    setResposta(null);
    setPensando(true);
    try {
      const r = await fetch("/api/perguntar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta, refeicaoId: refeicaoId || undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.erro ?? "Não consegui responder agora.");
      setResposta(j.resposta);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui responder agora.");
    } finally {
      setPensando(false);
    }
  };

  return (
    <div>
      <Botao className="w-full whitespace-nowrap !bg-cartao shadow-cartao" onClick={() => setAberto(true)}>
        🤔 Posso trocar?
      </Botao>
      {aberto && (
        <Folha titulo="Posso trocar?" aoFechar={() => setAberto(false)}>
          {refeicoes.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {refeicoes.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRefeicaoId(r.id === refeicaoId ? "" : r.id)}
                  className={`rounded-full px-3 py-1 text-[14px] ${r.id === refeicaoId ? "bg-folha-clara font-medium text-folha" : "bg-papel text-grafite"}`}
                >
                  {r.nome}
                </button>
              ))}
            </div>
          )}
          <textarea
            className={`${campo} min-h-[96px]`}
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            placeholder="Ex.: posso trocar a marmita de hoje por um sushi?"
          />
          {!pergunta && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXEMPLOS.map((e) => (
                <button key={e} type="button" onClick={() => setPergunta(e)} className="rounded-full bg-papel px-3 py-1 text-[13px] text-grafite">
                  {e}
                </button>
              ))}
            </div>
          )}
          <Botao tipo="primario" className="mt-3 w-full" disabled={pensando || pergunta.trim().length < 3} onClick={perguntar}>
            {pensando ? "Pensando no seu plano…" : "Perguntar"}
          </Botao>
          {erro && <p className="mt-2 text-[14px] text-pulou">{erro}</p>}
          {resposta && (
            <div className="mt-4 rounded-folha bg-papel p-3">
              <span className={`inline-block rounded-full px-2.5 py-1 text-[13px] font-semibold ${VEREDITO[resposta.veredito].cor}`}>
                {VEREDITO[resposta.veredito].rotulo}
              </span>
              <p className="mt-2 text-[15.5px] leading-snug">{resposta.resposta}</p>
              {resposta.sugestao && <p className="mt-2 text-[14.5px] leading-snug text-grafite">💡 {resposta.sugestao}</p>}
            </div>
          )}
        </Folha>
      )}
    </div>
  );
}
