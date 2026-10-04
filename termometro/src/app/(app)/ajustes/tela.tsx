"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Aviso,
  Botao,
  Campo,
  CampoDeTexto,
  CampoDeValor,
  Cartao,
  Linha,
  Sobrescrito,
  Subtitulo,
  Titulo,
} from "@/componentes/pecas";
import { buscarAVersaoNova } from "@/componentes/casca";
import { EditorDeAtalhos } from "@/componentes/editor-de-atalhos";
import { MeuAcesso, PessoasDoApp } from "@/componentes/pessoas";
import { useEstado } from "@/componentes/usar-loja";
import { hoje, partesDaData } from "@/lib/datas";
import { paraCentavos } from "@/lib/dinheiro";
import {
  ajustesDoAno,
  anosComDados,
  saldoInicialExplicito,
  saldosIniciaisDigitados,
  rateioApto,
  arredondarTudo,
  categoriasDe,
  guardarCategorias,
  fixosVivos,
  guardarRateio,
  guardarSaldoInicial,
  lancamentosVivos,
  loja,
  quantosComCentavos,
  RECADO_DA_SITUACAO,
  VERSAO_DO_APP,
} from "@/lib/loja";
import { categoriasDoTipo, idDoNome, type Categoria } from "@/lib/categorias";
import { quantosSemCategoria } from "@/lib/classificar";
import { calcularAnoEncadeado } from "@/lib/calculo";
import { NOME_DO_TIPO, TIPOS, type Tipo } from "@/lib/tipos";

export function TelaDeAjustes() {
  const estado = useEstado();
  const [ano, setAno] = useState(partesDaData(hoje()).ano);
  const ajustes = ajustesDoAno(estado, ano);
  const anos = anosComDados(estado, [partesDaData(hoje()).ano]);

  // O campo mostra o saldo que o app REALMENTE usa para o ano: o digitado, ou
  // o herdado do fechamento do ano anterior. Mostrar "0,00" para um ano
  // herdado convidava a tocar em Salvar e zerar a corrente sem querer.
  const emUso = (a: number) => {
    const explicito = saldoInicialExplicito(estado, a);
    if (explicito !== null) return { cents: explicito, herdado: false };
    const calculado = calcularAnoEncadeado({
      ano: a,
      lancamentos: lancamentosVivos(estado),
      saldosIniciais: saldosIniciaisDigitados(estado),
      rateioAptoPercent: rateioApto(estado),
    });
    return { cents: calculado.saldoInicialCents, herdado: true };
  };
  const [saldo, setSaldo] = useState((emUso(ano).cents / 100).toFixed(2).replace(".", ","));
  const [erroSaldo, setErroSaldo] = useState<string | null>(null);
  const saldoHerdado = emUso(ano).herdado;
  const [rateio, setRateio] = useState(String(ajustes.rateioAptoPercent));
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);

  const lancamentos = lancamentosVivos(estado);
  const ehDono = estado.usuario?.ehDono ?? false;

  return (
    <div className="pb-6">
      <Sobrescrito>O app</Sobrescrito>
      <Titulo className="mt-0.5">Ajustes</Titulo>

      <section className="mt-5">
        <Subtitulo>Trazer a planilha</Subtitulo>
        <p className="mt-1 text-[15px] leading-relaxed text-grafite">
          Importa um ano inteiro de uma vez, direto do arquivo do Excel.
        </p>
        <Link
          href="/importar"
          className="mt-2 inline-flex min-h-[46px] items-center rounded-folha bg-cartao px-4 text-[16px] shadow-baixa"
        >
          Importar planilha
        </Link>
      </section>

      <section className="mt-6">
        <Subtitulo>Saldo de abertura</Subtitulo>
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
              setSaldo((emUso(novo).cents / 100).toFixed(2).replace(".", ","));
              setErroSaldo(null);
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
          <Campo
            rotulo={`Saldo em 1º de janeiro de ${ano}`}
            dica={
              saldoHerdado
                ? `Herdado do fechamento de ${ano - 1}. Salvar aqui fixa este valor e interrompe a herança.`
                : undefined
            }
          >
            <CampoDeValor
              valor={saldo}
              aoMudar={(v) => {
                setSaldo(v);
                setErroSaldo(null);
              }}
            />
          </Campo>
          {erroSaldo && (
            <p role="alert" className="mt-2 text-[14px] text-atencao">
              {erroSaldo}
            </p>
          )}
          <Botao
            onClick={() => {
              const cents = paraCentavos(saldo);
              if (cents === null) {
                // Recusar em silêncio parecia "salvou": o leigo saía achando
                // que o saldo tinha entrado.
                setErroSaldo("Não entendi o valor. Digite só o número, como 1500 ou 1.500,00.");
                return;
              }
              guardarSaldoInicial(ano, cents);
              setSaldo((cents / 100).toFixed(2).replace(".", ","));
            }}
            className="mt-2"
          >
            Salvar saldo
          </Botao>
        </div>
      </section>

      <section className="mt-6">
        <Subtitulo>Rateio do apartamento</Subtitulo>
        <p className="mt-1 text-[15px] leading-relaxed text-grafite">
          {ehDono
            ? "Quanto das saídas marcadas como “do apartamento” é da outra pessoa. A planilha usava 40%."
            : "Se você divide a casa, marque as contas dela como “do apartamento” e diga aqui quanto é da outra pessoa. Sem divisão, deixe 0%."}
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

      <Categorias estado={estado} />

      <EditorDeAtalhos estado={estado} />

      <Classificar estado={estado} />

      <ArrumarOsCentavos estado={estado} />

      <section className="mt-6">
        <Subtitulo>Levar os dados embora</Subtitulo>
        <p className="mt-1 text-[15px] leading-relaxed text-grafite">
          Tudo o que está aqui sai em arquivo, a qualquer momento. A planilha abre no Excel e no
          Numbers; o backup volta inteiro por “Importar planilha”, quando precisar.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Botao onClick={() => baixarPlanilha(estado)}>Planilha (CSV)</Botao>
          <Botao onClick={() => baixarBackup(estado)}>Backup (JSON)</Botao>
        </div>
      </section>

      <section className="mt-6">
        <Subtitulo>Atalho do iPhone</Subtitulo>
        <p className="mt-1 text-[15px] leading-relaxed text-grafite">
          Dá para lançar um gasto sem abrir o app — por dois toques na traseira do aparelho, por um
          ícone na tela ou pedindo à Siri. O passo a passo inteiro, com o endereço já preenchido,
          está aqui dentro:
        </p>
        <Link
          href="/atalho"
          className="mt-2 inline-flex min-h-[46px] items-center rounded-folha bg-cartao px-4 text-[16px] shadow-baixa"
        >
          Como montar o atalho
        </Link>
      </section>

      {estado.usuario && (ehDono ? <PessoasDoApp /> : <MeuAcesso />)}

      <section className="mt-6">
        <Subtitulo>Sincronização</Subtitulo>
        <Cartao className="mt-2 px-4 py-1">
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
        </Cartao>
        {estado.recadoDeErro && (
          <p className="mt-2 text-[13px] leading-snug text-fosco">{estado.recadoDeErro}</p>
        )}
        <Botao onClick={() => void loja.sincronizar()} className="mt-2">
          Sincronizar agora
        </Botao>
      </section>

      <section className="mt-6">
        <Subtitulo>Versão do app</Subtitulo>
        <p className="mt-1 text-[15px] leading-relaxed text-grafite">
          O app se atualiza sozinho quando sai uma versão nova. Se algum dia parecer preso numa
          versão antiga, este botão limpa a cópia guardada no aparelho e busca a de agora — sem
          perder nada do que você lançou.
        </p>
        <p className="tabular mt-1.5 text-[12.5px] text-fosco">
          Versão neste aparelho: {VERSAO_DO_APP}
        </p>
        <Botao onClick={() => void buscarAVersaoNova()} className="mt-2">
          Buscar a versão nova
        </Botao>
      </section>

      <section className="mt-6">
        <Subtitulo>Sair</Subtitulo>
        <form action="/sair" method="post" className="mt-2">
          <Botao submit>Sair deste aparelho</Botao>
        </form>
      </section>

      <section className="mt-8 border-t border-regua pt-5">
        <Subtitulo className="text-atencao">Apagar tudo</Subtitulo>
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
          janela própria, sem barra de endereço, e continua funcionando sem internet.
          <span className="mt-2 block">
            Se você já tem o ícone e ele ainda abre com a barra do navegador, apague o ícone e
            adicione de novo. O iPhone guarda os ajustes do app na hora em que ele é instalado, e um
            ícone antigo carrega os ajustes antigos — inclusive os que faziam essa barra aparecer.
          </span>
        </Aviso>
      </div>
    </div>
  );
}

/**
 * O convite para classificar o passado.
 *
 * Só aparece enquanto sobrar o que classificar, e some sozinho quando acabar —
 * em vez de virar um item permanente em Ajustes anunciando uma tarefa que já
 * foi feita.
 */
function Classificar({ estado }: { estado: EstadoDoApp }) {
  const faltam = quantosSemCategoria(lancamentosVivos(estado));
  if (faltam === 0) return null;

  return (
    <section className="mt-6">
      <Subtitulo>Classificar o que veio da planilha</Subtitulo>
      <p className="mt-1 text-[15px] leading-relaxed text-grafite">
        {faltam} lançamentos ainda estão sem categoria — é como eles nasceram, porque a planilha não
        guardava isso. Juntados por nota, viram poucas decisões.
      </p>
      <Link
        href="/classificar"
        className="mt-2 inline-flex min-h-[46px] items-center rounded-folha bg-cartao px-4 text-[16px] shadow-baixa"
      >
        Classificar agora
      </Link>
    </section>
  );
}

/**
 * A lista de categorias, editável.
 *
 * Ela começa preenchida de propósito — uma tela vazia pedindo que alguém
 * invente um sistema de classificação antes de poder lançar um almoço é o jeito
 * mais seguro de ninguém classificar nada. O que está ali é palpite meu, e todo
 * palpite precisa poder ser desfeito.
 *
 * Apagar uma categoria não mexe no passado: o lançamento guarda o identificador
 * dela, e os totais continuam mostrando o nome. Ela só some da lista de
 * escolha.
 */
function Categorias({ estado }: { estado: EstadoDoApp }) {
  const categorias = categoriasDe(estado);
  const [nova, setNova] = useState("");
  const [tiposDaNova, setTiposDaNova] = useState<Tipo[]>(["DIARIO"]);
  const [erro, setErro] = useState<string | null>(null);

  function acrescentar() {
    const nome = nova.trim();
    if (!nome) return;
    if (tiposDaNova.length === 0) {
      setErro("Escolha ao menos uma coluna.");
      return;
    }
    const id = idDoNome(nome);
    if (categorias.some((c) => c.id === id)) {
      setErro(`Já existe uma categoria chamada “${nome}”.`);
      return;
    }
    guardarCategorias([...categorias, { id, nome, tipos: tiposDaNova }]);
    setNova("");
    setErro(null);
  }

  const apagar = (id: string) => guardarCategorias(categorias.filter((c) => c.id !== id));

  /**
   * Renomear troca só o nome, nunca o identificador.
   *
   * É o identificador que está gravado em cada lançamento: mexer nele
   * desligaria a categoria de todo o passado dela. Assim, corrigir "Mercado"
   * para "Supermercado" renomeia também nos totais de janeiro.
   */
  // Só persiste nome de verdade. Um campo momentaneamente vazio (a pessoa
  // selecionou tudo para reescrever) apagava a categoria na hora: a leitura
  // descarta categoria sem nome, e o próximo salvamento a sumia para sempre.
  const renomear = (id: string, nome: string) => {
    if (!nome.trim()) return;
    guardarCategorias(categorias.map((c) => (c.id === id ? { ...c, nome: nome.trim() } : c)));
  };

  function alternarTipo(c: Categoria, tipo: Tipo) {
    const tipos = c.tipos.includes(tipo) ? c.tipos.filter((t) => t !== tipo) : [...c.tipos, tipo];
    if (tipos.length === 0) return; // sem coluna nenhuma ela não apareceria em lugar algum
    guardarCategorias(categorias.map((x) => (x.id === c.id ? { ...x, tipos } : x)));
  }

  return (
    <section className="mt-6">
      <Subtitulo>Categorias</Subtitulo>
      <p className="mt-1 text-[15px] leading-relaxed text-grafite">
        Para onde o dinheiro vai, e o que a aba <strong>Totais</strong> soma. Cada uma vale nas
        colunas marcadas — “transporte” é diário quando é o aplicativo e saída quando é o seguro.
      </p>

      <Cartao className="mt-3 px-4 py-1">
        {categorias.map((c) => (
          <div key={c.id} className="border-b border-linha py-3 last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <NomeDaCategoria categoria={c} aoRenomear={(nome) => renomear(c.id, nome)} />
              <ApagarComCerteza nome={c.nome} aoApagar={() => apagar(c.id)} />
            </div>
            <div className="mt-1.5 flex gap-1.5">
              {TIPOS.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={c.tipos.includes(t)}
                  onClick={() => alternarTipo(c, t)}
                  className={`min-h-[30px] rounded-full px-3 text-[12.5px] ${
                    c.tipos.includes(t) ? "bg-saldo font-medium text-white" : "bg-papel text-fosco"
                  }`}
                >
                  {NOME_DO_TIPO[t]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Cartao>

      <div className="mt-3">
        <Campo rotulo="Nova categoria">
          <CampoDeTexto valor={nova} aoMudar={setNova} placeholder="farmácia" maxLength={40} />
        </Campo>
        <div className="mt-2 flex gap-1.5">
          {TIPOS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tiposDaNova.includes(t)}
              onClick={() =>
                setTiposDaNova((atual) =>
                  atual.includes(t) ? atual.filter((x) => x !== t) : [...atual, t],
                )
              }
              className={`min-h-[34px] flex-1 rounded-full text-[13px] ${
                tiposDaNova.includes(t)
                  ? "bg-saldo font-medium text-white"
                  : "bg-cartao shadow-baixa"
              }`}
            >
              {NOME_DO_TIPO[t]}
            </button>
          ))}
        </div>
        {erro && (
          <p role="alert" className="mt-2 text-[14px] text-atencao">
            {erro}
          </p>
        )}
        <Botao onClick={acrescentar} className="mt-2">
          Acrescentar
        </Botao>
      </div>

      <p className="mt-2 text-[12.5px] leading-snug text-fosco">
        Apagar uma categoria não mexe nos lançamentos antigos: eles continuam contando nos totais,
        com o mesmo nome. Ela só deixa de aparecer na hora de escolher.
      </p>
    </section>
  );
}

/**
 * O campo de nome com memória própria: o que se digita fica local, e só vai
 * para a lista (que sincroniza) ao sair do campo, com nome não vazio. Digitar
 * direto na lista fazia cada tecla virar um salvamento — e um instante de campo
 * vazio apagava a categoria.
 */
function NomeDaCategoria({
  categoria,
  aoRenomear,
}: {
  categoria: Categoria;
  aoRenomear: (nome: string) => void;
}) {
  const [nome, setNome] = useState(categoria.nome);
  // Se o nome mudou por fora (renomeado no outro aparelho, sincronizado agora),
  // o campo acompanha — em vez de regravar o nome velho por cima no próximo
  // blur.
  const [nomeVisto, setNomeVisto] = useState(categoria.nome);
  if (categoria.nome !== nomeVisto) {
    setNomeVisto(categoria.nome);
    setNome(categoria.nome);
  }

  return (
    <input
      value={nome}
      maxLength={40}
      onChange={(e) => setNome(e.target.value)}
      onBlur={() => {
        if (!nome.trim()) {
          setNome(categoria.nome); // vazio não vale: volta o que era
        } else if (nome.trim() !== categoria.nome) {
          aoRenomear(nome); // só grava se mudou de verdade
        }
      }}
      aria-label={`Nome da categoria ${categoria.nome}`}
      className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none focus:underline"
    />
  );
}

/**
 * Apagar em dois toques. Um toque só, num alvo de 20px colado no campo de
 * nome, apagava categoria por acidente — e não havia desfazer.
 */
function ApagarComCerteza({ nome, aoApagar }: { nome: string; aoApagar: () => void }) {
  const [confirmando, setConfirmando] = useState(false);

  if (confirmando) {
    return (
      <span className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={aoApagar}
          className="min-h-[40px] rounded-full bg-cartao px-3 text-[13px] font-medium text-atencao shadow-baixa"
        >
          Apagar mesmo
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="min-h-[40px] px-2 text-[13px] text-grafite"
        >
          Deixa
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      aria-label={`Apagar a categoria ${nome}`}
      className="min-h-[40px] shrink-0 px-3 text-[13px] text-atencao"
    >
      Apagar
    </button>
  );
}

/**
 * O pente nos centavos antigos.
 *
 * Só aparece enquanto houver o que arrumar: passado o pente, a seção some
 * sozinha e não vira mais um botão perigoso morando em Ajustes para sempre.
 *
 * O backup é baixado antes, e não oferecido depois. Quem clica num botão que
 * diz "não tem volta" já decidiu; parar para explicar que seria bom guardar uma
 * cópia é conselho chegando tarde.
 */
function ArrumarOsCentavos({ estado }: { estado: EstadoDoApp }) {
  const [confirmando, setConfirmando] = useState(false);
  const [recado, setRecado] = useState<string | null>(null);
  const quantos = quantosComCentavos(estado);

  if (quantos === 0 && !recado) return null;

  function arrumar() {
    baixarBackup(estado);
    const { lancamentos, fixos } = arredondarTudo();
    setConfirmando(false);
    setRecado(
      lancamentos + fixos === 0
        ? "Não havia nada com centavos."
        : `Arredondei ${lancamentos} lançamento${lancamentos === 1 ? "" : "s"}` +
            (fixos > 0 ? ` e ${fixos} fixo${fixos === 1 ? "" : "s"}` : "") +
            ". O backup de antes está na pasta de downloads.",
    );
  }

  return (
    <section className="mt-6">
      <Subtitulo>Centavos que sobraram</Subtitulo>
      {recado ? (
        <p className="mt-2 text-[15px] leading-relaxed text-grafite" role="status">
          {recado}
        </p>
      ) : (
        <>
          <p className="mt-1 text-[15px] leading-relaxed text-grafite">
            {quantos} valor{quantos === 1 ? "" : "es"} ainda tem centavos, da época da planilha. O
            app hoje só trabalha com reais inteiros, e enquanto os dois convivem um rodapé pode
            fechar um real fora do que a coluna mostra.
          </p>
          {confirmando ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Botao tipo="primario" onClick={arrumar}>
                Baixar backup e arredondar
              </Botao>
              <Botao onClick={() => setConfirmando(false)}>Cancelar</Botao>
            </div>
          ) : (
            <Botao onClick={() => setConfirmando(true)} className="mt-2">
              Arredondar tudo
            </Botao>
          )}
          <p className="mt-2 text-[13px] leading-snug text-fosco">
            Não tem desfazer. O backup é baixado sozinho antes de qualquer alteração, e volta por
            “Importar planilha” se precisar.
          </p>
        </>
      )}
    </section>
  );
}

type EstadoDoApp = ReturnType<typeof useEstado>;

/** Uma linha por lançamento, com ";" e vírgula decimal: é como o Excel em português espera. */
function baixarPlanilha(estado: EstadoDoApp) {
  const linhas = [
    ["Data", "Tipo", "Valor", "Nota", "Previsto", "Dinheiro seu", "Investimento", "Apartamento"],
  ];
  for (const l of lancamentosVivos(estado).sort((a, b) => a.data.localeCompare(b.data))) {
    linhas.push([
      l.data,
      NOME_DO_TIPO[l.tipo],
      (l.valorCents / 100).toFixed(2).replace(".", ","),
      l.nota ?? "",
      l.previsto ? "sim" : "não",
      l.rendaPropria ? "sim" : "não",
      l.investimento ? "sim" : "não",
      l.apartamento ? "sim" : "não",
    ]);
  }
  // O BOM faz o Excel abrir os acentos certos.
  baixar(
    "﻿" + linhas.map((l) => l.map(campoCsv).join(";")).join("\r\n"),
    `financas-do-bp-${hoje()}.csv`,
    "text/csv;charset=utf-8",
  );
}

/**
 * Escapa um campo do jeito que o CSV manda (RFC 4180): aspas em volta quando há
 * ; aspas ou quebra de linha, e aspas internas dobradas. A higienização antiga
 * só trocava ; e \n por espaço — uma nota começando com aspas desalinhava o
 * arquivo inteiro dali para baixo.
 */
function campoCsv(texto: string): string {
  const limpo = texto.replace(/\r?\n|\r/g, " ");
  return /[;"]/.test(limpo) ? `"${limpo.replace(/"/g, '""')}"` : limpo;
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
  baixar(conteudo, `financas-do-bp-backup-${hoje()}.json`, "application/json");
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
