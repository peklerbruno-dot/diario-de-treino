/**
 * O relatório de atividades.
 *
 * O Centro presta contas do que fez — para o departamento, para a Pró-Reitoria,
 * para quem financia. Hoje isso quer dizer alguém abrir a caixa de e-mail em
 * dezembro e tentar lembrar o que aconteceu em março. Se cada atividade já foi
 * cadastrada quando estava sendo organizada, o relatório é uma consulta, não um
 * esforço de memória.
 *
 * Função pura: recebe atividades, devolve números. O banco fica de fora, e
 * `relatorio.test.ts` prende cada conta.
 */

import { nomeDoMesCompleto, mesDe, porBarras } from "./datas";
import { NOME_DO_TIPO, type EstadoDaAtividade, type TipoDeAtividade } from "./tipos";

export type AtividadeDoRelatorio = {
  id: string;
  titulo: string;
  tipo: TipoDeAtividade;
  estado: EstadoDaAtividade;
  dia: string;
  diaFinal: string | null;
  local: string | null;
  parceria: string | null;
  publicoPresente: number | null;
  responsavelNome: string | null;
  convidados: { nome: string; instituicao: string | null; funcao: string | null }[];
};

export type Resumo = {
  total: number;
  porTipo: { tipo: TipoDeAtividade; nome: string; quantidade: number }[];
  porMes: { mes: string; nome: string; quantidade: number }[];
  /** Soma do público de quem informou. */
  publicoTotal: number;
  /** Quantas atividades informaram público — sem isso, o total mente por omissão. */
  quantasInformaramPublico: number;
  quantosConvidados: number;
  /** Nomes distintos: a mesma professora em três mesas conta uma vez. */
  convidadosDistintos: number;
};

/**
 * Só o que aconteceu entra na conta.
 *
 * Uma ideia de palestra não é uma palestra, e um relatório que soma ideias é um
 * relatório que ninguém pode assinar. O filtro é aqui, num lugar só.
 */
export const entraNoRelatorio = (a: { estado: EstadoDaAtividade }) => a.estado === "REALIZADA";

export function noPeriodo<T extends { dia: string }>(itens: T[], de: string, ate: string): T[] {
  return itens.filter((i) => i.dia >= de && i.dia <= ate);
}

export function resumir(atividades: AtividadeDoRelatorio[]): Resumo {
  const porTipo = new Map<TipoDeAtividade, number>();
  const porMes = new Map<string, number>();
  const nomesDeConvidados = new Set<string>();
  let publicoTotal = 0;
  let quantasInformaramPublico = 0;
  let quantosConvidados = 0;

  for (const a of atividades) {
    porTipo.set(a.tipo, (porTipo.get(a.tipo) ?? 0) + 1);
    porMes.set(mesDe(a.dia), (porMes.get(mesDe(a.dia)) ?? 0) + 1);

    if (a.publicoPresente != null) {
      publicoTotal += a.publicoPresente;
      quantasInformaramPublico++;
    }
    for (const c of a.convidados) {
      quantosConvidados++;
      nomesDeConvidados.add(c.nome.trim().toLocaleLowerCase("pt-BR"));
    }
  }

  return {
    total: atividades.length,
    porTipo: [...porTipo.entries()]
      .map(([tipo, quantidade]) => ({ tipo, nome: NOME_DO_TIPO[tipo], quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR")),
    porMes: [...porMes.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, quantidade]) => ({ mes, nome: nomeDoMesCompleto(mes), quantidade })),
    publicoTotal,
    quantasInformaramPublico,
    quantosConvidados,
    convidadosDistintos: nomesDeConvidados.size,
  };
}

/**
 * A planilha do relatório.
 *
 * `;` como separador e não `,`: é o que o Excel e o Numbers em português
 * esperam. Com vírgula, a planilha inteira chega numa coluna só.
 */
export function paraPlanilha(atividades: AtividadeDoRelatorio[]): string {
  const cabecalho = [
    "Data", "Data final", "Tipo", "Título", "Local", "Responsável",
    "Convidados", "Parceria", "Público",
  ];

  const celula = (valor: string | number | null) => {
    const texto = valor == null ? "" : String(valor);
    // Aspas dentro de célula dobram; o resto entra entre aspas e fica em paz.
    return `"${texto.replace(/"/g, '""')}"`;
  };

  const linhas = atividades.map((a) =>
    [
      porBarras(a.dia),
      a.diaFinal ? porBarras(a.diaFinal) : "",
      NOME_DO_TIPO[a.tipo],
      a.titulo,
      a.local,
      a.responsavelNome,
      a.convidados
        .map((c) => (c.instituicao ? `${c.nome} (${c.instituicao})` : c.nome))
        .join(", "),
      a.parceria,
      a.publicoPresente,
    ]
      .map(celula)
      .join(";"),
  );

  // O BOM na frente é o que faz o Excel abrir o arquivo já entendendo os
  // acentos. Sem ele, "Simpósio" vira "SimpÃ³sio" na tela de quem abrir.
  return "﻿" + [cabecalho.map(celula).join(";"), ...linhas].join("\r\n") + "\r\n";
}
