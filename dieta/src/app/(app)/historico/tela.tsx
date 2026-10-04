"use client";

import { useState } from "react";
import { Miniaturas } from "@/componentes/foto-do-prato";
import { Botao, Cartao, Titulo } from "@/componentes/pecas";
import { milhar } from "@/lib/analise";
import { textoParaNutricionista } from "@/lib/relatorio";
import { litros } from "@/lib/ajustes";
import type { DiaDoHistorico } from "@/lib/consultas";
import { diaCurto, diaPorExtenso, horaFalada } from "@/lib/datas";

const COR = { seguiu: "bg-folha", trocou: "bg-troca", pulou: "bg-pulou" } as const;
const ROTULO = { seguiu: "segui", trocou: "troquei", pulou: "pulei" } as const;

/**
 * Como foi o mês: por semana, quanto do plano foi seguido e quantos dias a
 * água bateu a meta; por dia, o detalhe. É o que levar para a consulta.
 */
export function TelaHistorico({ dias, metaDeAgua, nomeDoPlano }: { dias: DiaDoHistorico[]; metaDeAgua: number; nomeDoPlano: string }) {
  const temAlgo = (d: DiaDoHistorico) => d.seguiu + d.trocou + d.pulou + d.agua + d.fotos.length > 0;
  // Semana sem nada marcado não vira cartão, e a lista de dias para no
  // primeiro dia com registro: no começo do uso, 28 linhas vazias só assustam.
  const semanas = [0, 1, 2, 3].map((i) => dias.slice(i * 7, i * 7 + 7)).filter((s) => s.length && s.some(temAlgo));
  const algumRegistro = dias.some(temAlgo);
  let ultimo = dias.length - 1;
  while (ultimo > 0 && !temAlgo(dias[ultimo])) ultimo--;
  const visiveis = dias.slice(0, ultimo + 1);

  return (
    <>
      <Titulo>Histórico</Titulo>

      {algumRegistro && <Compartilhar dias={dias} metaDeAgua={metaDeAgua} nomeDoPlano={nomeDoPlano} />}

      {!algumRegistro && (
        <Cartao>
          <p className="text-grafite">
            Ainda não há nada aqui. Conforme você marcar as refeições e a água na tela Hoje, cada semana aparece com o
            quanto seguiu do plano.
          </p>
        </Cartao>
      )}

      {algumRegistro && (
        <div className="grid grid-cols-2 gap-3">
          {semanas.map((s, i) => (
            <ResumoDaSemana key={i} dias={s} metaDeAgua={metaDeAgua} titulo={s[0] === dias[0] ? "Últimos 7 dias" : `${diaCurto(s[s.length - 1].dia)} a ${diaCurto(s[0].dia)}`} />
          ))}
        </div>
      )}

      {algumRegistro && (
        <Cartao className="mt-4 divide-y divide-linha !py-1">
          {visiveis.map((d) => (
            <LinhaDoDia key={d.dia} d={d} metaDeAgua={metaDeAgua} />
          ))}
        </Cartao>
      )}
    </>
  );
}

function ResumoDaSemana({ dias, metaDeAgua, titulo }: { dias: DiaDoHistorico[]; metaDeAgua: number; titulo: string }) {
  const seguiu = dias.reduce((s, d) => s + d.seguiu, 0);
  const trocou = dias.reduce((s, d) => s + d.trocou, 0);
  const pulou = dias.reduce((s, d) => s + d.pulou, 0);
  const total = seguiu + trocou + pulou;
  const diasNaMeta = dias.filter((d) => d.agua >= metaDeAgua).length;

  return (
    <Cartao className="!p-3.5">
      <p className="sobrescrito">{titulo}</p>
      <p className="mt-1 text-[28px] font-semibold tabular leading-none">
        {total ? `${Math.round((seguiu / total) * 100)}%` : "—"}
      </p>
      <p className="text-[13px] text-fosco">das refeições marcadas, seguindo o plano</p>
      {total > 0 && (
        <div className="mt-2 flex h-2 overflow-hidden rounded-full" aria-hidden>
          <div className="bg-folha" style={{ width: `${(seguiu / total) * 100}%` }} />
          <div className="bg-troca" style={{ width: `${(trocou / total) * 100}%` }} />
          <div className="bg-pulou" style={{ width: `${(pulou / total) * 100}%` }} />
        </div>
      )}
      <p className="mt-2 text-[13px] text-grafite">
        {seguiu} segui · {trocou} troquei · {pulou} pulei
      </p>
      <p className="mt-1 text-[13px] text-agua">
        💧 meta em {diasNaMeta} de {dias.length} dias
      </p>
    </Cartao>
  );
}

function LinhaDoDia({ d, metaDeAgua }: { d: DiaDoHistorico; metaDeAgua: number }) {
  const [aberto, setAberto] = useState(false);
  const vazio = d.registros.length === 0 && d.agua === 0 && d.fotos.length === 0;

  return (
    <div className="py-2.5">
      <button
        type="button"
        disabled={vazio}
        onClick={() => setAberto((a) => !a)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={aberto}
      >
        <span className={`w-[112px] shrink-0 text-[15px] capitalize ${vazio ? "text-fosco" : ""}`}>{diaPorExtenso(d.dia).replace(/ de \w+$/, "")}</span>
        <span className="flex flex-1 flex-wrap gap-1" aria-label={`${d.seguiu} segui, ${d.trocou} troquei, ${d.pulou} pulei`}>
          {d.registros.map((r, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full ${COR[r.estado as keyof typeof COR] ?? "bg-regua"}`} />
          ))}
        </span>
        <span className="w-[64px] shrink-0 text-right text-[13px] tabular text-fosco">{d.calorias ? `≈${milhar(d.calorias)}` : ""}</span>
        <span className={`w-[52px] shrink-0 text-right text-[13px] tabular ${d.agua >= metaDeAgua ? "font-semibold text-agua" : "text-fosco"}`}>
          {d.agua ? litros(d.agua) : ""}
        </span>
      </button>
      {aberto && (
        <ul className="mt-2 space-y-1 pl-1">
          {d.registros.map((r, i) => (
            <li key={i} className="text-[14.5px] text-grafite">
              <span className="tabular text-fosco">{horaFalada(r.horario)}</span> {r.nome} —{" "}
              {ROTULO[r.estado as keyof typeof ROTULO] ?? r.estado}
              {r.nota && <>: {r.nota}</>}
            </li>
          ))}
          {d.agua > 0 && <li className="text-[14.5px] text-grafite">💧 {litros(d.agua)} de água</li>}
          {d.calorias > 0 && <li className="text-[14.5px] text-grafite">📷 ≈ {milhar(d.calorias)} kcal pelas fotos</li>}
        </ul>
      )}
      {aberto && <Miniaturas fotos={d.fotos} />}
    </div>
  );
}

/** Manda o resumo das últimas semanas pelo share sheet do iPhone (WhatsApp, e-mail…). */
function Compartilhar({ dias, metaDeAgua, nomeDoPlano }: { dias: DiaDoHistorico[]; metaDeAgua: number; nomeDoPlano: string }) {
  const [recado, setRecado] = useState("");
  const enviar = async (n: number) => {
    const texto = textoParaNutricionista(
      dias.slice(0, n).map((d) => ({ ...d, fotos: d.fotos.length })),
      metaDeAgua,
      nomeDoPlano,
    );
    try {
      if (navigator.share) await navigator.share({ text: texto });
      else {
        await navigator.clipboard.writeText(texto);
        setRecado("Resumo copiado. É só colar no WhatsApp ou no e-mail.");
      }
    } catch {
      /* fechou o compartilhar sem escolher: tudo bem */
    }
  };
  return (
    <Cartao className="mb-4">
      <p className="font-semibold">Para a nutricionista</p>
      <p className="mt-0.5 text-[14px] text-grafite">Um resumo em texto: quanto seguiu do plano, água, trocas e o que mais pulou.</p>
      <div className="mt-3 flex gap-2">
        <Botao tipo="primario" className="flex-1" onClick={() => enviar(14)}>
          Últimas 2 semanas
        </Botao>
        <Botao className="flex-1" onClick={() => enviar(28)}>
          Últimas 4
        </Botao>
      </div>
      {recado && <p className="mt-2 text-[14px] text-grafite">{recado}</p>}
    </Cartao>
  );
}
