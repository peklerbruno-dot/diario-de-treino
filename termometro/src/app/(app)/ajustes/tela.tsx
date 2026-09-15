"use client";

import Link from "next/link";
import { useState } from "react";
import { Aviso, Botao, Campo, CampoDeValor, Linha } from "@/componentes/pecas";
import { useEstado } from "@/componentes/usar-loja";
import { hoje, partesDaData } from "@/lib/datas";
import { paraCentavos } from "@/lib/dinheiro";
import {
  ajustesDoAno,
  anosComDados,
  fixosVivos,
  guardarRateio,
  guardarSaldoInicial,
  lancamentosVivos,
  loja,
  RECADO_DA_SITUACAO,
} from "@/lib/loja";
import { NOME_DO_TIPO } from "@/lib/tipos";

export function TelaDeAjustes() {
  const estado = useEstado();
  const [ano, setAno] = useState(partesDaData(hoje()).ano);
  const ajustes = ajustesDoAno(estado, ano);
  const anos = anosComDados(estado, [partesDaData(hoje()).ano]);

  const [saldo, setSaldo] = useState(
    (ajustes.saldoInicialCents / 100).toFixed(2).replace(".", ","),
  );
  const [rateio, setRateio] = useState(String(ajustes.rateioAptoPercent));
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);

  const lancamentos = lancamentosVivos(estado);

  return (
    <div className="pb-6">
      <h1 className="text-[22px] font-semibold tracking-tight">Ajustes</h1>

      <section className="mt-5">
        <h2 className="text-[17px] font-semibold tracking-tight">Trazer a planilha</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-grafite">
          Importa um ano inteiro de uma vez, direto do arquivo do Excel.
        </p>
        <Link
          href="/importar"
          className="mt-2 inline-flex min-h-[44px] items-center rounded-folha border border-regua bg-cartao px-4 text-[17px]"
        >
          Importar planilha
        </Link>
      </section>

      <section className="mt-6">
        <h2 className="text-[17px] font-semibold tracking-tight">Saldo de abertura</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-grafite">
          Com quanto o ano começou — o número que na planilha vinha da última célula de dezembro do
          ano anterior. Tudo o mais é somado a partir daqui.
        </p>

        <label className="mt-3 block text-[15px] text-grafite">
          Ano
          <select
            value={ano}
            onChange={(e) => {
              const novo = Number(e.target.value);
              setAno(novo);
              setSaldo((ajustesDoAno(estado, novo).saldoInicialCents / 100).toFixed(2).replace(".", ","));
            }}
            className="ml-2 rounded-folha border border-regua bg-cartao px-3 py-2"
          >
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3">
          <Campo rotulo={`Saldo em 1º de janeiro de ${ano}`}>
            <CampoDeValor valor={saldo} aoMudar={setSaldo} />
          </Campo>
          <Botao
            onClick={() => {
              const cents = paraCentavos(saldo);
              if (cents !== null) guardarSaldoInicial(ano, cents);
            }}
            className="mt-2"
          >
            Salvar saldo
          </Botao>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-[17px] font-semibold tracking-tight">Rateio do apartamento</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-grafite">
          Quanto das saídas marcadas como “do apartamento” é da outra pessoa. A planilha usava 40%.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={rateio}
            onChange={(e) => setRateio(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-24 rounded-folha border border-regua bg-cartao px-4 py-3 text-[17px] tabular outline-none focus:border-saldo"
          />
          <span className="text-[17px] text-grafite">%</span>
          <Botao onClick={() => guardarRateio(Number(rateio) || 0)}>Salvar</Botao>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-[17px] font-semibold tracking-tight">Levar os dados embora</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-grafite">
          Tudo o que está aqui sai em arquivo, a qualquer momento. A planilha abre no Excel e no
          Numbers; o backup serve para guardar ou para voltar atrás.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Botao onClick={() => baixarPlanilha(estado)}>Planilha (CSV)</Botao>
          <Botao onClick={() => baixarBackup(estado)}>Backup (JSON)</Botao>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-[17px] font-semibold tracking-tight">Sincronização</h2>
        <div className="mt-2 rounded-folha border border-reguafina bg-cartao px-4 py-1">
          <Linha rotulo="Situação">
            <span className="text-[15px]">{RECADO_DA_SITUACAO[estado.situacao]}</span>
          </Linha>
          <Linha rotulo="Esperando para enviar">
            <span className="tabular text-[15px]">{estado.pendentes.length}</span>
          </Linha>
          <Linha rotulo="Lançamentos neste aparelho">
            <span className="tabular text-[15px]">{lancamentos.length}</span>
          </Linha>
          <Linha rotulo="Fixos">
            <span className="tabular text-[15px]">{fixosVivos(estado).length}</span>
          </Linha>
          <Linha rotulo="Última sincronização">
            <span className="text-[15px]">
              {estado.ultimaSincronizacao
                ? new Date(estado.ultimaSincronizacao).toLocaleString("pt-BR")
                : "ainda não"}
            </span>
          </Linha>
        </div>
        {estado.recadoDeErro && (
          <p className="mt-2 text-[13px] leading-snug text-fosco">{estado.recadoDeErro}</p>
        )}
        <Botao onClick={() => void loja.sincronizar()} className="mt-2">
          Sincronizar agora
        </Botao>
      </section>

      <section className="mt-6">
        <h2 className="text-[17px] font-semibold tracking-tight">Sair</h2>
        <form action="/sair" method="post" className="mt-2">
          <Botao submit>Sair deste aparelho</Botao>
        </form>
      </section>

      <section className="mt-8 border-t border-reguafina pt-5">
        <h2 className="text-[17px] font-semibold tracking-tight text-atencao">Apagar tudo</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-grafite">
          Apaga todos os lançamentos e fixos, aqui e no servidor. Não tem volta — baixe o backup
          antes.
        </p>
        {confirmandoApagar ? (
          <div className="mt-2 flex gap-2">
            <Botao
              tipo="perigo"
              onClick={() => {
                void loja.apagarTudo();
                setConfirmandoApagar(false);
              }}
            >
              Sim, apagar tudo
            </Botao>
            <Botao onClick={() => setConfirmandoApagar(false)}>Cancelar</Botao>
          </div>
        ) : (
          <Botao tipo="perigo" onClick={() => setConfirmandoApagar(true)} className="mt-2">
            Apagar tudo
          </Botao>
        )}
      </section>

      <div className="mt-8">
        <Aviso>
          Para instalar no iPhone: abra este endereço no <strong>Safari</strong>, toque em
          Compartilhar e escolha <strong>Adicionar à Tela de Início</strong>. O app passa a abrir em
          janela própria e continua funcionando sem internet.
        </Aviso>
      </div>
    </div>
  );
}

type EstadoDoApp = ReturnType<typeof useEstado>;

/** Uma linha por lançamento, com ";" e vírgula decimal: é como o Excel em português espera. */
function baixarPlanilha(estado: EstadoDoApp) {
  const linhas = [["Data", "Tipo", "Valor", "Nota", "Previsto", "Dinheiro seu", "Investimento", "Apartamento"]];
  for (const l of lancamentosVivos(estado).sort((a, b) => a.data.localeCompare(b.data))) {
    linhas.push([
      l.data,
      NOME_DO_TIPO[l.tipo],
      (l.valorCents / 100).toFixed(2).replace(".", ","),
      (l.nota ?? "").replace(/[;\n]/g, " "),
      l.previsto ? "sim" : "não",
      l.rendaPropria ? "sim" : "não",
      l.investimento ? "sim" : "não",
      l.apartamento ? "sim" : "não",
    ]);
  }
  // O BOM faz o Excel abrir os acentos certos.
  baixar(
    "﻿" + linhas.map((l) => l.join(";")).join("\r\n"),
    `termometro-${hoje()}.csv`,
    "text/csv;charset=utf-8",
  );
}

function baixarBackup(estado: EstadoDoApp) {
  const conteudo = JSON.stringify(
    {
      gerado: new Date().toISOString(),
      lancamentos: Object.values(estado.lancamentos),
      fixos: Object.values(estado.fixos),
      ajustes: estado.ajustes,
    },
    null,
    2,
  );
  baixar(conteudo, `termometro-backup-${hoje()}.json`, "application/json");
}

function baixar(conteudo: string, nome: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
