"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { apagarTarefa, concluirTarefa, salvarTarefa } from "@/app/(app)/acoes";

/**
 * Uma tarefa sua aberta: o texto, o prazo e a nota — o porquê dela, para
 * daqui a uma semana você ainda saber do que se trata.
 */
export function DetalheTarefa({
  t,
}: {
  t: { id: string; titulo: string; prazo: string | null; nota: string; criadaEm: string; feita: boolean };
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(t.titulo);
  const [prazo, setPrazo] = useState(t.prazo ?? "");
  const [nota, setNota] = useState(t.nota);
  const [pendente, comecar] = useTransition();
  const [salvo, setSalvo] = useState(false);
  const mudou = titulo !== t.titulo || prazo !== (t.prazo ?? "") || nota !== t.nota;

  const salvar = () =>
    comecar(async () => {
      await salvarTarefa(t.id, { titulo, prazo: prazo || null, nota });
      setSalvo(true);
    });

  return (
    <article>
      <p className="text-[13px] text-fosco">Tarefa sua · anotada em {t.criadaEm}</p>
      <textarea
        value={titulo}
        onChange={(e) => {
          setTitulo(e.target.value);
          setSalvo(false);
        }}
        rows={Math.min(4, Math.max(1, Math.ceil(titulo.length / 36)))}
        className="mt-2 w-full resize-none bg-transparent text-[24px] font-semibold leading-snug tracking-tight outline-none"
        aria-label="Tarefa"
      />

      <dl className="mt-6 space-y-5 text-[15px]">
        <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
          <dt className="w-[92px] shrink-0 pt-[3px] text-[13px] font-semibold text-fosco">Prazo</dt>
          <dd className="flex items-center gap-3">
            <input
              type="date"
              value={prazo}
              onChange={(e) => {
                setPrazo(e.target.value);
                setSalvo(false);
              }}
              className="rounded-md border border-linha bg-transparent px-2 py-1 text-[15px] outline-none focus:border-regua"
            />
            {prazo && (
              <button onClick={() => setPrazo("")} className="text-[13px] text-fosco hover:text-tinta">
                sem prazo
              </button>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
          <dt className="w-[92px] shrink-0 pt-[3px] text-[13px] font-semibold text-fosco">Por quê</dt>
          <dd className="min-w-0 flex-1">
            <textarea
              value={nota}
              onChange={(e) => {
                setNota(e.target.value);
                setSalvo(false);
              }}
              rows={4}
              placeholder="Quem pediu, para quê, o que já foi combinado…"
              className="w-full rounded-lg border border-linha bg-transparent px-3 py-2 text-[15px] leading-relaxed outline-none placeholder:text-fosco focus:border-regua"
            />
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px]">
        {mudou && (
          <button onClick={salvar} disabled={pendente} className="rounded-lg bg-tinta px-4 py-1.5 font-medium text-fundo disabled:opacity-40">
            Salvar
          </button>
        )}
        {salvo && !mudou && <span className="text-[13px] text-fosco">Salvo.</span>}
        <button
          onClick={() => comecar(() => concluirTarefa(t.id, !t.feita))}
          disabled={pendente}
          className="text-grafite hover:text-tinta"
        >
          {t.feita ? "Reabrir" : "Concluir"}
        </button>
        <button
          onClick={() =>
            comecar(async () => {
              await apagarTarefa(t.id);
              router.push("/", { scroll: false });
            })
          }
          disabled={pendente}
          className="text-fosco hover:text-atencao"
        >
          Apagar
        </button>
      </div>
    </article>
  );
}
