"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { salvarFicha } from "@/app/acoes";
import type { Opcao } from "@/lib/conteudo";
import type { Atalhos, FotoDoDia, Marca, RefeicaoCompleta } from "@/lib/consultas";
import { horaFalada } from "@/lib/datas";
import { milhar } from "@/lib/analise";
import { FOMES, HUMORES, MOTIVOS, type Fome, type Humor } from "@/lib/padroes";
import type { RefeicaoPadrao } from "@/lib/refeicoes-padrao";
import { LinkNovaRefeicao } from "./minhas-refeicoes";
import { Folha, Miniaturas } from "./foto-do-prato";
import { Botao, campo } from "./pecas";
import { reduzirImagem } from "./reduzir";

/**
 * A ficha de uma refeição: tudo o que se registra dela num lugar só.
 *
 *  1. Como foi — Segui, Troquei ou Pulei (já vem com o botão que abriu a ficha).
 *  2. O que comi — em "Segui", a opção do plano já vem escrita; em "Troquei",
 *     um campo livre. Nos dois, as minhas refeições (as padrão, ⭐) e o que
 *     comeu nos últimos dias (↺) ficam a um toque — escolher uma padrão já
 *     acerta o Segui/Troquei e traz as calorias cadastradas. Em "Pulei", o
 *     motivo.
 *  3. Foto — opcional; com foto, o Gemini estima as calorias.
 *  4. Fome antes e como ficou depois — um emoji cada.
 *  5. Observação.
 */

export type Estado = Marca["estado"];

export const ESTADOS: Record<Estado, { rotulo: string; simbolo: string; cheio: string; claro: string }> = {
  seguiu: { rotulo: "Segui", simbolo: "✓", cheio: "bg-folha text-sobre-cor", claro: "bg-folha-clara text-folha" },
  trocou: { rotulo: "Troquei", simbolo: "⇄", cheio: "bg-troca text-sobre-cor", claro: "bg-troca-clara text-troca" },
  pulou: { rotulo: "Pulei", simbolo: "✕", cheio: "bg-pulou text-sobre-cor", claro: "bg-pulou-clara text-pulou" },
};

/** "Opção 2: Iogurte natural · Granola 2 col." — o texto de uma opção do plano. */
export function textoDaOpcao(opcoes: Opcao[], i: number): string {
  const o = opcoes[i];
  if (!o) return "";
  const itens = o.itens.map((x) => x.texto).join(", ");
  return opcoes.length > 1 ? `${o.titulo || `Opção ${i + 1}`}: ${itens}` : itens;
}

const horaAgora = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

type Props = {
  dia: string;
  hoje: string;
  refeicao: RefeicaoCompleta;
  marca?: Marca;
  estadoInicial: Estado;
  atalhos?: Atalhos;
  /** As minhas refeições que cabem nesta: as dela primeiro, depois as gerais. */
  padroes: RefeicaoPadrao[];
  fotos: FotoDoDia[];
  aoFechar: () => void;
};

export function FichaDaRefeicao({ dia, hoje, refeicao: r, marca, estadoInicial, atalhos, padroes, fotos, aoFechar }: Props) {
  const router = useRouter();
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  const textoDoPlano = textoDaOpcao(r.conteudo, 0);
  const notaInicial = marca ? marca.nota : estadoInicial === "seguiu" ? textoDoPlano : "";
  const [estado, setEstado] = useState<Estado>(estadoInicial);
  const [nota, setNota] = useState(notaInicial);
  // A nota foi escrita pelo app (opção do plano, atalho)? Então trocar o
  // estado pode trocá-la; o que você digitou, nunca.
  const [automatica, setAutomatica] = useState(!marca);
  const [fome, setFome] = useState<string>(marca?.fome ?? "");
  const [humor, setHumor] = useState<string>(marca?.humor ?? "");
  const [obs, setObs] = useState(marca?.obs ?? "");
  const [novas, setNovas] = useState<{ arquivo: File; previa: string }[]>([]);
  const [padraoId, setPadraoId] = useState(marca?.padraoId ?? "");
  const [comoPadrao, setComoPadrao] = useState(false);
  const [salvando, setSalvando] = useState("");
  const [erro, setErro] = useState("");

  const recentes = atalhos?.recentes ?? [];
  const jaEhPadrao = padroes.some((p) => p.titulo.trim().toLowerCase() === nota.trim().toLowerCase());

  const mudarEstado = (e: Estado) => {
    setEstado(e);
    if (!automatica && nota) return;
    if (e === "seguiu") setNota(textoDoPlano);
    else setNota("");
    setAutomatica(true);
  };

  const escolher = (texto: string) => {
    setNota(texto);
    setPadraoId("");
    setAutomatica(true);
  };

  /** Uma das minhas refeições: o nome vira o "o que comi", e o estado segue ela. */
  const escolherPadrao = (p: RefeicaoPadrao) => {
    if (padraoId === p.id) {
      setPadraoId("");
      return;
    }
    setPadraoId(p.id);
    setNota(p.titulo);
    setAutomatica(true);
    setEstado(p.seguePlano ? "seguiu" : "trocou");
  };

  const adicionarFotos = (lista: FileList | null) => {
    if (!lista) return;
    // Copiar já: limpar o campo (para dar para escolher a mesma foto de novo)
    // esvazia esta mesma lista.
    const escolhidas = Array.from(lista).map((arquivo) => ({ arquivo, previa: URL.createObjectURL(arquivo) }));
    setNovas((n) => [...n, ...escolhidas]);
  };

  const salvar = async () => {
    setErro("");
    setSalvando("Salvando…");
    try {
      const resposta = await salvarFicha({ dia, refeicaoId: r.id, estado, nota, fome, humor, obs, padraoId, guardar: comoPadrao, comFoto: novas.length > 0 || fotos.some((x) => x.temImagem) });
      if (resposta.erro) throw new Error(resposta.erro);
      for (let i = 0; i < novas.length; i++) {
        setSalvando(novas.length > 1 ? `Analisando a foto ${i + 1} de ${novas.length}…` : "Analisando a foto…");
        const dados = new FormData();
        dados.append("imagem", new File([await reduzirImagem(novas[i].arquivo, 1280, 0.8)], "prato.jpg", { type: "image/jpeg" }));
        dados.append("refeicaoId", r.id);
        dados.append("dia", dia);
        dados.append("hora", dia === hoje ? horaAgora() : r.horario);
        // O que foi escrito ajuda a leitura: "peito de peru", e não "presunto".
        if (nota.trim() && estado !== "pulou") dados.append("texto", nota.trim());
        const resposta = await fetch("/api/foto", { method: "POST", body: dados });
        if (!resposta.ok) throw new Error((await resposta.json().catch(() => ({}))).erro ?? "A ficha foi salva, mas a foto não foi.");
      }
      router.refresh();
      aoFechar();
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : "Não consegui salvar. Tente de novo.");
    } finally {
      setSalvando("");
    }
  };

  const chip = (ativo: boolean) =>
    `rounded-full px-3 py-1.5 text-left text-[14px] leading-snug ${ativo ? "bg-folha-clara font-medium text-folha ring-1 ring-folha" : "bg-papel text-grafite"}`;

  return (
    <Folha titulo={`${r.nome} · ${horaFalada(r.horario)}`} aoFechar={aoFechar}>
      <div className="space-y-4">
        {/* 1. Como foi */}
        <div className="grid grid-cols-3 gap-1.5 rounded-folha bg-papel p-1" role="radiogroup" aria-label="Como foi">
          {(Object.keys(ESTADOS) as Estado[]).map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={estado === e}
              onClick={() => mudarEstado(e)}
              className={`rounded-[12px] py-2.5 text-[15px] font-semibold transition-colors ${estado === e ? ESTADOS[e].cheio : "text-grafite"}`}
            >
              {ESTADOS[e].simbolo} {ESTADOS[e].rotulo}
            </button>
          ))}
        </div>

        {/* 2. O que comi / o motivo */}
        {estado === "pulou" ? (
          <section>
            <p className="sobrescrito mb-1.5">Por quê? (opcional)</p>
            <div className="flex flex-wrap gap-1.5">
              {MOTIVOS.map((m) => (
                <button key={m} type="button" className={chip(nota === m)} onClick={() => setNota(nota === m ? "" : m)}>
                  {m}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section>
            <label htmlFor={`comi-${r.id}`} className="sobrescrito mb-1.5 block">
              {estado === "seguiu" ? "O que comi do plano" : "O que comi no lugar"}
            </label>
            {(r.conteudo.length > 1 && estado === "seguiu") || padroes.length > 0 || recentes.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {estado === "seguiu" &&
                  r.conteudo.length > 1 &&
                  r.conteudo.map((o, i) => {
                    const t = textoDaOpcao(r.conteudo, i);
                    return (
                      <button key={`o${i}`} type="button" className={chip(nota === t)} onClick={() => escolher(t)}>
                        📋 {o.titulo || `Opção ${i + 1}`}
                      </button>
                    );
                  })}
                {padroes.map((p) => (
                  <button key={p.id} type="button" className={chip(padraoId === p.id)} onClick={() => escolherPadrao(p)} aria-pressed={padraoId === p.id}>
                    ⭐ {p.titulo}
                    {p.calorias !== null && <span className="ml-1 text-[12.5px] opacity-75">≈{milhar(p.calorias)}</span>}
                  </button>
                ))}
                {recentes.map((t) => (
                  <button key={t} type="button" className={chip(nota === t)} onClick={() => escolher(t)} title="Comi recentemente">
                    ↺ {t.length > 48 ? `${t.slice(0, 46)}…` : t}
                  </button>
                ))}
              </div>
            ) : null}
            <textarea
              id={`comi-${r.id}`}
              className={`${campo} min-h-[72px] text-[15.5px]`}
              value={nota}
              onChange={(e) => {
                setNota(e.target.value);
                setAutomatica(false);
                // Mudou o texto: deixa de ser aquela refeição padrão (e as calorias dela).
                setPadraoId("");
              }}
              placeholder={estado === "seguiu" ? "Ex.: Opção 1, sem o pão" : "Ex.: 2 hambúrgueres de frango com queijo"}
            />
            {nota.trim() && !jaEhPadrao && (
              <label className="mt-1.5 flex items-center gap-2 text-[14px] text-grafite">
                <input type="checkbox" checked={comoPadrao} onChange={(e) => setComoPadrao(e.target.checked)} className="h-4 w-4 accent-[var(--folha)]" />
                Guardar nas minhas refeições
              </label>
            )}
            <LinkNovaRefeicao refeicao={r.nome} className="mt-1.5 inline-block text-[13.5px] text-folha" />
          </section>
        )}

        {/* 3. Foto */}
        {estado !== "pulou" && (
          <section>
            <p className="sobrescrito mb-1.5">Foto (opcional)</p>
            {fotos.length > 0 && (
              <div className="-mt-2 mb-2">
                <Miniaturas fotos={fotos} />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {novas.map((n, i) => (
                <div key={n.previa} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={n.previa} alt="" className="h-16 w-16 rounded-[12px] object-cover" />
                  <button
                    type="button"
                    aria-label="Tirar esta foto"
                    onClick={() => setNovas((l) => l.filter((_, j) => j !== i))}
                    className="absolute -right-1.5 -top-1.5 h-6 w-6 rounded-full bg-tinta text-[12px] text-cartao"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => camera.current?.click()} className="flex h-16 w-16 flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-regua text-[12px] text-grafite">
                <span className="text-[20px]">📷</span>Câmera
              </button>
              <button type="button" onClick={() => galeria.current?.click()} className="flex h-16 w-16 flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-regua text-[12px] text-grafite">
                <span className="text-[20px]">🖼️</span>Galeria
              </button>
            </div>
            <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (adicionarFotos(e.target.files), (e.target.value = ""))} />
            <input ref={galeria} type="file" accept="image/*" multiple hidden onChange={(e) => (adicionarFotos(e.target.files), (e.target.value = ""))} />
          </section>
        )}

        {/* 4. Fome e como ficou */}
        {estado !== "pulou" && (
          <section className="grid grid-cols-2 gap-3">
            <Escala titulo="Fome antes" opcoes={FOMES} valor={fome} mudar={setFome} />
            <Escala titulo="Como fiquei" opcoes={HUMORES} valor={humor} mudar={setHumor} />
          </section>
        )}

        {/* 5. Observação */}
        <section>
          <label htmlFor={`obs-${r.id}`} className="sobrescrito mb-1.5 block">
            Observação (opcional)
          </label>
          <input
            id={`obs-${r.id}`}
            className={campo}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder={estado === "pulou" ? "Ex.: reunião até as 14h" : "Ex.: comi na rua, com pressa"}
          />
        </section>

        <Botao tipo="primario" className={`w-full !py-3 ${ESTADOS[estado].cheio}`} disabled={Boolean(salvando)} onClick={salvar}>
          {salvando || `Salvar · ${ESTADOS[estado].rotulo}`}
        </Botao>
        {erro && <p className="text-[14px] text-pulou">{erro}</p>}
      </div>
    </Folha>
  );
}

function Escala<K extends string>({
  titulo,
  opcoes,
  valor,
  mudar,
}: {
  titulo: string;
  opcoes: Record<K, { emoji: string; rotulo: string }>;
  valor: string;
  mudar: (v: string) => void;
}) {
  const escolhida = (Object.keys(opcoes) as K[]).find((k) => k === valor);
  return (
    <div>
      <p className="sobrescrito mb-1.5">{titulo}</p>
      <div className="flex gap-1.5">
        {(Object.keys(opcoes) as K[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={valor === k}
            aria-label={opcoes[k].rotulo}
            title={opcoes[k].rotulo}
            onClick={() => mudar(valor === k ? "" : k)}
            className={`h-10 w-10 rounded-full text-[20px] transition ${valor === k ? "bg-folha-clara ring-2 ring-folha" : valor ? "bg-papel opacity-45" : "bg-papel"}`}
          >
            {opcoes[k].emoji}
          </button>
        ))}
      </div>
      <p className="mt-1 h-4 text-[12px] text-fosco">{escolhida ? opcoes[escolhida].rotulo : ""}</p>
    </div>
  );
}

export type { Fome, Humor };
