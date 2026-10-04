"use client";

import { useState, useTransition } from "react";
import { alternarLembrete, apagarLembrete, salvarLembrete } from "@/app/acoes";
import type { LembreteSeu } from "@/lib/agenda";
import { SEMANA_CURTA, horaFalada } from "@/lib/datas";
import { SeletorDeDias } from "./editor-de-refeicao";
import { Botao, Cartao, Chave, campo } from "./pecas";

/** Os seus lembretes: remédio, creatina, vitamina, pesar-se… */

const SUGESTOES = [
  { titulo: "Remédio", horario: "08:00" },
  { titulo: "Creatina", horario: "08:00" },
  { titulo: "Vitamina", horario: "12:30" },
  { titulo: "Suplemento", horario: "16:00" },
  { titulo: "Pesar-se", horario: "07:00", dias: [1] },
  { titulo: "Preparar marmita", horario: "20:00" },
];

const diasPorExtenso = (dias: number[]) => (dias.length === 0 ? "todo dia" : dias.map((d) => SEMANA_CURTA[d]).join(", "));

export function Lembretes({ lista }: { lista: LembreteSeu[] }) {
  const [editando, setEditando] = useState<LembreteSeu | "novo" | null>(null);
  const [rascunhoInicial, setRascunhoInicial] = useState<Partial<LembreteSeu>>({});
  const [, iniciar] = useTransition();

  return (
    <>
      <Cartao className="divide-y divide-linha !py-1">
        {lista.length === 0 && editando !== "novo" && (
          <p className="py-3 text-[15px] text-grafite">Nenhum lembrete ainda. Remédio, creatina, vitamina — o que precisar.</p>
        )}
        {lista.map((l) =>
          editando !== "novo" && editando?.id === l.id ? (
            <Editor key={l.id} inicial={l} aoFechar={() => setEditando(null)} />
          ) : (
            <div key={l.id} className="flex min-h-[56px] items-center justify-between gap-3 py-2">
              <button type="button" className="flex-1 text-left" onClick={() => setEditando(l)}>
                <p className={`font-medium ${l.ativo ? "" : "text-fosco"}`}>{l.titulo}</p>
                <p className="text-[13px] text-fosco">
                  {horaFalada(l.horario)} · {diasPorExtenso(l.dias)}
                  {l.texto && ` · ${l.texto}`}
                </p>
              </button>
              <Chave ligado={l.ativo} rotulo={`Lembrete ${l.titulo}`} aoMudar={(v) => iniciar(() => alternarLembrete(l.id, v))} />
            </div>
          ),
        )}
        {editando === "novo" && <Editor inicial={rascunhoInicial} aoFechar={() => setEditando(null)} />}
      </Cartao>

      {editando !== "novo" && (
        <>
          <Botao className="mt-2 w-full !bg-cartao shadow-cartao" onClick={() => (setRascunhoInicial({}), setEditando("novo"))}>
            + Lembrete
          </Botao>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGESTOES.filter((s) => !lista.some((l) => l.titulo === s.titulo)).map((s) => (
              <button
                key={s.titulo}
                type="button"
                className="rounded-full bg-cartao px-3 py-1 text-[13.5px] text-grafite shadow-cartao"
                onClick={() => (setRascunhoInicial({ titulo: s.titulo, horario: s.horario, dias: s.dias ?? [] }), setEditando("novo"))}
              >
                + {s.titulo}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Editor({ inicial, aoFechar }: { inicial: Partial<LembreteSeu>; aoFechar: () => void }) {
  const [titulo, setTitulo] = useState(inicial.titulo ?? "");
  const [texto, setTexto] = useState(inicial.texto ?? "");
  const [horario, setHorario] = useState(inicial.horario ?? "08:00");
  const [dias, setDias] = useState<number[]>(inicial.dias ?? []);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  const salvar = () =>
    iniciar(async () => {
      const r = await salvarLembrete(inicial.id ?? null, { titulo, texto, horario, dias, ativo: inicial.ativo ?? true });
      if (r.erro) setErro(r.erro);
      else aoFechar();
    });

  return (
    <div className="space-y-3 py-3">
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="text-[13px] text-fosco">Lembrete</span>
          <input className={campo} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Remédio" autoFocus={!inicial.titulo} />
        </label>
        <label className="w-[118px]">
          <span className="text-[13px] text-fosco">Horário</span>
          <input type="time" className={`${campo} tabular`} value={horario} onChange={(e) => setHorario(e.target.value)} />
        </label>
      </div>
      <label className="block">
        <span className="text-[13px] text-fosco">Texto do aviso (opcional)</span>
        <input className={campo} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: 1 comprimido com água" />
      </label>
      <SeletorDeDias dias={dias} aoMudar={setDias} />
      {erro && <p className="text-[14px] text-pulou">{erro}</p>}
      <div className="flex gap-2">
        <Botao tipo="primario" className="flex-1" disabled={pendente} onClick={salvar}>
          Salvar
        </Botao>
        <Botao tipo="fantasma" onClick={aoFechar}>
          Cancelar
        </Botao>
      </div>
      {inicial.id && (
        <Botao
          tipo="perigo"
          className="w-full"
          onClick={() =>
            confirm(`Apagar o lembrete "${inicial.titulo}"?`) &&
            iniciar(async () => {
              await apagarLembrete(inicial.id!);
              aoFechar();
            })
          }
        >
          Apagar lembrete
        </Botao>
      )}
    </div>
  );
}
