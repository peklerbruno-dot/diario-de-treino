"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adiar, arquivarNoGmail, marcarResolvida } from "@/app/(app)/acoes";
import { Deslizavel, MenuAdiar } from "./deslizar";

/**
 * Os gestos numa conversa da lista de E-mails: → resolve, ← arquiva no
 * Gmail, segurar adia. A linha some na hora; o servidor confirma depois.
 */
export function LinhaDeslizavel({ id, titulo, resolvida, children }: { id: string; titulo: string; resolvida: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const [sumiu, setSumiu] = useState(false);
  const [adiando, setAdiando] = useState(false);
  const [, comecar] = useTransition();
  const fazer = (f: () => Promise<unknown>) => {
    setSumiu(true);
    comecar(async () => {
      const r = (await f()) as { ok?: boolean } | void;
      if (r && r.ok === false) setSumiu(false);
      router.refresh();
    });
  };
  if (sumiu) return null;
  return (
    <>
      <Deslizavel
        className="-mx-3"
        direita={resolvida ? undefined : { rotulo: "Resolver", fundo: "bg-ok", acao: () => fazer(() => marcarResolvida(id, true)) }}
        esquerda={resolvida ? undefined : { rotulo: "Arquivar", fundo: "bg-azul", acao: () => fazer(() => arquivarNoGmail(id)) }}
        segurar={resolvida ? undefined : () => setAdiando(true)}
      >
        {children}
      </Deslizavel>
      {adiando && (
        <MenuAdiar
          titulo={titulo}
          onFechar={() => setAdiando(false)}
          onEscolher={(dia) => {
            setAdiando(false);
            fazer(() => adiar(`c:${id}`, dia));
          }}
        />
      )}
    </>
  );
}
