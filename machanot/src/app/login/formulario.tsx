"use client";

import { useActionState } from "react";
import { Botao } from "@/components/ui/button";
import { Campo, Rotulo } from "@/components/ui/input";
import { Cartao, CartaoCorpo } from "@/components/ui/card";
import { Aviso } from "@/components/ui/avisos";
import { entrarNaPlataforma, type EstadoLogin } from "./actions";

export function FormularioLogin({ de }: { de?: string }) {
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(entrarNaPlataforma, {});

  return (
    <Cartao>
      <CartaoCorpo>
        <form action={acao} className="space-y-3">
          <input type="hidden" name="de" value={de ?? ""} />
          <div>
            <Rotulo htmlFor="codigo">Código de acesso</Rotulo>
            <Campo
              id="codigo"
              name="codigo"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              placeholder="o código combinado com a coordenação"
            />
          </div>
          <Botao type="submit" disabled={pendente} className="w-full">
            {pendente ? "Entrando…" : "Entrar"}
          </Botao>
        </form>

        {estado.erro ? (
          <Aviso tom="erro" className="mt-3">
            {estado.erro}
          </Aviso>
        ) : null}

        <p className="mt-3 text-[11px] leading-relaxed text-suave">
          Uma vez que você entra, o navegador lembra por seis meses. Não há conta, senha pessoal nem
          e-mail: é um código só, o mesmo para toda a coordenação.
        </p>
      </CartaoCorpo>
    </Cartao>
  );
}
