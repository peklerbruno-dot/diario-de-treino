"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { beberAgua, desfazerAgua, marcarRefeicao } from "@/app/acoes";
import { ConviteDeAvisos } from "@/componentes/avisos";
import { IconeGota } from "@/componentes/icones";
import { Botao, Cartao, Titulo, campo } from "@/componentes/pecas";
import { litros, type Ajustes } from "@/lib/ajustes";
import { ritmoDaAgua } from "@/lib/agenda";
import type { Conteudo } from "@/lib/conteudo";
import type { Marca, RefeicaoCompleta } from "@/lib/consultas";
import { type Agora, diaPorExtenso, horaFalada, paraMinutos } from "@/lib/datas";

type Props = {
  agora: Agora;
  temPlano: boolean;
  orientacoes: string;
  refeicoes: RefeicaoCompleta[];
  marcas: Record<string, Marca>;
  agua: number;
  ajustes: Ajustes;
  chavePublica: string;
};

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function TelaHoje(p: Props) {
  const feitas = p.refeicoes.filter((r) => p.marcas[r.id]).length;

  // A próxima é a primeira ainda não marcada cujo horário não passou há mais de
  // uma hora. A que passou há mais tempo e não foi marcada fica quieta, sem
  // destaque — ela pede um toque, não uma bronca.
  const proxima = p.refeicoes.find((r) => !p.marcas[r.id] && (paraMinutos(r.horario) ?? 0) + 60 > p.agora.minutos);

  return (
    <>
      <Titulo
        depois={
          p.refeicoes.length > 0 && (
            <span className="pb-1 text-[15px] text-fosco tabular">
              {feitas} de {p.refeicoes.length}
            </span>
          )
        }
      >
        <span className="block text-[15px] font-normal text-fosco">{maiuscula(diaPorExtenso(p.agora.dia))}</span>
        Hoje
      </Titulo>

      {p.temPlano && <ConviteDeAvisos chavePublica={p.chavePublica} />}

      {!p.temPlano && (
        <Cartao className="mb-4">
          <p className="text-[18px] font-semibold">Comece pelo plano da nutricionista</p>
          <p className="mt-1 text-[15px] leading-snug text-grafite">
            Mande o PDF ou as fotos do plano: o app lê as refeições, os horários e as substituições, e você confere
            antes de salvar.
          </p>
          <Link href="/plano/novo" className="mt-4 inline-block rounded-folha bg-folha px-4 py-2.5 font-medium text-sobre-cor">
            Ler o plano
          </Link>
        </Cartao>
      )}

      <CartaoAgua agua={p.agua} ajustes={p.ajustes} minutos={p.agora.minutos} />

      {p.temPlano && p.refeicoes.length === 0 && (
        <Cartao className="mt-4">
          <p className="text-grafite">Nenhuma refeição no plano para hoje.</p>
        </Cartao>
      )}

      <div className="mt-4 space-y-3">
        {p.refeicoes.map((r) => (
          <CartaoRefeicao key={r.id} dia={p.agora.dia} refeicao={r} marca={p.marcas[r.id]} proxima={proxima?.id === r.id} />
        ))}
      </div>

      {p.orientacoes && (
        <details className="mt-4 rounded-cartao bg-cartao p-4 shadow-cartao">
          <summary className="cursor-pointer font-medium">Orientações da nutricionista</summary>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-grafite">{p.orientacoes}</p>
        </details>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Água
// ---------------------------------------------------------------------------

function CartaoAgua({ agua, ajustes, minutos }: { agua: number; ajustes: Ajustes; minutos: number }) {
  const [, iniciar] = useTransition();
  const [otimista, somar] = useOptimistic(agua, (atual, delta: number) => Math.max(0, atual + delta));
  const fracao = Math.min(1, otimista / ajustes.aguaMeta);
  const ritmo = Math.min(1, ritmoDaAgua(ajustes, minutos) / ajustes.aguaMeta);
  const bateu = otimista >= ajustes.aguaMeta;

  const beber = (ml: number) =>
    iniciar(async () => {
      somar(ml);
      await beberAgua(ml);
    });

  return (
    <Cartao id="agua">
      <div className="flex items-baseline justify-between">
        <p className="flex items-center gap-1.5 font-semibold">
          <IconeGota className="h-5 w-5 text-agua" /> Água
        </p>
        <p className="tabular text-[15px] text-grafite">
          <span className="text-[20px] font-semibold text-tinta">{litros(otimista)}</span> de {litros(ajustes.aguaMeta)}
        </p>
      </div>

      <div
        className="relative mt-3 h-3 overflow-hidden rounded-full bg-agua-clara"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={ajustes.aguaMeta}
        aria-valuenow={otimista}
        aria-label="Água bebida hoje"
      >
        <div className="h-full rounded-full bg-agua transition-[width] duration-300" style={{ width: `${fracao * 100}%` }} />
        {/* O tracinho é onde você deveria estar a esta hora para fechar a meta no fim do dia. */}
        {!bateu && ritmo > 0 && ritmo < 1 && (
          <div className="absolute top-0 h-full w-0.5 bg-tinta/40" style={{ left: `${ritmo * 100}%` }} />
        )}
      </div>
      <p className="mt-1.5 text-[13px] text-fosco">
        {bateu ? "Meta do dia batida. 🎉" : `Faltam ${litros(ajustes.aguaMeta - otimista)}. O tracinho é o ritmo para chegar lá.`}
      </p>

      <div className="mt-3 flex gap-2">
        <Botao tipo="primario" className="flex-1 !bg-agua" aria-label={`Bebi um copo, ${litros(ajustes.copo)}`} onClick={() => beber(ajustes.copo)}>
          + 1 copo
        </Botao>
        <Botao onClick={() => beber(ajustes.copo * 2)}>+ {litros(ajustes.copo * 2)}</Botao>
        {otimista > 0 && (
          <Botao
            tipo="fantasma"
            aria-label="Desfazer o último copo"
            onClick={() =>
              iniciar(async () => {
                await desfazerAgua();
              })
            }
          >
            ↶
          </Botao>
        )}
      </div>
    </Cartao>
  );
}

// ---------------------------------------------------------------------------
// Refeição
// ---------------------------------------------------------------------------

const ESTADOS = {
  seguiu: { rotulo: "Segui", simbolo: "✓", cor: "bg-folha-clara text-folha" },
  trocou: { rotulo: "Troquei", simbolo: "⇄", cor: "bg-troca-clara text-troca" },
  pulou: { rotulo: "Pulei", simbolo: "✕", cor: "bg-pulou-clara text-pulou" },
} as const;
type Estado = keyof typeof ESTADOS;

function CartaoRefeicao({
  dia,
  refeicao: r,
  marca,
  proxima,
}: {
  dia: string;
  refeicao: RefeicaoCompleta;
  marca?: Marca;
  proxima: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [otimista, marcar] = useOptimistic(marca, (_: Marca | undefined, nova: Marca | undefined) => nova);
  const [aberta, setAberta] = useState(!marca);
  const [trocando, setTrocando] = useState(false);
  const [oQueComeu, setOQueComeu] = useState(marca?.nota ?? "");

  const gravar = (estado: Estado | "", nota = "") =>
    iniciar(async () => {
      marcar(estado ? { estado, nota } : undefined);
      setTrocando(false);
      if (estado) setAberta(false);
      await marcarRefeicao(dia, r.id, estado, nota);
    });

  const tocar = (estado: Estado) => {
    if (otimista?.estado === estado) return gravar(""); // tocar de novo desmarca
    if (estado === "trocou") return setTrocando(true);
    gravar(estado);
  };

  return (
    <Cartao id={`r-${r.id}`} className={proxima ? "ring-2 ring-folha" : ""}>
      <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setAberta((a) => !a)}>
        <div>
          <p className="text-[13px] tabular text-fosco">
            {horaFalada(r.horario)}
            {proxima && <span className="ml-2 font-semibold uppercase tracking-wide text-folha">Próxima</span>}
          </p>
          <p className="text-[19px] font-semibold leading-tight">{r.nome}</p>
        </div>
        {!aberta && <span className="shrink-0 pt-1 text-[13px] text-fosco">ver ▾</span>}
      </button>

      {otimista?.estado === "trocou" && otimista.nota && !trocando && (
        <p className="mt-1 text-[15px] text-grafite">Comi: {otimista.nota}</p>
      )}

      {aberta && (
        <>
          <OQueComer conteudo={r.conteudo} />
          {r.nota && <p className="mt-2 rounded-folha bg-papel px-3 py-2 text-[14px] leading-snug text-grafite">{r.nota}</p>}
        </>
      )}

      {trocando ? (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            gravar("trocou", oQueComeu);
          }}
        >
          <label className="text-[14px] text-grafite" htmlFor={`troca-${r.id}`}>
            O que você comeu no lugar? (opcional)
          </label>
          <input
            id={`troca-${r.id}`}
            className={`${campo} mt-1`}
            value={oQueComeu}
            onChange={(e) => setOQueComeu(e.target.value)}
            placeholder="Ex.: sanduíche natural"
            autoFocus
          />
          <div className="mt-2 flex gap-2">
            <Botao type="submit" tipo="primario" className="flex-1 !bg-troca">
              Salvar troca
            </Botao>
            <Botao tipo="fantasma" onClick={() => setTrocando(false)}>
              Cancelar
            </Botao>
          </div>
        </form>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2" aria-busy={pendente}>
          {(Object.keys(ESTADOS) as Estado[]).map((e) => {
            const ativo = otimista?.estado === e;
            return (
              <button
                key={e}
                type="button"
                aria-pressed={ativo}
                onClick={() => tocar(e)}
                className={`rounded-folha py-2.5 text-[15px] font-medium transition-colors ${
                  ativo ? ESTADOS[e].cor : "bg-papel text-grafite"
                }`}
              >
                {ESTADOS[e].simbolo} {ESTADOS[e].rotulo}
              </button>
            );
          })}
        </div>
      )}
    </Cartao>
  );
}

/** Os itens da refeição. Com mais de uma opção, uma fileira de abas no topo. */
export function OQueComer({ conteudo }: { conteudo: Conteudo }) {
  const [qual, setQual] = useState(0);
  const opcao = conteudo[Math.min(qual, conteudo.length - 1)];
  if (!opcao) return null;

  return (
    <div className="mt-3">
      {conteudo.length > 1 && (
        <div className="mb-2 flex gap-1.5 overflow-x-auto" role="tablist">
          {conteudo.map((o, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === qual}
              onClick={() => setQual(i)}
              className={`shrink-0 rounded-full px-3 py-1 text-[14px] ${i === qual ? "bg-tinta text-cartao" : "bg-papel text-grafite"}`}
            >
              {o.titulo || `Opção ${i + 1}`}
            </button>
          ))}
        </div>
      )}
      <ul className="divide-y divide-linha">
        {opcao.itens.map((item, i) => (
          <ItemDaRefeicao key={i} texto={item.texto} subs={item.subs} />
        ))}
      </ul>
    </div>
  );
}

function ItemDaRefeicao({ texto, subs }: { texto: string; subs: string[] }) {
  const [verTrocas, setVerTrocas] = useState(false);
  return (
    <li className="py-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[16px] leading-snug">{texto}</span>
        {subs.length > 0 && (
          <button
            type="button"
            onClick={() => setVerTrocas((v) => !v)}
            aria-expanded={verTrocas}
            className="shrink-0 rounded-full bg-papel px-2.5 py-0.5 text-[13px] text-grafite"
          >
            {subs.length} {subs.length === 1 ? "troca" : "trocas"}
          </button>
        )}
      </div>
      {verTrocas && (
        <ul className="mt-1 space-y-0.5 border-l-2 border-regua pl-3">
          {subs.map((s, i) => (
            <li key={i} className="text-[14.5px] leading-snug text-grafite">
              ou {s}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
