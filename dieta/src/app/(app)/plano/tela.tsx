"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  alternarAviso,
  apagarPlano,
  apagarRefeicao,
  criarPlanoVazio,
  salvarOrientacoes,
  salvarRefeicao,
  usarPlano,
} from "@/app/acoes";
import { CamposDaRefeicao, type Rascunho } from "@/componentes/editor-de-refeicao";
import { Botao, Cartao, Chave, Titulo, campo } from "@/componentes/pecas";
import { escreverTexto } from "@/lib/conteudo";
import type { PlanoCompleto, RefeicaoCompleta } from "@/lib/consultas";
import { SEMANA_CURTA, horaFalada } from "@/lib/datas";
import { OQueComer } from "../hoje";

type Anterior = { id: string; nome: string; criadoEm: string; refeicoes: number };

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
const diasPorExtenso = (dias: number[]) => (dias.length === 0 ? "" : dias.map((d) => SEMANA_CURTA[d]).join(", "));

export function TelaPlano({ plano, anteriores }: { plano: PlanoCompleto | null; anteriores: Anterior[] }) {
  const [, iniciar] = useTransition();
  const [editando, setEditando] = useState<string | "nova" | null>(null);

  return (
    <>
      <Titulo
        depois={
          <Link href="/plano/novo" className="mb-1 rounded-folha bg-folha px-3.5 py-2 text-[15px] font-medium text-sobre-cor">
            Plano novo
          </Link>
        }
      >
        Plano
      </Titulo>

      <Link href="/refeicoes" className="mb-4 flex items-center justify-between gap-3 rounded-cartao bg-cartao p-4 shadow-cartao">
        <span>
          <span className="block text-[17px] font-semibold">Minhas refeições</span>
          <span className="block text-[14px] leading-snug text-grafite">As que você repete: cadastre uma vez e escolha num toque em Hoje.</span>
        </span>
        <span aria-hidden className="text-[20px] text-fosco">
          ›
        </span>
      </Link>

      {!plano && (
        <Cartao>
          <p className="text-[18px] font-semibold">Nenhum plano ainda</p>
          <p className="mt-1 text-[15px] leading-snug text-grafite">
            O jeito mais rápido é mandar o PDF ou as fotos do plano da nutricionista. Se preferir, comece um em branco e
            cadastre refeição por refeição.
          </p>
          <div className="mt-4 flex gap-2">
            <Link href="/plano/novo" className="rounded-folha bg-folha px-4 py-2.5 font-medium text-sobre-cor">
              Ler o plano
            </Link>
            <Botao onClick={() => iniciar(() => criarPlanoVazio())}>Começar em branco</Botao>
          </div>
        </Cartao>
      )}

      {plano && (
        <>
          <Cabecalho plano={plano} />

          <div className="mt-4 space-y-3">
            {plano.refeicoes.map((r) =>
              editando === r.id ? (
                <Editor key={r.id} planoId={plano.id} refeicao={r} aoFechar={() => setEditando(null)} />
              ) : (
                <Cartao key={r.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] tabular text-fosco">
                        {horaFalada(r.horario)}
                        {r.dias.length > 0 && <> · só {diasPorExtenso(r.dias)}</>}
                      </p>
                      <p className="text-[19px] font-semibold leading-tight">{r.nome}</p>
                    </div>
                    <label className="flex items-center gap-2 text-[13px] text-fosco">
                      Aviso
                      <Chave ligado={r.avisar} rotulo={`Aviso de ${r.nome}`} aoMudar={(v) => iniciar(() => alternarAviso(r.id, v))} />
                    </label>
                  </div>
                  <OQueComer conteudo={r.conteudo} />
                  {r.nota && <p className="mt-2 rounded-folha bg-papel px-3 py-2 text-[14px] text-grafite">{r.nota}</p>}
                  <Botao className="mt-3 w-full" onClick={() => setEditando(r.id)}>
                    Editar
                  </Botao>
                </Cartao>
              ),
            )}

            {editando === "nova" ? (
              <Editor planoId={plano.id} aoFechar={() => setEditando(null)} />
            ) : (
              <Botao className="w-full !bg-cartao shadow-cartao" onClick={() => setEditando("nova")}>
                + Refeição
              </Botao>
            )}
          </div>
        </>
      )}

      {anteriores.length > 0 && (
        <section className="mt-8">
          <p className="sobrescrito mb-2 px-1">Planos anteriores</p>
          <Cartao className="divide-y divide-linha !py-1">
            {anteriores.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{a.nome}</p>
                  <p className="text-[13px] text-fosco">
                    {dataCurta(a.criadoEm)} · {a.refeicoes} refeições
                  </p>
                </div>
                <div className="flex gap-1">
                  <Botao className="!px-3 !py-1.5 text-[14px]" onClick={() => iniciar(() => usarPlano(a.id))}>
                    Usar
                  </Botao>
                  <Botao
                    tipo="fantasma"
                    className="!px-2 !py-1.5 text-[14px]"
                    aria-label={`Apagar ${a.nome}`}
                    onClick={() => confirm(`Apagar "${a.nome}" de vez?`) && iniciar(() => apagarPlano(a.id))}
                  >
                    ✕
                  </Botao>
                </div>
              </div>
            ))}
          </Cartao>
        </section>
      )}
    </>
  );
}

function Cabecalho({ plano }: { plano: PlanoCompleto }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(plano.nome);
  const [orientacoes, setOrientacoes] = useState(plano.orientacoes);
  const [pendente, iniciar] = useTransition();

  if (editando) {
    return (
      <Cartao className="space-y-3">
        <label className="block">
          <span className="text-[13px] text-fosco">Nome do plano</span>
          <input className={campo} value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-[13px] text-fosco">Orientações gerais</span>
          <textarea className={`${campo} min-h-[120px]`} value={orientacoes} onChange={(e) => setOrientacoes(e.target.value)} />
        </label>
        <div className="flex gap-2">
          <Botao
            tipo="primario"
            disabled={pendente}
            className="flex-1"
            onClick={() =>
              iniciar(async () => {
                await salvarOrientacoes(plano.id, nome, orientacoes);
                setEditando(false);
              })
            }
          >
            Salvar
          </Botao>
          <Botao tipo="fantasma" onClick={() => setEditando(false)}>
            Cancelar
          </Botao>
        </div>
      </Cartao>
    );
  }

  return (
    <Cartao>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="sobrescrito">Em uso desde {dataCurta(plano.criadoEm.toISOString())}</p>
          <p className="text-[19px] font-semibold">{plano.nome}</p>
        </div>
        <Botao tipo="fantasma" className="!px-2 !py-1 text-[15px]" onClick={() => setEditando(true)}>
          Editar
        </Botao>
      </div>
      {plano.orientacoes ? (
        <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-grafite">{plano.orientacoes}</p>
      ) : (
        <p className="mt-1 text-[14px] text-fosco">Sem orientações gerais.</p>
      )}
    </Cartao>
  );
}

function Editor({ planoId, refeicao, aoFechar }: { planoId: string; refeicao?: RefeicaoCompleta; aoFechar: () => void }) {
  const [valor, setValor] = useState<Rascunho>({
    nome: refeicao?.nome ?? "",
    horario: refeicao?.horario ?? "12:00",
    texto: refeicao ? escreverTexto(refeicao.conteudo) : "",
    nota: refeicao?.nota ?? "",
    dias: refeicao?.dias ?? [],
  });
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  const salvar = () =>
    iniciar(async () => {
      const r = await salvarRefeicao(planoId, refeicao?.id ?? null, { ...valor, avisar: refeicao?.avisar ?? true });
      if (r.erro) setErro(r.erro);
      else aoFechar();
    });

  return (
    <Cartao className="ring-2 ring-folha">
      <CamposDaRefeicao valor={valor} aoMudar={setValor} />
      {erro && <p className="mt-2 text-[14px] text-pulou">{erro}</p>}
      <div className="mt-4 flex gap-2">
        <Botao tipo="primario" className="flex-1" disabled={pendente} onClick={salvar}>
          {pendente ? "Salvando…" : "Salvar"}
        </Botao>
        <Botao tipo="fantasma" onClick={aoFechar}>
          Cancelar
        </Botao>
      </div>
      {refeicao && (
        <Botao
          tipo="perigo"
          className="mt-2 w-full"
          onClick={() =>
            confirm(`Tirar "${refeicao.nome}" do plano?`) &&
            iniciar(async () => {
              await apagarRefeicao(refeicao.id);
              aoFechar();
            })
          }
        >
          Tirar do plano
        </Botao>
      )}
    </Cartao>
  );
}
