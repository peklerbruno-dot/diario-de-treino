"use client";

import { useActionState } from "react";
import { Botao } from "@/components/ui/button";
import { Campo, Rotulo } from "@/components/ui/input";
import { Cartao, CartaoCorpo } from "@/components/ui/card";
import { Aviso } from "@/components/ui/avisos";
import { pedirLink, type EstadoLogin } from "./actions";

export function FormularioLogin({ erroDeEntrada }: { erroDeEntrada?: string }) {
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(pedirLink, {});

  return (
    <Cartao>
      <CartaoCorpo>
        {erroDeEntrada ? (
          <Aviso tom="erro" className="mb-3">
            {erroDeEntrada}
          </Aviso>
        ) : null}
        <form action={acao} className="space-y-3">
          <div>
            <Rotulo htmlFor="email">Seu e-mail</Rotulo>
            <Campo
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="voce@chazit.org.br"
            />
          </div>
          <Botao type="submit" disabled={pendente} className="w-full">
            {pendente ? "Gerando link…" : "Receber link de entrada"}
          </Botao>
        </form>

        {estado.erro ? (
          <Aviso tom="erro" className="mt-3">
            {estado.erro}
          </Aviso>
        ) : null}
        {estado.mensagem ? (
          <Aviso tom="ok" className="mt-3">
            {estado.mensagem}
          </Aviso>
        ) : null}
        {estado.link ? (
          <Aviso tom="neutro" className="mt-2 break-all">
            Ambiente de desenvolvimento — o link não foi enviado por e-mail:{" "}
            <a className="font-medium text-acento underline" href={estado.link}>
              {estado.link}
            </a>
          </Aviso>
        ) : null}
      </CartaoCorpo>
    </Cartao>
  );
}
