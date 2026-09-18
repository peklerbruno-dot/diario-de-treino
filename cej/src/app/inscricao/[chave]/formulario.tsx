"use client";

import { useActionState } from "react";
import { inscrever, type RespostaDaInscricao } from "@/app/acoes-publicas";
import { NOME_DO_VINCULO, VINCULOS } from "@/lib/contatos";
import { Aviso, Campo, Selecao, Texto } from "@/componentes/pecas";

export function FormularioDeInscricao({ chave, titulo }: { chave: string; titulo: string }) {
  const [estado, agir, esperando] = useActionState(inscrever, null as RespostaDaInscricao | null);
  const v = estado?.valores ?? {};

  if (estado?.pronto) {
    return (
      <div className="rounded-cartao bg-cartao p-6 shadow-cartao ring-2 ring-verde/40">
        <p className="font-titulo text-[21px] font-semibold tracking-tight">
          Inscrição feita, {estado.nome?.split(" ")[0]}
        </p>
        <p className="mt-2 text-[15.5px] leading-relaxed text-grafite">
          Você está inscrito em <b className="text-tinta">{titulo}</b>. Vamos avisar por e-mail se
          alguma coisa mudar.
        </p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-fosco">
          Todo e-mail que mandarmos traz um link para sair da lista, em um clique.
        </p>
      </div>
    );
  }

  return (
    <form action={agir} className="space-y-4 rounded-cartao bg-cartao p-6 shadow-cartao">
      <input type="hidden" name="chave" value={chave} />

      <Campo rotulo="Nome">
        <Texto nome="nome" valor={v.nome} obrigatorio autoFoco autoComplete="name" />
      </Campo>
      <Campo rotulo="E-mail">
        <Texto nome="email" tipo="email" valor={v.email} obrigatorio autoComplete="email" />
      </Campo>
      <Campo rotulo="Seu vínculo">
        <Selecao
          nome="vinculo"
          valor={v.vinculo ?? "COMUNIDADE_EXTERNA"}
          opcoes={VINCULOS.map((x) => ({ valor: x, rotulo: NOME_DO_VINCULO[x] }))}
        />
      </Campo>
      <Campo rotulo="Instituição" dica="Opcional.">
        <Texto nome="instituicao" valor={v.instituicao} placeholder="USP, FFLCH, outra…" />
      </Campo>

      <label className="flex items-start gap-3 rounded-folha bg-papel p-3.5">
        <input type="checkbox" name="consentimento" value="sim" required className="mt-1 h-[18px] w-[18px]" />
        <span className="text-[14px] leading-relaxed text-grafite">
          Concordo em receber por e-mail os avisos desta atividade e o boletim do Centro de Estudos
          Judaicos. Posso sair da lista quando quiser, em um clique, pelo link no rodapé de qualquer
          mensagem.
        </span>
      </label>

      {estado?.erro && <Aviso tom="erro">{estado.erro}</Aviso>}

      <button
        type="submit"
        disabled={esperando}
        className="min-h-[46px] w-full rounded-folha bg-heroi px-4 text-[16px] font-semibold text-heroi-tinta disabled:opacity-60"
      >
        {esperando ? "Um instante…" : "Confirmar inscrição"}
      </button>
    </form>
  );
}
