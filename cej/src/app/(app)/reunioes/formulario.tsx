"use client";

import { useActionState } from "react";
import { salvarReuniao, type RespostaDaReuniao } from "./acoes";
import { Aviso, Botao, BotaoLink, Campo, Texto } from "@/componentes/pecas";
import { comoVeio } from "@/lib/formulario";

export function FormularioDeReuniao({
  reuniao = {},
}: {
  reuniao?: { id?: string; titulo?: string; dia?: string; hora?: string | null; local?: string | null };
}) {
  const [estado, agir, esperando] = useActionState(salvarReuniao, null as RespostaDaReuniao);
  const v = (campo: string, guardado?: string | null) => comoVeio(estado, campo, guardado);

  return (
    <form action={agir} className="max-w-2xl space-y-5">
      {reuniao.id && <input type="hidden" name="id" value={reuniao.id} />}

      <fieldset className="grid gap-4 rounded-cartao bg-cartao p-5 shadow-cartao sm:grid-cols-2">
        <Campo rotulo="Título" className="sm:col-span-2">
          <Texto nome="titulo" valor={v("titulo", reuniao.titulo)} obrigatorio autoFoco placeholder="Reunião de planejamento do semestre" />
        </Campo>
        <Campo rotulo="Data">
          <Texto nome="dia" tipo="date" valor={v("dia", reuniao.dia)} obrigatorio />
        </Campo>
        <Campo rotulo="Hora">
          <Texto nome="hora" tipo="time" valor={v("hora", reuniao.hora)} />
        </Campo>
        <Campo rotulo="Local" className="sm:col-span-2" dica="Uma sala, ou o link da chamada de vídeo.">
          <Texto nome="local" valor={v("local", reuniao.local)} />
        </Campo>
      </fieldset>

      {estado?.erro && <Aviso tom="erro">{estado.erro}</Aviso>}

      <div className="flex flex-wrap gap-3">
        <Botao tipo="primario" disabled={esperando}>
          {esperando ? "Guardando…" : reuniao.id ? "Guardar" : "Marcar a reunião"}
        </Botao>
        <BotaoLink href={reuniao.id ? `/reunioes/${reuniao.id}` : "/reunioes"}>Cancelar</BotaoLink>
      </div>
    </form>
  );
}
