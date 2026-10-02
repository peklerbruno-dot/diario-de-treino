"use client";

import { SEMANA_CURTA } from "@/lib/datas";
import { campo } from "./pecas";

/**
 * Os campos de uma refeição: nome, horário, o que comer (em texto), nota e
 * dias. É o mesmo formulário na conferência do plano lido e na edição do plano
 * em uso.
 */

export type Rascunho = { nome: string; horario: string; texto: string; nota: string; dias: number[] };

export function CamposDaRefeicao({ valor, aoMudar }: { valor: Rascunho; aoMudar: (v: Rascunho) => void }) {
  const mudar = (parcial: Partial<Rascunho>) => aoMudar({ ...valor, ...parcial });
  const todos = valor.dias.length === 0;
  const alternarDia = (d: number) => {
    const atuais = todos ? [0, 1, 2, 3, 4, 5, 6] : valor.dias;
    const novos = atuais.includes(d) ? atuais.filter((x) => x !== d) : [...atuais, d].sort();
    // Nenhum dia marcado não faz sentido; sete é o mesmo que "todo dia".
    mudar({ dias: novos.length === 0 || novos.length === 7 ? [] : novos });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="text-[13px] text-fosco">Refeição</span>
          <input className={campo} value={valor.nome} onChange={(e) => mudar({ nome: e.target.value })} placeholder="Almoço" />
        </label>
        <label className="w-[118px]">
          <span className="text-[13px] text-fosco">Horário</span>
          <input type="time" className={`${campo} tabular`} value={valor.horario} onChange={(e) => mudar({ horario: e.target.value })} />
        </label>
      </div>

      <label className="block">
        <span className="text-[13px] text-fosco">O que comer — um alimento por linha</span>
        <textarea
          className={`${campo} min-h-[140px] leading-snug`}
          value={valor.texto}
          onChange={(e) => mudar({ texto: e.target.value })}
          rows={Math.min(14, Math.max(5, valor.texto.split("\n").length + 1))}
          placeholder={"Arroz integral — 4 col. de sopa\nou batata-doce — 150 g\nFrango grelhado — 120 g"}
        />
        <span className="mt-1 block text-[12.5px] leading-snug text-fosco">
          Comece com “ou” para uma substituição do item de cima. Uma linha terminada em “:” (ex.: “Opção 2:”) abre
          uma alternativa inteira.
        </span>
      </label>

      <label className="block">
        <span className="text-[13px] text-fosco">Observação (opcional)</span>
        <input className={campo} value={valor.nota} onChange={(e) => mudar({ nota: e.target.value })} placeholder="Ex.: sem açúcar" />
      </label>

      <div>
        <span className="text-[13px] text-fosco">Dias {todos && "— todos"}</span>
        <div className="mt-1 flex gap-1">
          {SEMANA_CURTA.map((nome, d) => {
            const marcado = todos || valor.dias.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={marcado}
                onClick={() => alternarDia(d)}
                className={`flex-1 rounded-[10px] py-1.5 text-[13px] ${marcado ? "bg-folha-clara font-semibold text-folha" : "bg-papel text-fosco"}`}
              >
                {nome}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
