"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  conferirPlanilha, gravarImportacao,
  type Conferencia, type ResultadoDaImportacao,
} from "../acoes";
import { EXPLICACAO_DO_PROBLEMA } from "@/lib/planilha";
import { NOME_DO_VINCULO, type VinculoDoContato } from "@/lib/contatos";
import { Aviso, Botao, BotaoLink, Campo, Cartao, Selo, Sobrescrito, Subtitulo, Texto } from "@/componentes/pecas";

/**
 * A importação, em duas etapas separadas por uma conferência.
 *
 * A primeira lê e mostra; a segunda grava. Entre as duas há uma tela inteira
 * dizendo o que o sistema entendeu de cada coluna, quem já está na base e o que
 * vai ficar de fora e por quê. É a diferença entre uma importação que se
 * confirma e uma que se desfaz depois, contato por contato.
 */
export function TelaDeImportacao() {
  const [conferencia, conferir, conferindo] = useActionState(conferirPlanilha, null as Conferencia | null);
  const [resultado, gravar, gravando] = useActionState(gravarImportacao, null as ResultadoDaImportacao);

  if (resultado && !resultado.erro) {
    return (
      <Cartao className="max-w-2xl p-6">
        <Subtitulo>Pronto</Subtitulo>
        <p className="mt-2 text-[15.5px] leading-relaxed text-grafite">
          {resultado.novos} {resultado.novos === 1 ? "contato novo" : "contatos novos"} e{" "}
          {resultado.atualizados} {resultado.atualizados === 1 ? "atualizado" : "atualizados"}.
        </p>
        <div className="mt-5 flex gap-3">
          <BotaoLink href="/contatos" tipo="primario">Ver a base</BotaoLink>
          <BotaoLink href="/contatos/importar">Importar outra planilha</BotaoLink>
        </div>
      </Cartao>
    );
  }

  const linhas = conferencia?.linhas ?? [];
  const bons = linhas.filter((l) => !l.problema);
  const novos = bons.filter((l) => !l.jaExiste).length;
  const atualizados = bons.length - novos;
  const problemas = linhas.filter((l) => l.problema);

  // --- etapa 1: escolher o arquivo ------------------------------------------
  if (!conferencia || conferencia.erro) {
    return (
      <form action={conferir} className="max-w-2xl space-y-5">
        <fieldset className="space-y-4 rounded-cartao bg-cartao p-5 shadow-cartao">
          <Campo
            rotulo="A planilha"
            dica="Aceita .xlsx, .xls e .csv. Do Google Sheets: Arquivo → Fazer download → Valores separados por vírgula."
          >
            <input
              type="file"
              name="arquivo"
              accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              className="mt-1.5 w-full rounded-folha border border-regua bg-cartao px-3.5 py-2.5 text-[14px] file:mr-3 file:rounded-folha file:border-0 file:bg-papel file:px-3 file:py-1.5 file:text-[14px]"
            />
          </Campo>

          <Campo
            rotulo="De onde veio esta lista"
            dica="Fica guardado em cada contato. É a resposta para 'por que temos o e-mail desta pessoa?'."
          >
            <Texto nome="origem" placeholder="Inscrições do ciclo de palestras de 2025" />
          </Campo>

          <Campo rotulo="Etiquetar todos com" dica="Separadas por vírgula. Opcional.">
            <Texto nome="etiquetas" placeholder="ciclo 2025" />
          </Campo>

          <label className="flex items-start gap-3 rounded-folha bg-papel p-3.5">
            <input type="checkbox" name="consentimento" value="sim" className="mt-1 h-[18px] w-[18px]" />
            <span className="text-[14px] leading-relaxed text-grafite">
              <b className="text-tinta">Estas pessoas concordaram em receber os boletins do Centro.</b>
              <br />
              Marque só se for verdade — se elas se inscreveram numa atividade, assinaram uma lista
              ou pediram para ser avisadas. Sem a marca, os contatos entram na base e ficam de fora
              dos envios até alguém confirmar. Uma lista comprada ou raspada de um site não vira
              consentimento por ser importada aqui, e disparar para ela derruba a conta de envio do
              Centro inteira.
            </span>
          </label>
        </fieldset>

        {conferencia?.erro && <Aviso tom="erro">{conferencia.erro}</Aviso>}

        <Botao tipo="primario" disabled={conferindo}>
          {conferindo ? "Lendo a planilha…" : "Ler e conferir"}
        </Botao>
      </form>
    );
  }

  // --- etapa 2: conferir e gravar -------------------------------------------
  return (
    <div className="space-y-5">
      <Cartao className="p-5">
        <Sobrescrito>O que eu entendi</Sobrescrito>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
          {conferencia.colunas?.map((c) => (
            <li key={c.campo}>
              <span className="text-fosco">{c.coluna}</span> → <b>{c.campo}</b>
            </li>
          ))}
        </ul>
        {conferencia.naoReconhecidas && conferencia.naoReconhecidas.length > 0 && (
          <p className="mt-3 text-[13px] leading-relaxed text-fosco">
            Colunas que eu não soube ler, e que vão ficar de fora:{" "}
            {conferencia.naoReconhecidas.map((c) => `"${c}"`).join(", ")}. Se alguma delas importa,
            renomeie na planilha e leia de novo.
          </p>
        )}
      </Cartao>

      <div className="grid gap-4 sm:grid-cols-3">
        <Conta rotulo="Vão entrar" valor={novos} />
        <Conta rotulo="Já estão na base" valor={atualizados} detalhe="serão atualizados, não duplicados" />
        <Conta rotulo="Ficam de fora" valor={problemas.length} />
      </div>

      {problemas.length > 0 && (
        <Cartao como="section">
          <h2 className="sobrescrito border-b border-linha px-4 py-2.5">
            As linhas que eu não consigo aproveitar
          </h2>
          <ul className="max-h-[260px] overflow-y-auto">
            {problemas.map((l) => (
              <li key={l.linha} className="flex flex-wrap items-baseline gap-x-3 border-b border-linha px-4 py-2 text-[13.5px] last:border-b-0">
                <span className="tabular w-[70px] shrink-0 text-fosco">linha {l.linha}</span>
                <span className="min-w-0 flex-1">{l.nome || "(sem nome)"} · {l.email || "(sem e-mail)"}</span>
                <span className="text-vermelho">{EXPLICACAO_DO_PROBLEMA[l.problema!]}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-linha px-4 py-2.5 text-[13px] leading-relaxed text-fosco">
            Elas não impedem a importação: o resto entra normalmente. Para aproveitá-las, arrume na
            planilha e importe de novo — quem já tiver entrado será atualizado, não duplicado.
          </p>
        </Cartao>
      )}

      <Cartao como="section">
        <h2 className="sobrescrito border-b border-linha px-4 py-2.5">
          O que vai ser gravado · {bons.length}
        </h2>
        <ul className="max-h-[360px] overflow-y-auto">
          {bons.slice(0, 200).map((l) => (
            <li key={l.linha} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-linha px-4 py-2 text-[13.5px] last:border-b-0">
              <span className="min-w-[180px] flex-1">
                <b>{l.nome}</b> <span className="text-fosco">{l.email}</span>
              </span>
              <span className="text-[12.5px] text-fosco">
                {NOME_DO_VINCULO[l.vinculo as VinculoDoContato]}
                {l.instituicao ? ` · ${l.instituicao}` : ""}
              </span>
              {l.etiquetas.map((e) => <Selo key={e} cor="var(--fosco)">{e}</Selo>)}
              {l.jaExiste && <Selo cor="var(--tinta-azul)">já na base</Selo>}
            </li>
          ))}
        </ul>
        {bons.length > 200 && (
          <p className="border-t border-linha px-4 py-2 text-[13px] text-fosco">
            …e mais {bons.length - 200}. A lista aqui é só para conferir; todos serão gravados.
          </p>
        )}
      </Cartao>

      <form action={gravar} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="linhas" value={JSON.stringify(linhas)} />
        <input type="hidden" name="origem" value={conferencia.origem ?? ""} />
        <input type="hidden" name="etiquetas" value={conferencia.etiquetas ?? ""} />
        <input type="hidden" name="consentimento" value={conferencia.consentimento ? "sim" : ""} />

        <Botao tipo="primario" disabled={gravando || bons.length === 0}>
          {gravando ? "Gravando…" : `Gravar ${bons.length} ${bons.length === 1 ? "contato" : "contatos"}`}
        </Botao>
        <Link href="/contatos/importar" className="text-[14px] text-realce hover:underline">
          escolher outro arquivo
        </Link>

        <span className="w-full text-[13px] text-fosco">
          {conferencia.consentimento
            ? "Os contatos vão entrar com consentimento registrado e poderão receber boletins."
            : "Os contatos vão entrar sem consentimento e ficarão de fora dos envios até alguém confirmar."}
        </span>
      </form>

      {resultado?.erro && <Aviso tom="erro">{resultado.erro}</Aviso>}
    </div>
  );
}

function Conta({ rotulo, valor, detalhe }: { rotulo: string; valor: number; detalhe?: string }) {
  return (
    <Cartao className="p-4">
      <Sobrescrito>{rotulo}</Sobrescrito>
      <p className="tabular mt-1 font-titulo text-[28px] font-semibold leading-none">{valor}</p>
      {detalhe && <p className="mt-1.5 text-[12.5px] leading-snug text-fosco">{detalhe}</p>}
    </Cartao>
  );
}
