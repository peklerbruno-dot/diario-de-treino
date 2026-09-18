"use client";

import { useActionState } from "react";
import { salvarBoletim, type RespostaDoBoletim } from "../acoes";
import { NOME_DO_VINCULO, VINCULOS } from "@/lib/contatos";
import { NOME_DO_TIPO, type TipoDeAtividade } from "@/lib/tipos";
import { curto } from "@/lib/datas";
import { AreaDeTexto, Aviso, Botao, Campo, Cartao, Selecao, Sobrescrito, Subtitulo, Texto } from "@/componentes/pecas";

export function Redacao({
  boletim,
  atividades,
  etiquetas,
}: {
  boletim: {
    id: string;
    assunto: string;
    corpo: string;
    filtroVinculo: string | null;
    filtroEtiquetaId: string | null;
    escolhidas: string[];
  };
  atividades: {
    id: string; titulo: string; tipo: string; dia: string; hora: string | null; local: string | null;
  }[];
  etiquetas: { id: string; nome: string; quantos: number }[];
}) {
  const [estado, agir, esperando] = useActionState(salvarBoletim, null as RespostaDoBoletim);

  return (
    <form action={agir} className="space-y-5">
      <input type="hidden" name="id" value={boletim.id} />

      <Cartao className="p-5">
        <Campo rotulo="Assunto" dica="É a linha que a pessoa lê na caixa de entrada, e o que decide se ela abre.">
          <Texto nome="assunto" valor={boletim.assunto} obrigatorio maximo={120} />
        </Campo>

        <div className="mt-4">
          <Campo
            rotulo="Texto"
            dica="Linha em branco separa parágrafo. As atividades escolhidas abaixo entram sozinhas depois do texto — não precisa redigitar data e local."
          >
            <AreaDeTexto
              nome="corpo"
              valor={boletim.corpo}
              linhas={10}
              placeholder={"Caros,\n\nO Centro de Estudos Judaicos convida para as atividades deste mês."}
            />
          </Campo>
        </div>
      </Cartao>

      <Cartao como="section">
        <div className="border-b border-linha px-4 py-3">
          <Subtitulo>Atividades no boletim</Subtitulo>
          <p className="mt-0.5 text-[13px] leading-relaxed text-grafite">
            Só aparecem as que estão marcadas como aprovada, em preparação ou divulgação, daqui para
            a frente. Data, hora e local vêm do cadastro — assim não há como o boletim anunciar um
            horário que mudou.
          </p>
        </div>

        {atividades.length === 0 ? (
          <p className="px-4 py-3 text-[14px] text-fosco">
            Nenhuma atividade futura cadastrada para anunciar.
          </p>
        ) : (
          <ul>
            {atividades.map((a) => (
              <li key={a.id} className="border-b border-linha last:border-b-0">
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-linha/60">
                  <input
                    type="checkbox"
                    name="atividades"
                    value={a.id}
                    defaultChecked={boletim.escolhidas.includes(a.id)}
                    className="h-[18px] w-[18px]"
                  />
                  <span className="tabular w-[62px] shrink-0 text-[12.5px] text-fosco">{curto(a.dia)}</span>
                  <span className="min-w-0 flex-1 text-[14.5px]">
                    {a.titulo}
                    <span className="block text-[12.5px] text-fosco">
                      {NOME_DO_TIPO[a.tipo as TipoDeAtividade]}
                      {a.hora ? ` · ${a.hora}` : ""}
                      {a.local ? ` · ${a.local}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao className="p-5">
        <Sobrescrito>Para quem</Sobrescrito>
        <p className="mt-1.5 max-w-leitura text-[13.5px] leading-relaxed text-grafite">
          Sem escolher nada, vai para a base inteira — quer dizer, para todo mundo que está ativo e
          tem consentimento registrado. Os dois filtros se somam.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Vínculo">
            <Selecao
              nome="filtroVinculo"
              valor={boletim.filtroVinculo}
              vazio="— qualquer um —"
              opcoes={VINCULOS.map((v) => ({ valor: v, rotulo: NOME_DO_VINCULO[v] }))}
            />
          </Campo>
          <Campo rotulo="Etiqueta">
            <Selecao
              nome="filtroEtiquetaId"
              valor={boletim.filtroEtiquetaId}
              vazio="— qualquer uma —"
              opcoes={etiquetas.map((e) => ({ valor: e.id, rotulo: `${e.nome} (${e.quantos})` }))}
            />
          </Campo>
        </div>
      </Cartao>

      {estado?.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      {estado?.recado && <Aviso tom="bom">{estado.recado}</Aviso>}

      <Botao tipo="primario" disabled={esperando}>
        {esperando ? "Guardando…" : "Guardar o rascunho"}
      </Botao>
    </form>
  );
}
