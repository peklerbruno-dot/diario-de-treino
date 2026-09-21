"use client";

import { useActionState } from "react";
import { salvarAtividade, type RespostaDaAtividade } from "./acoes";
import { Aviso, Botao, BotaoLink, Campo, AreaDeTexto, Selecao, Texto } from "@/componentes/pecas";
import { comoVeio } from "@/lib/formulario";
import {
  ESTADOS_DA_ATIVIDADE, EXPLICACAO_DO_ESTADO, NOME_DO_ESTADO, NOME_DO_TIPO,
  TIPOS_DE_ATIVIDADE,
} from "@/lib/tipos";

export type AtividadeNoFormulario = {
  id?: string;
  titulo?: string;
  tipo?: string;
  estado?: string;
  dia?: string;
  hora?: string | null;
  diaFinal?: string | null;
  horaFinal?: string | null;
  local?: string | null;
  resumo?: string | null;
  parceria?: string | null;
  publicoAlvo?: string | null;
  pastaNoDrive?: string | null;
  linkDeInscricao?: string | null;
  linkDaDivulgacao?: string | null;
  responsavelId?: string | null;
  publicoPresente?: number | null;
  avaliacao?: string | null;
};

/**
 * O formulário da atividade, o mesmo para cadastrar e para editar.
 *
 * Em três blocos, e a ordem importa: o que a atividade **é**, o que a equipe
 * precisa para **montá-la**, e o que se preenche **depois que aconteceu**. O
 * terceiro bloco fica visivelmente separado porque, no dia do cadastro, ele
 * está vazio de propósito — e um formulário que pede público presente de uma
 * palestra que ainda não ocorreu é um formulário que ensina a pular campos.
 */
export function FormularioDeAtividade({
  atividade = {},
  equipe,
}: {
  atividade?: AtividadeNoFormulario;
  equipe: { id: string; nome: string }[];
}) {
  const [estado, agir, esperando] = useActionState(salvarAtividade, null as RespostaDaAtividade);
  const editando = Boolean(atividade.id);

  /**
   * O valor de cada campo vem do que foi digitado, quando houve uma recusa, e
   * só então do que está guardado. Sem isso, errar a data final devolveria o
   * formulário em branco — ver `src/lib/formulario.ts`.
   */
  const v = (campo: string, guardado?: string | number | null) => comoVeio(estado, campo, guardado);

  return (
    <form action={agir} className="space-y-6">
      {atividade.id && <input type="hidden" name="id" value={atividade.id} />}

      <Bloco titulo="A atividade">
        <Campo rotulo="Título" className="sm:col-span-2">
          <Texto nome="titulo" valor={v("titulo", atividade.titulo)} obrigatorio autoFoco maximo={200} />
        </Campo>

        <Campo rotulo="Tipo">
          <Selecao
            nome="tipo"
            valor={v("tipo", atividade.tipo) || "PALESTRA"}
            opcoes={TIPOS_DE_ATIVIDADE.map((t) => ({ valor: t, rotulo: NOME_DO_TIPO[t] }))}
          />
        </Campo>

        <Campo
          rotulo="Situação"
          dica={EXPLICACAO_DO_ESTADO[(v("estado", atividade.estado) || "IDEIA") as keyof typeof EXPLICACAO_DO_ESTADO]}
        >
          <Selecao
            nome="estado"
            valor={v("estado", atividade.estado) || "IDEIA"}
            opcoes={ESTADOS_DA_ATIVIDADE.map((e) => ({ valor: e, rotulo: NOME_DO_ESTADO[e] }))}
          />
        </Campo>

        <Campo rotulo="Data">
          <Texto nome="dia" tipo="date" valor={v("dia", atividade.dia)} obrigatorio />
        </Campo>
        <Campo rotulo="Hora" dica="Em branco, a atividade ocupa o dia inteiro no calendário.">
          <Texto nome="hora" tipo="time" valor={v("hora", atividade.hora)} />
        </Campo>

        <Campo rotulo="Data final" dica="Só para o que dura mais de um dia: um curso, um congresso.">
          <Texto nome="diaFinal" tipo="date" valor={v("diaFinal", atividade.diaFinal)} />
        </Campo>
        <Campo rotulo="Hora de término" dica="Em branco, o calendário reserva duas horas.">
          <Texto nome="horaFinal" tipo="time" valor={v("horaFinal", atividade.horaFinal)} />
        </Campo>

        <Campo rotulo="Local" className="sm:col-span-2">
          <Texto nome="local" valor={v("local", atividade.local)} placeholder="Sala 14, Prédio de Letras — FFLCH" />
        </Campo>

        <Campo rotulo="Ementa ou resumo" className="sm:col-span-2">
          <AreaDeTexto
            nome="resumo"
            valor={v("resumo", atividade.resumo)}
            linhas={5}
            placeholder="O que se escreveria no cartaz e no convite."
          />
        </Campo>
      </Bloco>

      <Bloco titulo="A organização">
        <Campo rotulo="Responsável" dica="Quem a equipe procura quando tem dúvida sobre esta atividade.">
          <Selecao
            nome="responsavelId"
            valor={v("responsavelId", atividade.responsavelId)}
            vazio="— ninguém ainda —"
            opcoes={equipe.map((p) => ({ valor: p.id, rotulo: p.nome }))}
          />
        </Campo>

        <Campo rotulo="Público-alvo">
          <Texto nome="publicoAlvo" valor={v("publicoAlvo", atividade.publicoAlvo)} placeholder="Graduação, pós, comunidade externa…" />
        </Campo>

        <Campo rotulo="Parceria" className="sm:col-span-2" dica="Departamentos, instituições, consulados, financiadores.">
          <Texto nome="parceria" valor={v("parceria", atividade.parceria)} />
        </Campo>

        <Campo rotulo="Pasta no Google Drive">
          <Texto nome="pastaNoDrive" valor={v("pastaNoDrive", atividade.pastaNoDrive)} placeholder="drive.google.com/…" />
        </Campo>
        <Campo rotulo="Formulário de inscrição">
          <Texto nome="linkDeInscricao" valor={v("linkDeInscricao", atividade.linkDeInscricao)} placeholder="forms.gle/…" />
        </Campo>
        <Campo rotulo="Arte da divulgação" className="sm:col-span-2">
          <Texto nome="linkDaDivulgacao" valor={v("linkDaDivulgacao", atividade.linkDaDivulgacao)} />
        </Campo>
      </Bloco>

      <Bloco
        titulo="Depois que acontecer"
        chamada="Estes dois campos são o relatório do ano. Preenchidos na semana seguinte, custam um minuto; em dezembro, custam uma tarde de arqueologia."
      >
        <Campo rotulo="Público presente" dica="Quantas pessoas apareceram. Só um número.">
          <Texto nome="publicoPresente" tipo="number" valor={v("publicoPresente", atividade.publicoPresente)} />
        </Campo>
        <Campo rotulo="Avaliação" className="sm:col-span-2">
          <AreaDeTexto
            nome="avaliacao"
            valor={v("avaliacao", atividade.avaliacao)}
            linhas={4}
            placeholder="O que funcionou, o que faltou, o que fazer diferente na próxima."
          />
        </Campo>
      </Bloco>

      {estado?.erro && <Aviso tom="erro">{estado.erro}</Aviso>}

      <div className="flex flex-wrap gap-3">
        <Botao tipo="primario" disabled={esperando}>
          {esperando ? "Guardando…" : editando ? "Guardar as mudanças" : "Cadastrar a atividade"}
        </Botao>
        <BotaoLink href={atividade.id ? `/atividades/${atividade.id}` : "/atividades"}>
          Cancelar
        </BotaoLink>
      </div>
    </form>
  );
}

function Bloco({
  titulo,
  chamada,
  children,
}: {
  titulo: string;
  chamada?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-cartao bg-cartao p-5 shadow-cartao">
      <legend className="sobrescrito px-1">{titulo}</legend>
      {chamada && <p className="mb-4 max-w-leitura text-[13.5px] leading-relaxed text-grafite">{chamada}</p>}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
