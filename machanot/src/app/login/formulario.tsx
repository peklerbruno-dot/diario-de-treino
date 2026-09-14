"use client";

import { useActionState, useState } from "react";
import { Botao } from "@/components/ui/button";
import { Campo, Rotulo } from "@/components/ui/input";
import { Cartao, CartaoCorpo } from "@/components/ui/card";
import { Aviso } from "@/components/ui/avisos";
import { entrarComSenha, pedirLink, type EstadoLogin } from "./actions";

export function FormularioLogin({
  erroDeEntrada,
  de,
  comCodigo,
}: {
  erroDeEntrada?: string;
  de?: string;
  comCodigo: boolean;
}) {
  // Quando existe código combinado, ele é o caminho normal: o link por e-mail
  // só funciona depois que o envio estiver ligado.
  const [porCodigo, setPorCodigo] = useState(comCodigo);
  const [linkEstado, acaoLink, pendenteLink] = useActionState<EstadoLogin, FormData>(pedirLink, {});
  const [codigoEstado, acaoCodigo, pendenteCodigo] = useActionState<EstadoLogin, FormData>(
    entrarComSenha,
    {},
  );

  const estado = porCodigo ? codigoEstado : linkEstado;

  return (
    <Cartao>
      <CartaoCorpo>
        {erroDeEntrada ? (
          <Aviso tom="erro" className="mb-3">
            {erroDeEntrada}
          </Aviso>
        ) : null}

        {porCodigo ? (
          <form action={acaoCodigo} className="space-y-3">
            <input type="hidden" name="de" value={de ?? ""} />
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
            <div>
              <Rotulo htmlFor="codigo">Código de acesso</Rotulo>
              <Campo
                id="codigo"
                name="codigo"
                type="password"
                required
                autoComplete="current-password"
                placeholder="o código combinado com a coordenação"
              />
            </div>
            <Botao type="submit" disabled={pendenteCodigo} className="w-full">
              {pendenteCodigo ? "Entrando…" : "Entrar"}
            </Botao>
          </form>
        ) : (
          <form action={acaoLink} className="space-y-3">
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
            <Botao type="submit" disabled={pendenteLink} className="w-full">
              {pendenteLink ? "Gerando link…" : "Receber link de entrada"}
            </Botao>
          </form>
        )}

        {comCodigo ? (
          <button
            type="button"
            className="mt-3 text-xs text-suave underline hover:text-texto"
            onClick={() => setPorCodigo(!porCodigo)}
          >
            {porCodigo
              ? "Prefiro receber um link por e-mail"
              : "Entrar com o código de acesso"}
          </button>
        ) : null}

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
        {linkEstado.link && !porCodigo ? (
          <Aviso tom="neutro" className="mt-2 break-all">
            Ambiente de desenvolvimento — o link não foi enviado por e-mail:{" "}
            <a className="font-medium text-acento underline" href={linkEstado.link}>
              {linkEstado.link}
            </a>
          </Aviso>
        ) : null}

        {!comCodigo ? (
          <p className="mt-3 text-[11px] leading-relaxed text-suave">
            O link vale por 15 minutos e serve uma vez só. Se o envio de e-mail ainda não estiver
            ligado nesta instalação, peça o link a quem cuida da parte técnica.
          </p>
        ) : null}
      </CartaoCorpo>
    </Cartao>
  );
}
