"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BLOCOS, COLECOES, type ChaveBloco, type Dados, type TipoItem } from "@/lib/esquema";
import { alternarOculto, apagarItem, criarItem, moverItem, restaurarItem, salvarBloco, salvarItem } from "@/lib/acoes";
import { hojeEmSaoPaulo } from "@/lib/datas";
import { useEdicao } from "./Provedor";
import { Painel } from "./Painel";

const botaoEditar =
  "inline-flex items-center gap-1.5 rounded-full bg-edicao px-4 py-2 font-titulo text-sm font-bold text-marinho shadow-lg ring-2 ring-marinho/10 transition hover:scale-105 hover:ring-marinho/40";

/**
 * Envolve uma parte do site. Para a equipe, ganha contorno tracejado e o botão
 * "Editar"; para o visitante, é só o conteúdo.
 */
export function BlocoEditavel({
  chave,
  dados,
  children,
  className = "",
}: {
  chave: ChaveBloco;
  dados: Dados;
  children: React.ReactNode;
  className?: string;
}) {
  const { editando, avisar } = useEdicao();
  const [aberto, setAberto] = useState(false);
  const router = useRouter();
  const bloco = BLOCOS[chave];

  if (!editando) return <div className={className}>{children}</div>;
  return (
    <div className={`relative outline-dashed outline-2 -outline-offset-4 outline-edicao ${className}`}>
      {children}
      <div className="absolute right-3 top-3 z-20">
        <button type="button" className={botaoEditar} onClick={() => setAberto(true)}>
          ✏️ Editar {bloco.titulo.toLowerCase()}
        </button>
      </div>
      {aberto ? (
        <Painel
          titulo={bloco.titulo}
          descricao={"descricao" in bloco ? bloco.descricao : undefined}
          campos={bloco.campos}
          iniciais={dados}
          fechar={() => setAberto(false)}
          salvar={async (v) => {
            const r = await salvarBloco(chave, v);
            if (r.ok) {
              setAberto(false);
              avisar({ texto: "Salvo! Já está no site.", tom: "ok" });
              router.refresh();
            }
            return r;
          }}
        />
      ) : null}
    </div>
  );
}

/** Botão "+ Adicionar …" no fim de uma lista. Só a equipe vê. */
export function AdicionarItem({ tipo, className = "" }: { tipo: TipoItem; className?: string }) {
  const { editando, avisar } = useEdicao();
  const [aberto, setAberto] = useState(false);
  const router = useRouter();
  if (!editando) return null;
  const col = COLECOES[tipo];
  const iniciais: Dados = col.campos.some((c) => c.nome === "data") ? { data: hojeEmSaoPaulo() } : {};
  if (col.campos.some((c) => c.nome === "cor")) iniciais.cor = "amarelo";

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={`flex min-h-[4.5rem] w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-dashed border-marinho/40 bg-edicao/30 px-5 py-4 font-titulo text-base font-bold text-marinho transition hover:border-marinho hover:bg-edicao/60 ${className}`}
      >
        <span className="text-2xl leading-none">+</span> {col.novo}
      </button>
      {aberto ? (
        <Painel
          titulo={col.novo}
          campos={col.campos}
          iniciais={iniciais}
          rotuloSalvar="Adicionar ao site"
          fechar={() => setAberto(false)}
          salvar={async (v) => {
            const r = await criarItem(tipo, v);
            if (r.ok) {
              setAberto(false);
              avisar({ texto: "Adicionado! Já está no site.", tom: "ok" });
              router.refresh();
            }
            return r;
          }}
        />
      ) : null}
    </>
  );
}

/**
 * A barrinha que aparece em cima de cada item para a equipe: editar, mudar de
 * lugar, esconder e apagar. Apagar não pergunta nada — em vez disso, oferece
 * "Desfazer" por alguns segundos, e o painel guarda o item na lixeira.
 */
export function FerramentasItem({
  tipo,
  id,
  dados,
  oculto,
  primeiro,
  ultimo,
}: {
  tipo: TipoItem;
  id: string;
  dados: Dados;
  oculto: boolean;
  primeiro?: boolean;
  ultimo?: boolean;
}) {
  const { editando, avisar } = useEdicao();
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  if (!editando) return null;
  const col = COLECOES[tipo];
  const manual = col.ordenacao === "manual";

  const rodar = (fn: () => Promise<{ ok: boolean; erro?: string }>, sucesso?: () => void) =>
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) avisar({ texto: r.erro ?? "Não deu certo.", tom: "erro" });
      else {
        sucesso?.();
        router.refresh();
      }
    });

  const peq =
    "grid h-9 min-w-9 place-items-center rounded-full bg-white px-2.5 font-corpo text-sm font-bold text-marinho shadow ring-1 ring-marinho/15 hover:bg-edicao disabled:opacity-40";

  return (
    <>
      <div className={`relative z-20 flex flex-wrap items-center gap-1.5 bg-edicao/50 p-2 ${pendente ? "opacity-60" : ""}`}>
        <button type="button" onClick={() => setAberto(true)} className={`${peq} bg-edicao px-3.5`}>
          ✏️ Editar
        </button>
        {manual ? (
          <>
            <button type="button" aria-label="Mover para antes" title="Mover para antes" disabled={primeiro || pendente} onClick={() => rodar(() => moverItem(id, -1))} className={peq}>
              ←
            </button>
            <button type="button" aria-label="Mover para depois" title="Mover para depois" disabled={ultimo || pendente} onClick={() => rodar(() => moverItem(id, 1))} className={peq}>
              →
            </button>
          </>
        ) : null}
        <button
          type="button"
          title={oculto ? "Mostrar para todo mundo" : "Esconder dos visitantes"}
          disabled={pendente}
          onClick={() =>
            rodar(
              () => alternarOculto(id),
              () => avisar({ texto: oculto ? "Publicado: todo mundo vê." : "Escondido: só a equipe vê.", tom: "ok" }),
            )
          }
          className={peq}
        >
          {oculto ? "👁 Publicar" : "🙈 Esconder"}
        </button>
        <button
          type="button"
          title="Apagar"
          aria-label="Apagar"
          disabled={pendente}
          onClick={() =>
            rodar(
              () => apagarItem(id),
              () =>
                avisar({
                  texto: col.apagado,
                  tom: "ok",
                  acao: { rotulo: "Desfazer", fazer: () => rodar(() => restaurarItem(id)) },
                }),
            )
          }
          className={`${peq} ml-auto text-red-700`}
        >
          🗑
        </button>
      </div>
      {oculto ? (
        <p className="relative z-20 bg-marinho px-3 py-1.5 font-corpo text-xs font-bold text-white">
          🙈 Escondido — só a equipe vê. Toque em “Publicar” para aparecer no site.
        </p>
      ) : null}
      {aberto ? (
        <Painel
          titulo={`Editar ${col.singular}`}
          campos={col.campos}
          iniciais={dados}
          fechar={() => setAberto(false)}
          salvar={async (v) => {
            const r = await salvarItem(id, v);
            if (r.ok) {
              setAberto(false);
              avisar({ texto: "Salvo! Já está no site.", tom: "ok" });
              router.refresh();
            }
            return r;
          }}
        />
      ) : null}
    </>
  );
}

/** Só aparece para a equipe em modo de edição — dicas e espaços vazios. */
export function SoEquipe({ children }: { children: React.ReactNode }) {
  const { editando } = useEdicao();
  return editando ? <>{children}</> : null;
}

/** Aviso de lugar vazio, para a equipe saber que ali cabe alguma coisa. */
export function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <SoEquipe>
      <p className="rounded-2xl border-2 border-dashed border-marinho/25 px-5 py-6 text-center font-corpo text-[15px] text-marinho/70">
        {children}
      </p>
    </SoEquipe>
  );
}
