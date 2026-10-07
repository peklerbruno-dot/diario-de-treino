"use client";

import Link from "next/link";
import { useState } from "react";
import { gerarRascunho, salvarRascunho } from "../../acoes";

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
    <section className="mt-6 rounded-cartao bg-cartao p-4 shadow-cartao">
      <h2 className="font-titulo text-xl">Responder</h2>
      <label className="mt-3 block text-sm text-grafite" htmlFor="contexto">
        O que você quer dizer, ou o que já combinou fora do e-mail (conversa, ligação, WhatsApp). Pode deixar em branco.
      </label>
      <textarea
        id="contexto"
        value={contexto}
        onChange={(e) => setContexto(e.target.value)}
        rows={3}
        placeholder="Ex.: confirmar presença, dizer que mando o arquivo até sexta…"
        className="mt-1 w-full rounded-xl border border-regua bg-papel px-3 py-2 outline-none focus:border-destaque"
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => escrever(false)}
          disabled={ocupado}
          className="rounded-xl bg-destaque px-4 py-2 text-sm font-semibold text-destaque-tinta disabled:opacity-60"
        >
          {estado === "escrevendo" ? "Escrevendo…" : texto ? "Escrever de novo" : "Rascunhar resposta"}
        </button>
        {texto && (
          <button onClick={() => escrever(true)} disabled={ocupado} className="rounded-xl bg-linha px-4 py-2 text-sm font-semibold disabled:opacity-60">
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
            className="mt-3 w-full rounded-xl border border-regua bg-papel px-3 py-2 text-[16px] leading-relaxed outline-none focus:border-destaque"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={salvar}
              disabled={ocupado || !texto.trim()}
              className="rounded-xl bg-tinta px-4 py-2 text-sm font-semibold text-papel disabled:opacity-60"
            >
              {estado === "salvando" ? "Salvando…" : "Salvar como rascunho no Gmail"}
            </button>
            <button
              onClick={() => navigator.clipboard?.writeText(texto)}
              className="rounded-xl bg-linha px-4 py-2 text-sm font-semibold"
            >
              Copiar
            </button>
          </div>
          {/\[[^\]]+\]/.test(texto) && (
            <p className="mt-2 text-sm text-alerta">Há trechos entre [colchetes] para você completar antes de enviar.</p>
          )}
        </>
      )}

      {aviso && (
        <p className={`mt-2 text-sm ${aviso.ruim ? "text-atencao" : "text-grafite"}`}>
          {aviso.texto}{" "}
          {aviso.link && (
            <a href={aviso.link} target="_blank" rel="noreferrer" className="font-semibold text-destaque">
              Abrir no Gmail ↗
            </a>
          )}
        </p>
      )}
      {semEstilo && (
        <p className="mt-3 text-xs text-fosco">
          Dica: em <Link href="/ajustes" className="underline">Ajustes</Link>, “Aprender meu estilo” faz os rascunhos soarem mais como você.
        </p>
      )}
    </section>
  );
}
