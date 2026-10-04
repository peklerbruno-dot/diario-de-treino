"use client";

import { useActionState } from "react";
import { salvarPix } from "@/acoes/viagem";
import { BotaoEnviar } from "./formulario";
import { Aviso } from "./pecas";

export function FormularioDoPix({ viagemId, pix }: { viagemId: string; pix: string }) {
  const [estado, agir] = useActionState(salvarPix, null);
  return (
    <form action={agir} className="space-y-3">
      <input type="hidden" name="viagemId" value={viagemId} />
      <p className="text-[15px] text-grafite">Quem for te pagar vê esta chave no “Acertar”, já com o código copia-e-cola com o valor certo.</p>
      <input name="pix" className="campo" defaultValue={estado?.valores?.pix ?? pix} placeholder="CPF, celular, e-mail ou chave aleatória" autoCapitalize="none" />
      {estado?.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      {estado?.valores?.ok && <Aviso tom="ok">Chave salva.</Aviso>}
      <BotaoEnviar className="botao-leve w-full">Salvar minha chave Pix</BotaoEnviar>
    </form>
  );
}
