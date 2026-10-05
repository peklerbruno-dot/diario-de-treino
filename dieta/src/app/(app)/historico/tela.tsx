"use client";

import Link from "next/link";
import { ESTADO } from "@/componentes/cores-do-dia";
import { CompartilharSemana } from "@/componentes/compartilhar-semana";
import { FotosDoCorpo } from "@/componentes/fotos-do-corpo";
import { PesoEMedidas } from "@/componentes/medidas";
import { Cartao } from "@/componentes/pecas";
import { milhar } from "@/lib/analise";
import { litros } from "@/lib/ajustes";
import type { DiaDoHistorico, FotoDoCorpo, MedidaVista } from "@/lib/consultas";
import { diaCurto, diaPorExtenso } from "@/lib/datas";

/**
 * Como foi o mês: por semana, quanto do plano foi seguido e quantos dias a
 * água bateu a meta; por dia, o detalhe. É o que levar para a consulta.
 */
export function TelaHistorico({
  dias,
  medidas,
  corpo,
  hoje,
  metaDeAgua,
  nomeDoPlano,
}: {
  dias: DiaDoHistorico[];
  medidas: MedidaVista[];
  corpo: FotoDoCorpo[];
  hoje: string;
  metaDeAgua: number;
  nomeDoPlano: string;
}) {
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
      <div className="mb-4 space-y-4">
        <PesoEMedidas lista={medidas} hoje={hoje} />
        <FotosDoCorpo lista={corpo} hoje={hoje} />
      </div>

      {(algumRegistro || medidas.length > 0) && <CompartilharSemana dias={dias} medidas={medidas} metaDeAgua={metaDeAgua} nomeDoPlano={nomeDoPlano} />}

      {!algumRegistro && (
        <Cartao>
          <p className="text-grafite">
            Ainda não há refeições marcadas. Conforme você marcar as refeições e a água na tela Hoje, cada semana aparece com o
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
        <p className="mt-5 px-1 text-[13px] text-fosco">Toque num dia para ver tudo dele: refeições, fotos e água.</p>
      )}
      {algumRegistro && (
        <Cartao className="mt-2 divide-y divide-linha !py-1">
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
  const vazio = d.registros.length === 0 && d.agua === 0 && d.fotos.length === 0;
  const conteudo = (
    <>
      <span className={`w-[112px] shrink-0 text-[15px] capitalize ${vazio ? "text-fosco" : ""}`}>{diaPorExtenso(d.dia).replace(/ de \w+$/, "")}</span>
      <span className="flex flex-1 flex-wrap items-center gap-1" aria-label={`${d.seguiu} segui, ${d.trocou} troquei, ${d.pulou} pulei`}>
        {d.registros.map((r, i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-full ${ESTADO[r.estado]?.ponto ?? "bg-regua"}`} />
        ))}
        {d.fotos.length > 0 && <span className="ml-1 text-[12px] text-fosco">📷 {d.fotos.length}</span>}
      </span>
      <span className="w-[56px] shrink-0 text-right text-[13px] tabular text-fosco">{d.calorias ? `≈${milhar(d.calorias)}` : ""}</span>
      <span className={`w-[48px] shrink-0 text-right text-[13px] tabular ${d.agua >= metaDeAgua ? "font-semibold text-agua" : "text-fosco"}`}>
        {d.agua ? litros(d.agua) : ""}
      </span>
    </>
  );
  if (vazio) return <div className="flex items-center gap-3 py-2.5">{conteudo}</div>;
  return (
    <Link href={`/historico/dia/${d.dia}`} className="flex items-center gap-3 py-2.5">
      {conteudo}
      <span className="text-fosco" aria-hidden>
        ›
      </span>
    </Link>
  );
}
