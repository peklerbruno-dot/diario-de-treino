"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gerarRascunho, salvarRascunho } from "../acoes";
import { BotaoDeVoz } from "@/componentes/voz";

/**
 * Onde a resposta nasce: você conta o que quer dizer (ou o que já combinou
 * fora do e-mail), a Central escreve, você ajusta e manda para o Gmail como
 * rascunho. Quem envia é você, de lá.
 */
export function PainelDeRascunho({
  id,
  ultimo,
  semEstilo,
  cobranca,
}: {
  id: string;
  ultimo: { texto: string; contexto: string } | null;
  semEstilo: boolean;
  /** A conversa espera resposta dos outros: o rascunho vira um lembrete. */
  cobranca?: { dias: number; automatica: boolean } | null;
}) {
  const pedidoDeCobranca = cobranca
    ? `Escreva um lembrete curto e gentil cobrando retorno da minha última mensagem, enviada há ${cobranca.dias} dias. Sem tom de reclamação.`
    : "";
  const [contexto, setContexto] = useState(ultimo?.contexto ?? pedidoDeCobranca);
  const [texto, setTexto] = useState(ultimo?.texto ?? "");
  const [estado, setEstado] = useState<"parado" | "escrevendo" | "salvando">("parado");
  const [aviso, setAviso] = useState<{ texto: string; link?: string; ruim?: boolean } | null>(
    ultimo ? { texto: "Último rascunho salvo no Gmail." } : null,
  );

  async function escrever(refazer: boolean) {
    setEstado("escrevendo");
    setAviso(null);
    const r = await gerarRascunho(id, contexto, refazer ? texto : undefined);
    setEstado("parado");
    if (r.ok) setTexto(r.texto);
    else setAviso({ texto: r.erro, ruim: true });
  }

  async function salvar() {
    setEstado("salvando");
    const r = await salvarRascunho(id, texto, contexto);
    setEstado("parado");
    setAviso(r.ok ? { texto: "Rascunho salvo no Gmail. Revise e envie de lá.", link: r.link } : { texto: r.erro, ruim: true });
  }

  // Veio do "Rascunhar cobrança" da lista: já escreve sozinho, uma vez.
  const jaGerou = useRef(false);
  useEffect(() => {
    if (cobranca?.automatica && !ultimo && !jaGerou.current) {
      jaGerou.current = true;
      escrever(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ocupado = estado !== "parado";
  return (
    <section className="cartao mt-5 p-4">
      <h2 className="mb-2 rotulo">{cobranca ? `Cobrar resposta · esperando há ${cobranca.dias} dias` : "Responder"}</h2>
      <textarea
        id="contexto"
        value={contexto}
        onChange={(e) => setContexto(e.target.value)}
        rows={2}
        aria-label="O que você quer dizer"
        placeholder="O que você quer dizer? (opcional — ex.: confirmar presença, mando o arquivo até sexta)"
        className="w-full rounded-lg border border-linha bg-superficie px-3 py-2 outline-none focus:border-destaque"
      />
      <div className="mt-3 flex items-center gap-4">
        <button
          onClick={() => escrever(false)}
          disabled={ocupado}
          className="rounded-full bg-destaque px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
        >
          {estado === "escrevendo" ? "Escrevendo…" : texto ? "Escrever de novo" : cobranca ? "Rascunhar lembrete" : "Rascunhar resposta"}
        </button>
        {texto && (
          <button onClick={() => escrever(true)} disabled={ocupado} className="text-[14px] text-fosco hover:text-tinta disabled:opacity-50">
            Refazer com o contexto
          </button>
        )}
        <BotaoDeVoz aoFalar={(t) => setContexto((c) => (c ? `${c} ${t}` : t))} />
      </div>

      {texto && (
        <>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={Math.min(18, Math.max(6, texto.split("\n").length + 1))}
            className="mt-3 w-full rounded-lg border border-linha bg-superficie px-3 py-2 text-[16px] leading-relaxed outline-none focus:border-destaque"
          />
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <button
              onClick={salvar}
              disabled={ocupado || !texto.trim()}
              className="rounded-full bg-destaque px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              {estado === "salvando" ? "Salvando…" : "Salvar como rascunho no Gmail"}
            </button>
            <button
              onClick={() => navigator.clipboard?.writeText(texto)}
              className="text-[14px] text-fosco hover:text-tinta"
            >
              Copiar
            </button>
          </div>
          {/\[[^\]]+\]/.test(texto) && (
            <p className="mt-2 text-[14px] text-fosco">Há trechos entre [colchetes] para você completar antes de enviar.</p>
          )}
        </>
      )}

      {aviso && (
        <p className={`mt-2 text-sm ${aviso.ruim ? "text-atencao" : "text-grafite"}`}>
          {aviso.texto}{" "}
          {aviso.link && (
            <a href={aviso.link} target="_blank" rel="noreferrer" className="underline">
              Abrir no Gmail
            </a>
          )}
        </p>
      )}
      {semEstilo && (
        <p className="mt-3 text-[13px] text-fosco">
          Dica: em <Link href="/ajustes" className="underline">Ajustes</Link>, “Aprender meu estilo” faz os rascunhos soarem mais como você.
        </p>
      )}
    </section>
  );
}
