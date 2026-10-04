"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { salvarPlanoNovo } from "@/app/acoes";
import { CamposDaRefeicao, type Rascunho } from "@/componentes/editor-de-refeicao";
import { reduzirImagem } from "@/componentes/reduzir";
import { Botao, Cartao, Titulo, campo } from "@/componentes/pecas";
import { litros } from "@/lib/ajustes";
import { escreverTexto } from "@/lib/conteudo";
import type { PlanoLido } from "@/lib/plano-lido";

/**
 * Plano novo: manda o material, o Gemini lê, você confere e salva.
 *
 * Nada entra direto: a leitura automática erra às vezes (uma quantidade mal
 * lida, uma substituição no item errado), e quem decide o que vale é você —
 * com o PDF da nutricionista do lado.
 */

const MAXIMO_DE_ARQUIVOS = 10;

type Lido = { nome: string; orientacoes: string; aguaMl: number | null; refeicoes: Rascunho[] };

const paraRascunho = (p: PlanoLido): Lido => ({
  nome: p.nome,
  orientacoes: p.orientacoes,
  aguaMl: p.aguaMl,
  refeicoes: p.refeicoes.map((r) => ({ nome: r.nome, horario: r.horario, texto: escreverTexto(r.conteudo), nota: r.nota, dias: r.dias })),
});

export function TelaNovoPlano({ temGemini }: { temGemini: boolean }) {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [texto, setTexto] = useState("");
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState("");
  const [lido, setLido] = useState<Lido | null>(null);
  const seletor = useRef<HTMLInputElement>(null);

  const ler = async () => {
    setErro("");
    setLendo(true);
    try {
      const dados = new FormData();
      for (const a of arquivos) {
        dados.append("arquivos", a.type.startsWith("image/") ? new File([await reduzirImagem(a)], `${a.name}.jpg`, { type: "image/jpeg" }) : a);
      }
      if (texto.trim()) dados.append("texto", texto);
      const r = await fetch("/api/ler", { method: "POST", body: dados });
      const j = (await r.json().catch(() => ({}))) as { plano?: PlanoLido; erro?: string };
      if (!r.ok || !j.plano) throw new Error(j.erro ?? (r.status === 413 ? "Arquivo grande demais (máximo 4 MB)." : "Não consegui ler o plano."));
      setLido(paraRascunho(j.plano));
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui ler o plano.");
    } finally {
      setLendo(false);
    }
  };

  if (lido) return <Conferencia lido={lido} aoMudar={setLido} aoVoltar={() => setLido(null)} />;

  return (
    <>
      <Titulo>Plano novo</Titulo>

      {!temGemini && (
        <Cartao className="mb-4 !bg-troca-clara">
          <p className="font-semibold">A leitura automática está desligada</p>
          <p className="mt-1 text-[15px] leading-snug text-grafite">
            Falta cadastrar a chave <code>GEMINI_API_KEY</code> na Vercel (é grátis; o passo a passo está no guia de
            instalação). Enquanto isso, dá para{" "}
            <Link href="/plano" className="underline">
              cadastrar as refeições à mão
            </Link>
            .
          </p>
        </Cartao>
      )}

      <Cartao>
        <p className="text-[18px] font-semibold">O plano da nutricionista</p>
        <p className="mt-1 text-[15px] leading-snug text-grafite">
          Mande o PDF ou fotos das páginas. O app lê as refeições, horários, quantidades e substituições, e você
          confere tudo antes de salvar.
        </p>

        <input
          ref={seletor}
          type="file"
          accept="application/pdf,image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const novos = Array.from(e.target.files ?? []);
            setArquivos((atuais) => [...atuais, ...novos].slice(0, MAXIMO_DE_ARQUIVOS));
            e.target.value = "";
          }}
        />
        <Botao tipo="primario" className="mt-4 w-full" onClick={() => seletor.current?.click()}>
          Escolher PDF ou fotos
        </Botao>

        {arquivos.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {arquivos.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-folha bg-papel px-3 py-2 text-[15px]">
                <span className="truncate">{a.type === "application/pdf" ? "📄" : "🖼️"} {a.name}</span>
                <button
                  type="button"
                  className="shrink-0 px-1 text-fosco"
                  aria-label={`Tirar ${a.name}`}
                  onClick={() => setArquivos((atuais) => atuais.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-[15px] text-grafite">Ou colar o plano em texto (ex.: veio pelo WhatsApp)</summary>
          <textarea
            className={`${campo} mt-2 min-h-[160px]`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={"Café da manhã — 7h\n2 fatias de pão integral\n2 ovos mexidos\n…"}
          />
        </details>

        {erro && <p className="mt-3 text-[15px] text-pulou">{erro}</p>}

        <Botao
          tipo="primario"
          className="mt-4 w-full"
          disabled={lendo || !temGemini || (arquivos.length === 0 && !texto.trim())}
          onClick={ler}
        >
          {lendo ? "Lendo o plano… (até um minuto)" : "Ler o plano"}
        </Botao>
      </Cartao>
    </>
  );
}

function Conferencia({ lido, aoMudar, aoVoltar }: { lido: Lido; aoMudar: (l: Lido) => void; aoVoltar: () => void }) {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  const mudarRefeicao = (i: number, r: Rascunho) => aoMudar({ ...lido, refeicoes: lido.refeicoes.map((x, j) => (j === i ? r : x)) });

  const salvar = () =>
    iniciar(async () => {
      const r = await salvarPlanoNovo(lido);
      if (r.erro) return setErro(r.erro);
      router.push("/");
    });

  return (
    <>
      <Titulo>Confira o plano</Titulo>
      <p className="-mt-2 mb-4 text-[15px] leading-snug text-grafite">
        Compare com o original e corrija o que precisar. Ao salvar, este passa a ser o plano em uso — o anterior fica
        guardado em Plano.
      </p>

      <Cartao className="space-y-3">
        <label className="block">
          <span className="text-[13px] text-fosco">Nome do plano</span>
          <input className={campo} value={lido.nome} onChange={(e) => aoMudar({ ...lido, nome: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-[13px] text-fosco">Orientações gerais</span>
          <textarea
            className={`${campo} min-h-[90px]`}
            value={lido.orientacoes}
            onChange={(e) => aoMudar({ ...lido, orientacoes: e.target.value })}
          />
        </label>
        {lido.aguaMl && (
          <p className="rounded-folha bg-agua-clara px-3 py-2 text-[14.5px]">
            💧 O plano pede {litros(lido.aguaMl)} de água por dia — essa vira a sua meta.
          </p>
        )}
      </Cartao>

      <div className="mt-4 space-y-3">
        {lido.refeicoes.map((r, i) => (
          <Cartao key={i}>
            <CamposDaRefeicao valor={r} aoMudar={(v) => mudarRefeicao(i, v)} />
            <Botao
              tipo="fantasma"
              className="mt-2 w-full text-[15px]"
              onClick={() => aoMudar({ ...lido, refeicoes: lido.refeicoes.filter((_, j) => j !== i) })}
            >
              Tirar esta refeição
            </Botao>
          </Cartao>
        ))}
        <Botao
          className="w-full !bg-cartao shadow-cartao"
          onClick={() => aoMudar({ ...lido, refeicoes: [...lido.refeicoes, { nome: "", horario: "12:00", texto: "", nota: "", dias: [] }] })}
        >
          + Refeição
        </Botao>
      </div>

      {erro && <p className="mt-4 text-[15px] text-pulou">{erro}</p>}

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom,0px)+96px)] mt-4 flex gap-2 rounded-cartao bg-papel/90 py-2 backdrop-blur">
        <Botao tipo="primario" className="flex-1" disabled={pendente} onClick={salvar}>
          {pendente ? "Salvando…" : `Salvar plano (${lido.refeicoes.length} refeições)`}
        </Botao>
        <Botao onClick={aoVoltar}>Voltar</Botao>
      </div>
    </>
  );
}
