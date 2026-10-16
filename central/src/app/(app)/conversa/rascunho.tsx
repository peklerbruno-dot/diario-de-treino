"use client";

import Link from "next/link";
import { useState } from "react";
import { gerarRascunho, salvarRascunho } from "../acoes";

/**
 * Onde a resposta nasce: você conta o que quer dizer (ou o que já combinou
 * fora do e-mail), a Central escreve, você ajusta e manda para o Gmail como
 * rascunho. Quem envia é você, de lá.
 */
export function PainelDeRascunho({
  id,
  ultimo,
  semEstilo,
}: {
  id: string;
  ultimo: { texto: string; contexto: string } | null;
  semEstilo: boolean;
}) {
  const [contexto, setContexto] = useState(ultimo?.contexto ?? "");
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

  const ocupado = estado !== "parado";
  return (
    <section className="mt-10">
      <h2 className="mb-2 text-[13px] font-semibold text-fosco">Responder</h2>
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
          className="rounded-lg bg-tinta px-3.5 py-1.5 text-[14px] font-medium text-fundo disabled:opacity-50"
        >
          {estado === "escrevendo" ? "Escrevendo…" : texto ? "Escrever de novo" : "Rascunhar resposta"}
        </button>
        {texto && (
          <button onClick={() => escrever(true)} disabled={ocupado} className="text-[14px] text-fosco hover:text-tinta disabled:opacity-50">
            Refazer com o contexto
          </button>
        )}
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
              className="rounded-lg bg-tinta px-3.5 py-1.5 text-[14px] font-medium text-fundo disabled:opacity-50"
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
