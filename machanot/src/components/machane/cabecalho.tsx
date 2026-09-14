"use client";

import { useState, useTransition } from "react";
import { useMachane } from "./provedor";
import { Selo } from "@/components/ui/badge";
import { Selecao } from "@/components/ui/input";
import { Aviso } from "@/components/ui/avisos";
import { mudarStatus } from "@/app/actions";
import { STATUS, TIPOS_MACHANE } from "@/lib/textos";
import { gastosNaoRevisados, podePublicar, type StatusMachane } from "@/lib/estado";

const TOM = {
  RASCUNHO: "neutro",
  EM_REVISAO: "atencao",
  PUBLICADA: "ok",
  ENCERRADA: "neutro",
} as const;

export function CabecalhoMachane() {
  const { estado, refletirStatus } = useMachane();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const naoRevisados = gastosNaoRevisados(estado);
  const publicacao = podePublicar(estado);

  function trocarStatus(novo: StatusMachane) {
    setErro(null);
    iniciar(async () => {
      if (novo === "PUBLICADA" && !publicacao.pode) {
        setErro(publicacao.motivos.join(" "));
        return;
      }
      const r = await mudarStatus(estado.id, novo);
      if (!r.ok) setErro(r.erro);
      else refletirStatus(novo);
    });
  }

  return (
    <div className="sem-impressao space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-lg font-semibold">{estado.nome}</h1>
          <span className="text-xs text-suave">
            {TIPOS_MACHANE[estado.tipo]} · {estado.ano} · grandes {estado.diasGrandes} dias ·
            pequenos {estado.diasPequenos} dias
          </span>
          {estado.duplicadaDe ? (
            <Selo>duplicada de {estado.duplicadaDe.nome}</Selo>
          ) : null}
          {naoRevisados.length > 0 ? (
            <Selo variante="atencao">{naoRevisados.length} gasto(s) sem revisão</Selo>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Selo variante={TOM[estado.status]}>{STATUS[estado.status]}</Selo>
          <Selecao
            aria-label="Status da machané"
            className="h-8 w-auto py-0 text-xs"
            value={estado.status}
            disabled={pendente}
            onChange={(e) => trocarStatus(e.target.value as StatusMachane)}
          >
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Selecao>
        </div>
      </div>

      {erro ? <Aviso tom="erro">{erro}</Aviso> : null}
      {estado.status === "PUBLICADA" ? (
        <Aviso tom="ok">
          Esta machané está publicada: a grade de preços já foi divulgada. Mexer em custo ou rateio
          agora muda um preço que as famílias já viram.
        </Aviso>
      ) : null}
      {estado.status === "ENCERRADA" ? (
        <Aviso>Machané encerrada — os campos ficam só para consulta.</Aviso>
      ) : null}
    </div>
  );
}
