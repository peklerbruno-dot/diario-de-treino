"use client";

import { useActionState } from "react";
import { salvarContato, type RespostaDoContato } from "./acoes";
import { comoVeio } from "@/lib/formulario";
import { NOME_DO_VINCULO, VINCULOS } from "@/lib/contatos";
import { AreaDeTexto, Aviso, Botao, BotaoLink, Campo, Selecao, Texto } from "@/componentes/pecas";

export type ContatoNoFormulario = {
  id?: string;
  nome?: string;
  email?: string;
  telefone?: string | null;
  vinculo?: string;
  instituicao?: string | null;
  origem?: string | null;
  observacao?: string | null;
  consentimentoEm?: Date | null;
  etiquetas?: string;
};

export function FormularioDeContato({ contato = {} }: { contato?: ContatoNoFormulario }) {
  const [estado, agir, esperando] = useActionState(salvarContato, null as RespostaDoContato);
  const v = (campo: string, guardado?: string | null) => comoVeio(estado, campo, guardado);

  return (
    <form action={agir} className="max-w-3xl space-y-5">
      {contato.id && <input type="hidden" name="id" value={contato.id} />}

      <fieldset className="grid gap-4 rounded-cartao bg-cartao p-5 shadow-cartao sm:grid-cols-2">
        <Campo rotulo="Nome">
          <Texto nome="nome" valor={v("nome", contato.nome)} obrigatorio autoFoco />
        </Campo>
        <Campo rotulo="E-mail">
          <Texto nome="email" tipo="email" valor={v("email", contato.email)} obrigatorio />
        </Campo>
        <Campo rotulo="Telefone">
          <Texto nome="telefone" valor={v("telefone", contato.telefone)} placeholder="(11) 98765-4321" />
        </Campo>
        <Campo rotulo="Vínculo">
          <Selecao
            nome="vinculo"
            valor={v("vinculo", contato.vinculo) || "OUTRO"}
            opcoes={VINCULOS.map((x) => ({ valor: x, rotulo: NOME_DO_VINCULO[x] }))}
          />
        </Campo>
        <Campo rotulo="Instituição">
          <Texto nome="instituicao" valor={v("instituicao", contato.instituicao)} />
        </Campo>
        <Campo
          rotulo="Etiquetas"
          dica="Separadas por vírgula. É por elas que o boletim escolhe para quem vai."
        >
          <Texto nome="etiquetas" valor={v("etiquetas", contato.etiquetas)} placeholder="hebraico, imprensa" />
        </Campo>
        <Campo
          rotulo="De onde veio"
          className="sm:col-span-2"
          dica="A resposta para 'por que temos o e-mail desta pessoa?'. Vale escrever."
        >
          <Texto nome="origem" valor={v("origem", contato.origem)} placeholder="Inscrição na aula inaugural de 2025" />
        </Campo>
        <Campo rotulo="Observação" className="sm:col-span-2">
          <AreaDeTexto nome="observacao" valor={v("observacao", contato.observacao)} linhas={3} />
        </Campo>
      </fieldset>

      <fieldset className="rounded-cartao bg-cartao p-5 shadow-cartao">
        <legend className="sobrescrito px-1">Consentimento</legend>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="consentimento"
            value="sim"
            defaultChecked={contato.consentimentoEm != null}
            className="mt-1 h-[18px] w-[18px]"
          />
          <span className="text-[14.5px] leading-relaxed text-grafite">
            <b className="text-tinta">Esta pessoa concordou em receber os boletins do Centro.</b>
            <br />
            Sem esta marca o contato continua na base, e você continua podendo escrever para ela
            pessoalmente — ela só fica de fora dos envios em massa. Ter o e-mail de alguém e poder
            mandar boletim para ela são coisas diferentes, e é essa diferença que a lei trata.
            {contato.consentimentoEm && (
              <>
                <br />
                <span className="text-[13px] text-fosco">
                  Registrado em {contato.consentimentoEm.toLocaleDateString("pt-BR")}.
                </span>
              </>
            )}
          </span>
        </label>
      </fieldset>

      {estado?.erro && <Aviso tom="erro">{estado.erro}</Aviso>}

      <div className="flex flex-wrap gap-3">
        <Botao tipo="primario" disabled={esperando}>
          {esperando ? "Guardando…" : contato.id ? "Guardar" : "Cadastrar contato"}
        </Botao>
        <BotaoLink href={contato.id ? `/contatos/${contato.id}` : "/contatos"}>Cancelar</BotaoLink>
      </div>
    </form>
  );
}
