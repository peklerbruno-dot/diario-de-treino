"use client";

import { useActionState, useEffect, useRef } from "react";
import { salvarItem } from "@/acoes/roteiro";
import { BotaoEnviar } from "./formulario";
import { Aviso } from "./pecas";
import { curta } from "@/lib/datas";

type Item = { id: string; dia: string; hora: string; titulo: string; notas: string; lugarId: string | null };

/** Pôr (ou editar) uma coisa no roteiro — com ou sem lugar da lista. */
export function FormularioDeItem({
  viagemId,
  dias,
  lugares,
  lugarFixo,
  item,
  diaInicial,
  aoSalvar,
}: {
  viagemId: string;
  dias: string[];
  lugares: { id: string; nome: string }[];
  lugarFixo?: { id: string; nome: string };
  item?: Item;
  diaInicial?: string;
  aoSalvar?: () => void;
}) {
  const [estado, agir] = useActionState(salvarItem, null);
  const form = useRef<HTMLFormElement>(null);
  const v = (campo: string, guardado?: string | null) => estado?.valores?.[campo] ?? guardado ?? "";

  useEffect(() => {
    if (estado?.valores?.ok) {
      if (!item) form.current?.reset();
      aoSalvar?.();
    }
  }, [estado, item, aoSalvar]);

  return (
    <form ref={form} action={agir} className="space-y-3">
      <input type="hidden" name="viagemId" value={viagemId} />
      {item && <input type="hidden" name="itemId" value={item.id} />}
      {lugarFixo && <input type="hidden" name="lugarId" value={lugarFixo.id} />}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="block">
          <span className="rotulo">Dia</span>
          <select name="dia" className="campo" defaultValue={v("dia", item?.dia ?? diaInicial ?? dias[0])} key={`dia-${estado?.valores?.ok ?? ""}`}>
            {dias.map((d) => <option key={d} value={d}>{curta(d)}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="rotulo">Hora</span>
          <input name="hora" type="time" className="campo w-[118px]" defaultValue={v("hora", item?.hora)} />
        </label>
      </div>
      {!lugarFixo && (
        <>
          <label className="block">
            <span className="rotulo">O quê</span>
            <input name="titulo" className="campo" defaultValue={v("titulo", item?.titulo)} placeholder="Voo, check-in, jantar…" />
          </label>
          {lugares.length > 0 && (
            <label className="block">
              <span className="rotulo">Lugar da lista (opcional)</span>
              <select name="lugarId" className="campo" defaultValue={v("lugarId", item?.lugarId)}>
                <option value="">—</option>
                {lugares.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </label>
          )}
        </>
      )}
      <label className="block">
        <span className="rotulo">Notas</span>
        <input name="notas" className="campo" defaultValue={v("notas", item?.notas)} placeholder="Reserva no nome do Pedro, levar dinheiro…" />
      </label>
      {estado?.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      {estado?.valores?.ok && !item && <Aviso tom="ok">No roteiro de {curta(estado.valores.ok)}.</Aviso>}
      <BotaoEnviar>{item ? "Salvar" : "Pôr no roteiro"}</BotaoEnviar>
    </form>
  );
}
