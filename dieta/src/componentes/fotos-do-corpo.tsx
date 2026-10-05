"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { apagarFotoDoCorpo } from "@/app/acoes";
import type { FotoDoCorpo } from "@/lib/consultas";
import { diaCurto, diaPorExtenso } from "@/lib/datas";
import { Folha } from "./foto-do-prato";
import { Botao, Cartao } from "./pecas";
import { reduzirImagem } from "./reduzir";

/**
 * Fotos do corpo, para ver a mudança que a balança não mostra. Uma por mês
 * basta — mesma luz, mesma pose, mesma roupa — e a comparação põe a primeira
 * e a mais nova lado a lado (dá para escolher outras duas).
 *
 * Fechado por padrão: abrir o app no ônibus não deve mostrar essas fotos.
 */
export function FotosDoCorpo({ lista, hoje }: { lista: FotoDoCorpo[]; hoje: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [antes, setAntes] = useState<string | null>(null);
  const [depois, setDepois] = useState<string | null>(null);
  const [vendo, setVendo] = useState<FotoDoCorpo | null>(null);
  const [, iniciar] = useTransition();
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  const a = lista.find((f) => f.id === antes) ?? lista[0];
  const b = lista.find((f) => f.id === depois) ?? lista[lista.length - 1];
  const ultima = lista[lista.length - 1];
  const faz = ultima ? Math.round((Date.parse(hoje) - Date.parse(ultima.dia)) / 86_400_000) : null;
  const lembrar = faz == null || faz >= 28;

  const enviar = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setErro("");
    setEnviando(true);
    try {
      const dados = new FormData();
      dados.set("imagem", new File([await reduzirImagem(arquivo, 1600, 0.85)], "corpo.jpg", { type: "image/jpeg" }));
      dados.set("dia", hoje);
      const r = await fetch("/api/corpo", { method: "POST", body: dados });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erro ?? "");
      setAberto(true);
      setAntes(null);
      setDepois(null);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : "Não consegui salvar a foto.");
    } finally {
      setEnviando(false);
      if (camera.current) camera.current.value = "";
      if (galeria.current) galeria.current.value = "";
    }
  };

  const seletor = (valor: FotoDoCorpo, mudar: (id: string) => void, rotulo: string) => (
    <select aria-label={rotulo} value={valor.id} onChange={(e) => mudar(e.target.value)} className="mt-1 w-full rounded-[10px] bg-papel px-2 py-1.5 text-[14px]">
      {lista.map((f) => (
        <option key={f.id} value={f.id}>
          {diaCurto(f.dia)}/{f.dia.slice(2, 4)}
        </option>
      ))}
    </select>
  );

  return (
    <Cartao>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Fotos do corpo</p>
          <p className="mt-0.5 text-[14px] text-grafite">
            {lista.length === 0
              ? "Uma por mês, com a mesma luz e a mesma pose, mostra o que a balança não mostra."
              : `${lista.length} foto${lista.length === 1 ? "" : "s"}${ultima ? ` · a última em ${diaCurto(ultima.dia)}` : ""}`}
          </p>
          {lista.length > 0 && lembrar && <p className="mt-1 text-[13.5px] font-medium text-folha">Já faz um mês: hora de uma nova.</p>}
        </div>
        {lista.length > 0 && (
          <Botao className="shrink-0 !px-3 !py-2 text-[15px]" onClick={() => setAberto((x) => !x)} aria-expanded={aberto}>
            {aberto ? "Esconder" : "Mostrar"}
          </Botao>
        )}
      </div>

      {aberto && lista.length >= 2 && a && b && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { f: a, mudar: setAntes, rotulo: "Antes" },
            { f: b, mudar: setDepois, rotulo: "Depois" },
          ].map(({ f, mudar, rotulo }) => (
            <div key={rotulo}>
              <p className="text-[12px] uppercase tracking-wide text-fosco">{rotulo}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/corpo/${f.id}`} alt={`${rotulo}: ${diaPorExtenso(f.dia)}`} className="mt-1 aspect-[3/4] w-full rounded-[12px] object-cover" />
              {seletor(f, mudar, `Foto de ${rotulo.toLowerCase()}`)}
            </div>
          ))}
        </div>
      )}

      {aberto && lista.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {[...lista].reverse().map((f) => (
            <button key={f.id} type="button" onClick={() => setVendo(f)} className="shrink-0 text-center" aria-label={`Foto de ${diaPorExtenso(f.dia)}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/corpo/${f.id}`} alt="" loading="lazy" className="h-20 w-[60px] rounded-[10px] object-cover" />
              <span className="text-[11px] tabular text-fosco">{diaCurto(f.dia)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Botao tipo={lembrar ? "primario" : "secundario"} disabled={enviando} onClick={() => camera.current?.click()}>
          {enviando ? "Salvando…" : "Tirar foto"}
        </Botao>
        <Botao disabled={enviando} onClick={() => galeria.current?.click()}>
          Da galeria
        </Botao>
      </div>
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => enviar(e.target.files?.[0])} />
      <input ref={galeria} type="file" accept="image/*" hidden onChange={(e) => enviar(e.target.files?.[0])} />
      {erro && <p className="mt-2 text-[14px] text-pulou">{erro}</p>}

      {vendo && (
        <Folha titulo={diaPorExtenso(vendo.dia)} aoFechar={() => setVendo(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/corpo/${vendo.id}`} alt="" className="max-h-[60svh] w-full rounded-folha object-contain" />
          <Botao
            tipo="perigo"
            className="mt-4 w-full"
            onClick={() =>
              confirm("Apagar esta foto?") &&
              iniciar(async () => {
                await apagarFotoDoCorpo(vendo.id);
                setVendo(null);
                setAntes(null);
                setDepois(null);
              })
            }
          >
            Apagar foto
          </Botao>
        </Folha>
      )}
    </Cartao>
  );
}

