"use client";

import { useActionState } from "react";
import { enviarTesteDeConfiguracao, type RespostaDoTeste } from "../acoes";
import { Aviso, Botao } from "@/componentes/pecas";

export function TesteDeEnvio({ meuEmail, pronto }: { meuEmail: string; pronto: boolean }) {
  const [estado, agir, esperando] = useActionState(
    enviarTesteDeConfiguracao,
    null as RespostaDoTeste,
  );

  return (
    <form action={agir} className="space-y-3">
      <label className="block">
        <span className="block text-[14px] font-medium text-grafite">Mandar um teste para</span>
        <input
          name="para"
          type="email"
          defaultValue={estado?.para ?? meuEmail}
          className="mt-1.5 w-full rounded-folha border border-regua bg-cartao px-3.5 py-2.5 outline-none focus:border-realce"
        />
        <span className="mt-1 block text-[12.5px] leading-snug text-fosco">
          Vale usar também um Gmail ou um Outlook pessoal: é assim que se descobre se a mensagem
          chega fora da USP, que é onde a maior parte da base está.
        </span>
      </label>

      {estado?.erro && (
        <Aviso tom="erro">
          <b>O serviço recusou.</b>
          <br />
          <span className="mt-1 block font-mono text-[12.5px] leading-relaxed">{estado.erro}</span>
        </Aviso>
      )}
      {estado?.pronto && <Aviso tom="bom">{estado.pronto}</Aviso>}

      <Botao tipo="primario" disabled={esperando || !pronto}>
        {esperando ? "Mandando…" : "Mandar o teste"}
      </Botao>
    </form>
  );
}
