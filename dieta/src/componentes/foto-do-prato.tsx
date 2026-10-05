"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { apagarFoto, editarAnalise, marcarRefeicao } from "@/app/acoes";
import { milhar, sugestaoDeMarca, type Analise } from "@/lib/analise";
import type { FotoDoDia } from "@/lib/consultas";
import { diaPorExtenso, horaFalada, somarDias } from "@/lib/datas";
import { Botao, campo } from "./pecas";
import { reduzirImagem } from "./reduzir";

/**
 * Foto do prato: escolher o dia e a refeição, tirar a foto ou pegar uma da
 * galeria, e ver o que o Gemini achou.
 *
 * São dois seletores de arquivo, e não um: com `capture` o iPhone abre a
 * câmera direto e esconde a galeria; sem ele, abre a galeria (com a câmera
 * como opção a mais). A galeria é para a foto tirada no restaurante e
 * lembrada depois — por isso dá para escolher "ontem" e "anteontem".
 */

type RefeicaoCurta = { id: string; nome: string; horario: string };
type Resultado = {
  id: string;
  semCota: boolean;
  dia: string;
  analise: Analise | null;
  sugestao: "seguiu" | "trocou" | null;
  refeicao: RefeicaoCurta | null;
  /** A foto, ou null quando foi anotação em texto. */
  previa: string | null;
  texto: string;
};

const VEREDITO = {
  sim: { rotulo: "Dentro do plano", cor: "bg-folha-clara text-folha" },
  parcial: { rotulo: "Parcialmente no plano", cor: "bg-troca-clara text-troca" },
  nao: { rotulo: "Fora do plano", cor: "bg-pulou-clara text-pulou" },
  "sem-plano": { rotulo: "Fora das refeições do plano", cor: "bg-papel text-grafite" },
} as const;

const DIAS = [
  { rotulo: "Hoje", atras: 0 },
  { rotulo: "Ontem", atras: 1 },
  { rotulo: "Anteontem", atras: 2 },
];

/** "12:40" no relógio do aparelho — a hora da foto quando ela é de agora. */
const horaAgora = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function BotaoDeFoto({ dia, refeicoes, sugerida }: { dia: string; refeicoes: RefeicaoCurta[]; sugerida?: string }) {
  const router = useRouter();
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const [escolhendo, setEscolhendo] = useState(false);
  const [atras, setAtras] = useState(0);
  const [refeicaoId, setRefeicaoId] = useState<string | null>(sugerida ?? null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [escrevendo, setEscrevendo] = useState(false);
  const [texto, setTexto] = useState("");

  const refeicao = refeicoes.find((r) => r.id === refeicaoId) ?? null;
  const diaDaFoto = somarDias(dia, -atras);

  const abrir = (origem: "camera" | "galeria") => {
    setEscolhendo(false);
    (origem === "camera" ? camera : galeria).current?.click();
  };

  /** Manda a foto ou, sem foto, o texto do que se comeu. */
  const enviar = async (arquivo: File | null, escrito = "") => {
    setErro("");
    setEnviando(true);
    try {
      const reduzida = arquivo ? await reduzirImagem(arquivo, 1280, 0.8) : null;
      const dados = new FormData();
      if (reduzida) dados.append("imagem", new File([reduzida], "prato.jpg", { type: "image/jpeg" }));
      else dados.append("texto", escrito);
      if (refeicao) dados.append("refeicaoId", refeicao.id);
      dados.append("dia", diaDaFoto);
      // Foto de outro dia: vale o horário da refeição, que é o que se sabe dela.
      dados.append("hora", atras > 0 && refeicao ? refeicao.horario : horaAgora());
      const r = await fetch("/api/foto", { method: "POST", body: dados });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.erro ?? "Não consegui salvar.");
      setResultado({
        id: j.id,
        semCota: Boolean(j.semCota),
        dia: j.dia ?? diaDaFoto,
        analise: j.analise,
        sugestao: j.sugestao,
        refeicao,
        previa: reduzida ? URL.createObjectURL(reduzida) : null,
        texto: escrito,
      });
      setTexto("");
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui salvar.");
    } finally {
      setEnviando(false);
    }
  };

  const aoEscolher = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) enviar(f);
  };

  return (
    <div>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={aoEscolher} />
      <input ref={galeria} type="file" accept="image/*" className="hidden" onChange={aoEscolher} />
      <Botao tipo="primario" className="w-full whitespace-nowrap" disabled={enviando} onClick={() => setEscolhendo(true)}>
        {enviando ? "Analisando…" : "📷 O que comi"}
      </Botao>
      {erro && <p className="mt-2 text-[14px] text-pulou">{erro}</p>}

      {escolhendo && (
        <Folha aoFechar={() => setEscolhendo(false)} titulo="O que você comeu">
          <p className="sobrescrito mb-1.5">Quando</p>
          <div className="mb-4 grid grid-cols-3 gap-1.5">
            {DIAS.map((d) => (
              <button
                key={d.atras}
                type="button"
                aria-pressed={atras === d.atras}
                onClick={() => setAtras(d.atras)}
                className={`rounded-folha py-2 text-[15px] ${atras === d.atras ? "bg-folha-clara font-semibold text-folha" : "bg-papel text-grafite"}`}
              >
                {d.rotulo}
              </button>
            ))}
          </div>

          <p className="sobrescrito mb-1.5">Qual refeição</p>
          <ul className="space-y-1.5">
            {refeicoes.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  aria-pressed={r.id === refeicaoId}
                  onClick={() => setRefeicaoId(r.id)}
                  className={`flex w-full items-center justify-between rounded-folha px-4 py-3 text-left ${r.id === refeicaoId ? "bg-folha-clara font-semibold text-folha" : "bg-papel"}`}
                >
                  <span>{r.nome}</span>
                  <span className="tabular text-[14px] text-fosco">{horaFalada(r.horario)}</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                aria-pressed={refeicaoId === null}
                onClick={() => setRefeicaoId(null)}
                className={`w-full rounded-folha px-4 py-3 text-left ${refeicaoId === null ? "bg-folha-clara font-semibold text-folha" : "bg-papel text-grafite"}`}
              >
                Outra coisa (fora do plano)
              </button>
            </li>
          </ul>

          {escrevendo ? (
            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!texto.trim()) return;
                setEscolhendo(false);
                setEscrevendo(false);
                enviar(null, texto.trim());
              }}
            >
              <label htmlFor="o-que-comi" className="sobrescrito mb-1.5 block">
                O que você comeu
              </label>
              <textarea
                id="o-que-comi"
                className={`${campo} min-h-[88px]`}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Ex.: 2 hambúrgueres de frango com queijo, sem batata, e uma coca zero"
                autoFocus
              />
              <p className="mt-1 text-[13px] text-fosco">Quanto mais detalhe (quantidade, preparo), melhor a estimativa.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Botao type="submit" tipo="primario" disabled={!texto.trim()}>
                  Salvar
                </Botao>
                <Botao onClick={() => setEscrevendo(false)}>Voltar</Botao>
              </div>
            </form>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Botao tipo="primario" onClick={() => abrir("camera")}>
                  📷 Tirar foto
                </Botao>
                <Botao onClick={() => abrir("galeria")}>🖼️ Da galeria</Botao>
              </div>
              <Botao className="mt-2 w-full" onClick={() => setEscrevendo(true)}>
                ✏️ Sem foto: escrever o que comi
              </Botao>
            </>
          )}
        </Folha>
      )}

      {resultado && <ResultadoDaFoto dia={resultado.dia} r={resultado} aoFechar={() => setResultado(null)} />}
    </div>
  );
}

function ResultadoDaFoto({ dia, r, aoFechar }: { dia: string; r: Resultado; aoFechar: () => void }) {
  const [, iniciar] = useTransition();
  const [a, setA] = useState(r.analise);
  const sugestao = a === r.analise ? r.sugestao : sugestaoDeMarca(a);
  const marcar = (estado: "seguiu" | "trocou") =>
    iniciar(async () => {
      if (r.refeicao) await marcarRefeicao(dia, r.refeicao.id, estado, estado === "trocou" ? (a?.descricao ?? r.texto) : "");
      aoFechar();
    });

  return (
    <Folha aoFechar={aoFechar} titulo={r.refeicao ? r.refeicao.nome : r.previa ? "Foto salva" : "Anotação salva"}>
      {r.previa ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.previa} alt="Foto do prato" className="max-h-[260px] w-full rounded-folha object-cover" />
      ) : (
        <p className="rounded-folha bg-papel px-3.5 py-3 text-[15.5px] leading-snug">📝 {r.texto}</p>
      )}
      {!a && (
        <p className="mt-3 text-[15px] text-grafite">
          {r.semCota
            ? "Salvo. A cota gratuita do Gemini acabou por agora — toque em “Analisar agora” mais tarde, ou preencha à mão."
            : "Salvo, mas não deu para analisar agora. Tente “Analisar agora” mais tarde, ou preencha à mão."}
        </p>
      )}
      <AnaliseEditavel id={r.id} analise={a} aoMudar={setA} />
      {r.refeicao && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Botao tipo={sugestao === "seguiu" ? "primario" : "secundario"} onClick={() => marcar("seguiu")}>
            ✓ Segui
          </Botao>
          <Botao tipo={sugestao === "trocou" ? "primario" : "secundario"} className={sugestao === "trocou" ? "!bg-troca" : ""} onClick={() => marcar("trocou")}>
            ⇄ Troquei
          </Botao>
        </div>
      )}
      <Botao tipo="fantasma" className="mt-2 w-full" onClick={aoFechar}>
        {r.refeicao ? "Só salvar" : "Fechar"}
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
      <p className="mt-1.5 text-[12px] text-fosco">Estimativas — não substituem a balança.</p>
    </div>
  );
}

/**
 * As fotos; tocar abre a foto com a análise. Pequenas numa fileira (no cartão
 * da refeição) ou `grande`, em grade (no dia e na galeria). Com `comDia`, a
 * folha da foto leva ao dia dela.
 */
export function Miniaturas({ fotos, grande = false, comDia = false }: { fotos: FotoDoDia[]; grande?: boolean; comDia?: boolean }) {
  const [aberta, setAberta] = useState<FotoDoDia | null>(null);
  const [, iniciar] = useTransition();
  if (fotos.length === 0) return null;
  return (
    <>
      <div className={grande ? "grid grid-cols-3 gap-1.5" : "mt-3 flex gap-2 overflow-x-auto"}>
        {fotos.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setAberta(f)}
            className={`relative ${grande ? "aspect-square w-full" : "shrink-0"}`}
            aria-label={`${f.temImagem ? "Foto" : "Anotação"} ${f.nome ? `do ${f.nome.toLowerCase()} ` : ""}das ${horaFalada(f.hora)}`}
          >
            {f.temImagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/foto/${f.id}`}
                alt=""
                loading="lazy"
                className={grande ? "h-full w-full rounded-[10px] object-cover" : "h-16 w-16 rounded-[12px] object-cover"}
              />
            ) : (
              <span
                className={`flex flex-col items-center justify-center gap-0.5 overflow-hidden bg-papel p-1.5 text-center leading-tight text-grafite ${
                  grande ? "h-full w-full rounded-[10px] text-[12px]" : "h-16 w-16 rounded-[12px] text-[10.5px]"
                }`}
              >
                <span className="text-[18px]">📝</span>
                {grande && <span className="line-clamp-2">{f.texto}</span>}
              </span>
            )}
            {f.analise && (
              <span className="absolute bottom-0.5 left-0.5 rounded-full bg-black/60 px-1.5 text-[10.5px] text-white tabular">
                {milhar(f.analise.calorias)}
              </span>
            )}
            {grande && f.nome && (
              <span className="absolute right-0.5 top-0.5 max-w-[90%] truncate rounded-full bg-black/60 px-1.5 text-[10.5px] text-white">
                {f.nome}
              </span>
            )}
          </button>
        ))}
      </div>
      {aberta && (
        <Folha aoFechar={() => setAberta(null)} titulo={`${aberta.nome || "Foto"} · ${horaFalada(aberta.hora)}`}>
          {aberta.temImagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/foto/${aberta.id}`} alt="Foto do prato" className="max-h-[300px] w-full rounded-folha object-cover" />
          ) : (
            <p className="rounded-folha bg-papel px-3.5 py-3 text-[15.5px] leading-snug">📝 {aberta.texto}</p>
          )}
          {comDia && (
            <Link href={`/historico/dia/${aberta.dia}`} className="mt-2 block text-[15px] font-medium text-folha">
              Ver o dia: {diaPorExtenso(aberta.dia)} →
            </Link>
          )}
          <AnaliseEditavel id={aberta.id} analise={aberta.analise} aoMudar={(a) => setAberta({ ...aberta, analise: a })} />
          <Botao
            tipo="perigo"
            className="mt-4 w-full"
            onClick={() =>
              confirm(aberta.temImagem ? "Apagar esta foto?" : "Apagar esta anotação?") &&
              iniciar(async () => {
                await apagarFoto(aberta.id);
                setAberta(null);
              })
            }
          >
            {aberta.temImagem ? "Apagar foto" : "Apagar anotação"}
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

type Modo = "ver" | "corrigir" | "mao";

/**
 * A análise de uma foto (ou anotação), com como consertar quando o Gemini
 * erra: "Corrigir" manda uma frase ("era peito de peru, não presunto", "foram
 * 2 hambúrgueres") e ele refaz a conta; "Editar à mão" muda os itens e os
 * números direto — o caminho quando a cota acabou. Sem análise ainda, oferece
 * "Analisar agora".
 */
export function AnaliseEditavel({ id, analise, aoMudar }: { id: string; analise: Analise | null; aoMudar: (a: Analise) => void }) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("ver");
  const [correcao, setCorrecao] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  const pedir = async (corpo?: { correcao: string }) => {
    setErro("");
    setOcupado(true);
    try {
      const r = await fetch(`/api/foto/${id}`, {
        method: "POST",
        headers: corpo ? { "Content-Type": "application/json" } : undefined,
        body: corpo ? JSON.stringify(corpo) : undefined,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.erro ?? "Não consegui analisar agora.");
      aoMudar(j.analise);
      setModo("ver");
      setCorrecao("");
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui analisar agora.");
    } finally {
      setOcupado(false);
    }
  };

  if (modo === "mao") {
    return (
      <EdicaoAMao
        id={id}
        analise={analise}
        aoSalvar={(a) => {
          aoMudar(a);
          setModo("ver");
          router.refresh();
        }}
        aoCancelar={() => setModo("ver")}
      />
    );
  }

  return (
    <div>
      {analise ? (
        <AnaliseDetalhada a={analise} />
      ) : (
        <p className="mt-3 text-[15px] text-grafite">Ainda sem análise.</p>
      )}

      {modo === "corrigir" ? (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (correcao.trim()) pedir({ correcao });
          }}
        >
          <label htmlFor={`corrigir-${id}`} className="text-[14px] text-grafite">
            O que está errado?
          </label>
          <textarea
            id={`corrigir-${id}`}
            className={`${campo} mt-1 min-h-[76px]`}
            value={correcao}
            onChange={(e) => setCorrecao(e.target.value)}
            placeholder="Ex.: era peito de peru, não presunto · foram 2 hambúrgueres · sem o arroz"
            autoFocus
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Botao type="submit" tipo="primario" disabled={ocupado || !correcao.trim()}>
              {ocupado ? "Refazendo…" : "Refazer a conta"}
            </Botao>
            <Botao onClick={() => setModo("ver")}>Cancelar</Botao>
          </div>
          <button type="button" className="mt-2 w-full py-1 text-[14px] font-medium text-folha" onClick={() => setModo("mao")}>
            Prefiro editar à mão
          </button>
        </form>
      ) : analise ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Botao onClick={() => setModo("corrigir")}>✏️ Corrigir</Botao>
          <Botao onClick={() => setModo("mao")}>Editar à mão</Botao>
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Botao tipo="primario" disabled={ocupado} onClick={() => pedir()}>
            {ocupado ? "Analisando…" : "Analisar agora"}
          </Botao>
          <Botao onClick={() => setModo("mao")}>Preencher à mão</Botao>
        </div>
      )}
      {erro && (
        <p className="mt-2 text-[14px] text-pulou">
          {erro} {modo === "corrigir" && "Dá para editar à mão enquanto isso."}
        </p>
      )}
    </div>
  );
}

const numero = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
};

/** Os itens e os números da análise, editáveis. */
function EdicaoAMao({ id, analise, aoSalvar, aoCancelar }: { id: string; analise: Analise | null; aoSalvar: (a: Analise) => void; aoCancelar: () => void }) {
  const [itens, setItens] = useState(analise?.itens.length ? analise.itens : [{ alimento: "", quantidade: "" }]);
  const [nums, setNums] = useState({
    calorias: String(analise?.calorias ?? ""),
    proteinas: String(analise?.proteinas ?? ""),
    carboidratos: String(analise?.carboidratos ?? ""),
    gorduras: String(analise?.gorduras ?? ""),
  });
  const [veredito, setVeredito] = useState<Analise["noPlano"]>(analise?.noPlano ?? "sim");
  const [salvando, setSalvando] = useState(false);

  const mudarItem = (k: number, campo: "alimento" | "quantidade", v: string) => setItens((l) => l.map((it, j) => (j === k ? { ...it, [campo]: v } : it)));

  const salvar = async () => {
    setSalvando(true);
    const limpos = itens.map((i) => ({ alimento: i.alimento.trim(), quantidade: i.quantidade.trim() })).filter((i) => i.alimento);
    // A descrição antiga dizia "presunto"; com os itens trocados, ela passa a ser a lista nova.
    const nova: Partial<Analise> = {
      itens: limpos,
      descricao: limpos.length ? `${limpos.map((i) => i.alimento).join(", ")}.` : (analise?.descricao ?? ""),
      calorias: numero(nums.calorias),
      proteinas: numero(nums.proteinas),
      carboidratos: numero(nums.carboidratos),
      gorduras: numero(nums.gorduras),
      noPlano: veredito,
    };
    await editarAnalise(id, nova);
    setSalvando(false);
    aoSalvar({ descricao: "", comentario: "", noPlano: "sem-plano", ...analise, ...nova } as Analise);
  };

  const pequeno = "w-full rounded-[10px] border border-regua bg-cartao px-2.5 py-2 text-[15px] outline-none focus:border-folha";
  return (
    <div className="mt-3">
      <p className="sobrescrito mb-1.5">O que tinha no prato</p>
      <ul className="space-y-1.5">
        {itens.map((it, k) => (
          <li key={k} className="flex gap-1.5">
            <input className={`${pequeno} flex-[3]`} value={it.alimento} onChange={(e) => mudarItem(k, "alimento", e.target.value)} placeholder="Alimento" aria-label="Alimento" />
            <input className={`${pequeno} flex-[2]`} value={it.quantidade} onChange={(e) => mudarItem(k, "quantidade", e.target.value)} placeholder="Quanto" aria-label="Quantidade" />
            <button type="button" aria-label="Tirar item" className="w-8 shrink-0 text-fosco" onClick={() => setItens((l) => l.filter((_, j) => j !== k))}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="mt-1.5 py-1 text-[14px] font-medium text-folha" onClick={() => setItens((l) => [...l, { alimento: "", quantidade: "" }])}>
        + Item
      </button>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {(
          [
            ["calorias", "kcal"],
            ["proteinas", "prot. (g)"],
            ["carboidratos", "carb. (g)"],
            ["gorduras", "gord. (g)"],
          ] as const
        ).map(([chave, rotulo]) => (
          <label key={chave} className="text-center text-[12px] text-fosco">
            <input
              className={`${pequeno} text-center tabular`}
              inputMode="numeric"
              value={nums[chave]}
              onChange={(e) => setNums((n) => ({ ...n, [chave]: e.target.value }))}
            />
            {rotulo}
          </label>
        ))}
      </div>

      <p className="sobrescrito mb-1.5 mt-3">Seguiu o plano?</p>
      <div className="grid grid-cols-4 gap-1.5">
        {(
          [
            ["sim", "Sim"],
            ["parcial", "Em parte"],
            ["nao", "Não"],
            ["sem-plano", "Fora"],
          ] as const
        ).map(([v, rotulo]) => (
          <button
            key={v}
            type="button"
            aria-pressed={veredito === v}
            onClick={() => setVeredito(v)}
            className={`rounded-[10px] py-2 text-[14px] ${veredito === v ? "bg-folha-clara font-semibold text-folha" : "bg-papel text-grafite"}`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Botao tipo="primario" disabled={salvando} onClick={salvar}>
          {salvando ? "Salvando…" : "Salvar"}
        </Botao>
        <Botao onClick={aoCancelar}>Cancelar</Botao>
      </div>
    </div>
  );
}
