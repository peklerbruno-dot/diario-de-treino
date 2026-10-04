"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { apagarFoto, marcarRefeicao } from "@/app/acoes";
import { milhar, type Analise } from "@/lib/analise";
import type { FotoDoDia } from "@/lib/consultas";
import { horaFalada } from "@/lib/datas";
import { Botao } from "./pecas";
import { reduzirImagem } from "./reduzir";

/**
 * Foto do prato: escolher a refeição, tirar a foto, ver o que o Gemini achou.
 *
 * A câmera abre direto (`capture`), mas o iPhone ainda deixa escolher da
 * galeria — serve para a foto que se tirou no restaurante e se lembrou depois.
 */

type RefeicaoCurta = { id: string; nome: string; horario: string };
type Resultado = { id: string; analise: Analise | null; sugestao: "seguiu" | "trocou" | null; refeicao: RefeicaoCurta | null; previa: string };

const VEREDITO = {
  sim: { rotulo: "Dentro do plano", cor: "bg-folha-clara text-folha" },
  parcial: { rotulo: "Parcialmente no plano", cor: "bg-troca-clara text-troca" },
  nao: { rotulo: "Fora do plano", cor: "bg-pulou-clara text-pulou" },
  "sem-plano": { rotulo: "Fora das refeições do plano", cor: "bg-papel text-grafite" },
} as const;

export function BotaoDeFoto({ dia, refeicoes, sugerida }: { dia: string; refeicoes: RefeicaoCurta[]; sugerida?: string }) {
  const router = useRouter();
  const seletor = useRef<HTMLInputElement>(null);
  const [escolhendo, setEscolhendo] = useState(false);
  const [refeicao, setRefeicao] = useState<RefeicaoCurta | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const abrirCamera = (r: RefeicaoCurta | null) => {
    setRefeicao(r);
    setEscolhendo(false);
    seletor.current?.click();
  };

  const enviar = async (arquivo: File) => {
    setErro("");
    setEnviando(true);
    try {
      const reduzida = await reduzirImagem(arquivo, 1280, 0.8);
      const dados = new FormData();
      dados.append("imagem", new File([reduzida], "prato.jpg", { type: "image/jpeg" }));
      if (refeicao) dados.append("refeicaoId", refeicao.id);
      const r = await fetch("/api/foto", { method: "POST", body: dados });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.erro ?? "Não consegui salvar a foto.");
      setResultado({ id: j.id, analise: j.analise, sugestao: j.sugestao, refeicao, previa: URL.createObjectURL(reduzida) });
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui salvar a foto.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <input
        ref={seletor}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) enviar(f);
        }}
      />
      <Botao tipo="primario" className="w-full whitespace-nowrap" disabled={enviando} onClick={() => setEscolhendo(true)}>
        {enviando ? "Analisando…" : "📷 Foto do prato"}
      </Botao>
      {erro && <p className="mt-2 text-[14px] text-pulou">{erro}</p>}

      {escolhendo && (
        <Folha aoFechar={() => setEscolhendo(false)} titulo="De qual refeição é a foto?">
          <ul className="space-y-1.5">
            {refeicoes.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => abrirCamera(r)}
                  className={`flex w-full items-center justify-between rounded-folha px-4 py-3 text-left ${r.id === sugerida ? "bg-folha-clara" : "bg-papel"}`}
                >
                  <span className="font-medium">{r.nome}</span>
                  <span className="tabular text-[14px] text-fosco">{horaFalada(r.horario)}</span>
                </button>
              </li>
            ))}
            <li>
              <button type="button" onClick={() => abrirCamera(null)} className="w-full rounded-folha bg-papel px-4 py-3 text-left text-grafite">
                Outra coisa (fora do plano)
              </button>
            </li>
          </ul>
        </Folha>
      )}

      {resultado && <ResultadoDaFoto dia={dia} r={resultado} aoFechar={() => setResultado(null)} />}
    </div>
  );
}

function ResultadoDaFoto({ dia, r, aoFechar }: { dia: string; r: Resultado; aoFechar: () => void }) {
  const [, iniciar] = useTransition();
  const a = r.analise;
  const marcar = (estado: "seguiu" | "trocou") =>
    iniciar(async () => {
      if (r.refeicao) await marcarRefeicao(dia, r.refeicao.id, estado, estado === "trocou" ? (a?.descricao ?? "") : "");
      aoFechar();
    });

  return (
    <Folha aoFechar={aoFechar} titulo={r.refeicao ? r.refeicao.nome : "Foto salva"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={r.previa} alt="Foto do prato" className="max-h-[260px] w-full rounded-folha object-cover" />
      {a ? (
        <AnaliseDetalhada a={a} />
      ) : (
        <p className="mt-3 text-[15px] text-grafite">
          A foto foi salva, mas não deu para analisar agora (a leitura automática pode estar desligada ou sem cota).
        </p>
      )}
      {r.refeicao && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Botao tipo={r.sugestao === "seguiu" ? "primario" : "secundario"} onClick={() => marcar("seguiu")}>
            ✓ Segui
          </Botao>
          <Botao tipo={r.sugestao === "trocou" ? "primario" : "secundario"} className={r.sugestao === "trocou" ? "!bg-troca" : ""} onClick={() => marcar("trocou")}>
            ⇄ Troquei
          </Botao>
        </div>
      )}
      <Botao tipo="fantasma" className="mt-2 w-full" onClick={aoFechar}>
        {r.refeicao ? "Só salvar a foto" : "Fechar"}
      </Botao>
    </Folha>
  );
}

export function AnaliseDetalhada({ a }: { a: Analise }) {
  const v = VEREDITO[a.noPlano];
  return (
    <div className="mt-3">
      <span className={`inline-block rounded-full px-2.5 py-1 text-[13px] font-medium ${v.cor}`}>{v.rotulo}</span>
      {a.comentario && <p className="mt-2 text-[15px] leading-snug">{a.comentario}</p>}
      <p className="mt-2 text-[14.5px] text-grafite">{a.descricao}</p>
      {a.itens.length > 0 && (
        <ul className="mt-2 divide-y divide-linha text-[14.5px]">
          {a.itens.map((i, k) => (
            <li key={k} className="flex justify-between gap-3 py-1.5">
              <span>{i.alimento}</span>
              <span className="text-right text-fosco">{i.quantidade}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
        {[
          ["kcal", a.calorias],
          ["prot.", a.proteinas],
          ["carb.", a.carboidratos],
          ["gord.", a.gorduras],
        ].map(([rotulo, n], k) => (
          <div key={k} className="rounded-folha bg-papel py-2">
            <p className="tabular text-[17px] font-semibold">≈ {milhar(Number(n))}{k > 0 ? "g" : ""}</p>
            <p className="text-[12px] text-fosco">{rotulo}</p>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[12px] text-fosco">Estimativas a partir da foto — não substituem a balança.</p>
    </div>
  );
}

/** Miniaturas das fotos; tocar abre a foto com a análise. */
export function Miniaturas({ fotos }: { fotos: FotoDoDia[] }) {
  const [aberta, setAberta] = useState<FotoDoDia | null>(null);
  const [, iniciar] = useTransition();
  if (fotos.length === 0) return null;
  return (
    <>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {fotos.map((f) => (
          <button key={f.id} type="button" onClick={() => setAberta(f)} className="relative shrink-0" aria-label={`Foto das ${horaFalada(f.hora)}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/foto/${f.id}`} alt="" loading="lazy" className="h-16 w-16 rounded-[12px] object-cover" />
            {f.analise && (
              <span className="absolute bottom-0.5 left-0.5 rounded-full bg-black/60 px-1.5 text-[10.5px] text-white tabular">
                {milhar(f.analise.calorias)}
              </span>
            )}
          </button>
        ))}
      </div>
      {aberta && (
        <Folha aoFechar={() => setAberta(null)} titulo={`${aberta.nome || "Foto"} · ${horaFalada(aberta.hora)}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/foto/${aberta.id}`} alt="Foto do prato" className="max-h-[300px] w-full rounded-folha object-cover" />
          {aberta.analise ? <AnaliseDetalhada a={aberta.analise} /> : <p className="mt-3 text-grafite">Foto sem análise.</p>}
          <Botao
            tipo="perigo"
            className="mt-4 w-full"
            onClick={() =>
              confirm("Apagar esta foto?") &&
              iniciar(async () => {
                await apagarFoto(aberta.id);
                setAberta(null);
              })
            }
          >
            Apagar foto
          </Botao>
        </Folha>
      )}
    </>
  );
}

/** Uma folha que sobe de baixo, por cima de tudo. */
export function Folha({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={aoFechar}>
      <div
        role="dialog"
        aria-label={titulo}
        className="max-h-[88svh] w-full max-w-xl overflow-y-auto rounded-t-[24px] bg-cartao p-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[18px] font-semibold">{titulo}</p>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="h-8 w-8 rounded-full bg-papel text-grafite">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
