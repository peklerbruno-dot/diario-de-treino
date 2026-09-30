"use client";

import { CHAVE_DOS_ATALHOS, escreverAtalhos, lerAtalhos, type AtalhoFixo } from "./atalhos";
import {
  CHAVE_DAS_CATEGORIAS,
  escreverCategorias,
  lerCategorias,
  type Categoria,
} from "./categorias";
import { hoje as dataDeHoje } from "./datas";
import { aoReal, comCifrao } from "./dinheiro";
import type { Ajustes, Fixo, Lancamento, Tipo } from "./tipos";
import { AJUSTES_PADRAO } from "./tipos";

/**
 * O estado do app dentro do aparelho.
 *
 * O app não pergunta ao servidor a cada tela: ele tem o ano inteiro na mão e
 * faz as contas ali mesmo. São umas centenas de linhas por ano — cabe de sobra,
 * e é o que faz a tela abrir instantânea no metrô, sem sinal.
 *
 * O servidor entra depois: de tempos em tempos o aparelho manda o que mudou
 * aqui e recebe o que mudou lá. Enquanto não dá (sem sinal, avião, elevador), o
 * que você escreveu fica na fila e sobe sozinho quando a internet volta. Nada
 * do que você digitou depende de a rede estar boa naquele segundo.
 */

const CHAVE = "termometro.v2";
const ESPERA_ANTES_DE_SINCRONIZAR_MS = 1500;

export type Situacao = "guardado" | "enviando" | "sem-internet" | "erro" | "sessao-vencida";

export interface Estado {
  lancamentos: Record<string, Lancamento>;
  fixos: Record<string, Fixo>;
  ajustes: Record<string, { valor: string; atualizadoEm: string }>;
  /** Até onde já lemos do servidor (relógio dele). */
  ate: string | null;
  /** O que ainda não subiu. */
  pendentes: string[];
  /**
   * O que o servidor recusou de vez, com o motivo. Fica gravado até a linha
   * ser editada ou apagada — um aviso que some no próximo sync não é aviso.
   */
  recusados: { id: string; motivo: string }[];
  situacao: Situacao;
  ultimaSincronizacao: string | null;
  recadoDeErro: string | null;
  carregado: boolean;
  /**
   * A última ação que ainda dá para desfazer: um Apagar, ou um lançamento de
   * um toque (os botões de valor da tela Hoje). Efêmero de propósito: não é
   * gravado no aparelho nem sincronizado — é só a janela de arrependimento de
   * alguns segundos depois do toque.
   */
  ultimaAcao: { tipo: "apagou" | "lancou"; id: string; rotulo: string } | null;
}

const ESTADO_VAZIO: Estado = {
  lancamentos: {},
  fixos: {},
  ajustes: {},
  ate: null,
  pendentes: [],
  recusados: [],
  situacao: "guardado",
  ultimaSincronizacao: null,
  recadoDeErro: null,
  carregado: false,
  ultimaAcao: null,
};

const agora = () => new Date().toISOString();
const novoId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export class Loja {
  private estado: Estado = ESTADO_VAZIO;
  private ouvintes = new Set<() => void>();
  private relogioDoEnvio: ReturnType<typeof setTimeout> | null = null;
  private enviando = false;
  /** Alguém pediu para sincronizar enquanto um envio estava no meio. */
  private pedidoDuranteEnvio = false;

  // ---------------------------------------------------------------- leitura

  instantaneo = (): Estado => this.estado;

  assinar = (ouvinte: () => void): (() => void) => {
    this.ouvintes.add(ouvinte);
    return () => {
      this.ouvintes.delete(ouvinte);
    };
  };

  private publicar(mudanca: Partial<Estado>, guardar = true) {
    this.estado = { ...this.estado, ...mudanca };
    if (guardar) this.guardarNoAparelho();
    for (const ouvinte of this.ouvintes) ouvinte();
  }

  // -------------------------------------------------------- vida do aparelho

  /** Lê o que ficou guardado da última vez e já tenta uma sincronização. */
  iniciar() {
    if (this.estado.carregado) return;
    let guardado: Partial<Estado> = {};
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (bruto) guardado = JSON.parse(bruto) as Partial<Estado>;
    } catch {
      // Safari com dados de site bloqueados, aba privada, armazenamento cheio:
      // o app abre vazio e busca tudo do servidor. Pior é não abrir.
    }

    const recuperado = { ...ESTADO_VAZIO, ...guardado };
    this.publicar(
      {
        ...recuperado,
        pendentes: refazerAFila(recuperado),
        situacao: "guardado",
        recadoDeErro: null,
        carregado: true,
      },
      false,
    );

    void this.sincronizar();

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => void this.sincronizar());
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void this.sincronizar();
      });
      // O iPhone às vezes devolve o app da memória sem avisar a troca de
      // visibilidade (volta do cache de páginas, retomada rápida). Os dois
      // eventos abaixo cobrem essas voltas — cada uma é uma chance de o app
      // descobrir que existe versão nova.
      window.addEventListener("pageshow", () => void this.sincronizar());
      window.addEventListener("focus", () => void this.sincronizar());
    }
  }

  private guardarNoAparelho() {
    try {
      const { lancamentos, fixos, ajustes, ate, pendentes, recusados, ultimaSincronizacao } =
        this.estado;
      localStorage.setItem(
        CHAVE,
        JSON.stringify({
          lancamentos,
          fixos,
          ajustes,
          ate,
          pendentes,
          recusados,
          ultimaSincronizacao,
        }),
      );
    } catch {
      // Sem espaço para guardar: o que está na tela continua valendo, e a
      // sincronização leva tudo para o servidor assim que puder.
    }
  }

  // ---------------------------------------------------------------- escrita

  private marcarPendente(chave: string) {
    const pendentes = this.estado.pendentes.includes(chave)
      ? this.estado.pendentes
      : [...this.estado.pendentes, chave];
    // Mexer na linha é a chance de ela passar: a recusa antiga sai daqui.
    const id = chave.slice(2);
    if (this.estado.recusados.some((r) => r.id === id)) {
      this.publicar({ recusados: this.estado.recusados.filter((r) => r.id !== id) }, false);
    }
    // A fila é gravada junto com o dado. Enquanto ela só existia na memória,
    // um lançamento feito no metrô e o app fechado antes de o sinal voltar
    // ficava para sempre só naquele aparelho: o valor estava salvo, mas nada
    // mais lembrava que ele ainda precisava subir.
    this.publicar({ pendentes }, true);
    this.agendarEnvio();
  }

  private agendarEnvio() {
    if (this.relogioDoEnvio) clearTimeout(this.relogioDoEnvio);
    this.relogioDoEnvio = setTimeout(() => void this.sincronizar(), ESPERA_ANTES_DE_SINCRONIZAR_MS);
  }

  salvarLancamento(dados: Omit<Lancamento, "id" | "criadoEm" | "atualizadoEm"> & { id?: string }) {
    const id = dados.id ?? novoId();
    const anterior = this.estado.lancamentos[id];
    const l: Lancamento = {
      ...dados,
      id,
      // O app não guarda centavos, e esta é a porta por onde todo lançamento
      // entra: arredondar aqui é o que faz a soma das partes bater com o total
      // em toda tela, sem cada tela precisar lembrar disso.
      valorCents: aoReal(dados.valorCents),
      // O servidor recusa nota acima de 500 letras; cortar aqui evita criar
      // uma linha que nunca conseguiria subir.
      nota: dados.nota ? dados.nota.slice(0, 500) : dados.nota,
      criadoEm: anterior?.criadoEm ?? agora(),
      atualizadoEm: agora(),
      apagadoEm: null,
    };
    this.publicar({ lancamentos: { ...this.estado.lancamentos, [id]: l } });
    this.marcarPendente(`l:${id}`);
    return l;
  }

  /** Vários de uma vez (a importação, a previsão do ano inteiro). */
  salvarVariosLancamentos(lista: Lancamento[]) {
    if (lista.length === 0) return;
    const lancamentos = { ...this.estado.lancamentos };
    const pendentes = new Set(this.estado.pendentes);
    for (const l of lista) {
      lancamentos[l.id] = {
        ...l,
        valorCents: aoReal(l.valorCents),
        atualizadoEm: l.atualizadoEm ?? agora(),
      };
      pendentes.add(`l:${l.id}`);
    }
    this.publicar({ lancamentos, pendentes: [...pendentes] });
    this.agendarEnvio();
  }

  private relogioDoDesfazer: ReturnType<typeof setTimeout> | null = null;

  /** Abre a janela de arrependimento e a fecha sozinha em seis segundos. */
  private abrirDesfazer(acao: NonNullable<Estado["ultimaAcao"]>) {
    this.publicar({ ultimaAcao: acao }, false);
    if (this.relogioDoDesfazer) clearTimeout(this.relogioDoDesfazer);
    this.relogioDoDesfazer = setTimeout(() => {
      if (this.estado.ultimaAcao?.id === acao.id) this.publicar({ ultimaAcao: null }, false);
    }, 6000);
  }

  apagarLancamento(id: string) {
    const atual = this.estado.lancamentos[id];
    if (!atual) return;
    const l: Lancamento = { ...atual, apagadoEm: agora(), atualizadoEm: agora() };
    this.publicar({ lancamentos: { ...this.estado.lancamentos, [id]: l } });
    this.marcarPendente(`l:${id}`);
    // Apagar é soft-delete, então desfazer é barato — e um toque errado em
    // Apagar deixa de custar o valor inteiro digitado de novo.
    this.abrirDesfazer({ tipo: "apagou", id, rotulo: atual.nota?.trim() || "lançamento" });
  }

  /**
   * Um gasto do dia a dia lançado com um toque: o valor, hoje, no Diário, e
   * mais nada. É o botão de R$ 15 da tela Hoje. Sem folha para conferir, a
   * segurança é o Desfazer que aparece logo em seguida.
   */
  lancarRapido(valorCents: number, data: string) {
    const l = this.salvarLancamento({
      data,
      tipo: "DIARIO",
      valorCents,
      nota: null,
      categoria: null,
      previsto: false,
      rendaPropria: false,
      investimento: false,
      apartamento: false,
      fixoId: null,
    });
    this.abrirDesfazer({
      tipo: "lancou",
      id: l.id,
      rotulo: `${comCifrao(l.valorCents)} no diário`,
    });
    return l;
  }

  desfazer() {
    const alvo = this.estado.ultimaAcao;
    if (!alvo) return;
    this.publicar({ ultimaAcao: null }, false);
    const l = this.estado.lancamentos[alvo.id];
    if (!l) return;

    if (alvo.tipo === "apagou") {
      if (!l.apagadoEm) return;
      // Volta como era, inclusive `previsto`: desfazer não é relançar.
      const { apagadoEm: _, atualizadoEm: __, criadoEm: ___, ...resto } = l;
      this.salvarLancamento(resto);
      return;
    }

    // Desfazer um lançamento de um toque é apagá-lo — sem abrir outra janela
    // de "Apagado", que só confundiria.
    if (l.apagadoEm) return;
    const morto: Lancamento = { ...l, apagadoEm: agora(), atualizadoEm: agora() };
    this.publicar({ lancamentos: { ...this.estado.lancamentos, [l.id]: morto } });
    this.marcarPendente(`l:${l.id}`);
  }

  /** Confirmar é dizer "aconteceu mesmo, e foi este valor". */
  confirmarLancamento(id: string, valorCents?: number) {
    const atual = this.estado.lancamentos[id];
    if (!atual) return;
    this.salvarLancamento({
      ...atual,
      valorCents: valorCents ?? atual.valorCents,
      previsto: false,
    });
  }

  salvarFixo(dados: Omit<Fixo, "id" | "criadoEm" | "atualizadoEm"> & { id?: string }) {
    const id = dados.id ?? novoId();
    const anterior = this.estado.fixos[id];
    const f: Fixo = {
      ...dados,
      id,
      valorCents: aoReal(dados.valorCents),
      nota: dados.nota ? dados.nota.slice(0, 500) : dados.nota,
      criadoEm: anterior?.criadoEm ?? agora(),
      atualizadoEm: agora(),
      apagadoEm: null,
    };
    this.publicar({ fixos: { ...this.estado.fixos, [id]: f } });
    this.marcarPendente(`f:${id}`);
    return f;
  }

  /**
   * Apagar um fixo leva junto os lançamentos PREVISTOS e futuros que nasceram
   * dele. Sem isso, apagar e recriar um fixo deixava quinze meses de previsão
   * órfã na tela, sem nenhum jeito de limpar. O que já aconteceu (confirmado)
   * e o que já passou ficam: são história, não previsão.
   */
  apagarFixo(id: string) {
    const atual = this.estado.fixos[id];
    if (!atual) return;
    const quando = agora();
    const f: Fixo = { ...atual, apagadoEm: quando, atualizadoEm: quando };

    const hojeStr = dataDeHoje();
    const lancamentos = { ...this.estado.lancamentos };
    const orfaos: string[] = [];
    for (const l of Object.values(lancamentos)) {
      if (l.fixoId !== id || !l.previsto || l.apagadoEm || l.data < hojeStr) continue;
      lancamentos[l.id] = { ...l, apagadoEm: quando, atualizadoEm: quando };
      orfaos.push(l.id);
    }

    this.publicar({ fixos: { ...this.estado.fixos, [id]: f }, lancamentos });
    this.marcarPendente(`f:${id}`);
    for (const lid of orfaos) this.marcarPendente(`l:${lid}`);
  }

  definirAjuste(chave: string, valor: string) {
    const ajustes = { ...this.estado.ajustes, [chave]: { valor, atualizadoEm: agora() } };
    this.publicar({ ajustes });
    this.marcarPendente(`a:${chave}`);
  }

  /** Apaga tudo deste aparelho e do servidor. Só a tela de Ajustes chama. */
  async apagarTudo() {
    const quando = agora();
    const lancamentos = Object.fromEntries(
      Object.entries(this.estado.lancamentos).map(([id, l]) => [
        id,
        { ...l, apagadoEm: quando, atualizadoEm: quando },
      ]),
    );
    const fixos = Object.fromEntries(
      Object.entries(this.estado.fixos).map(([id, f]) => [
        id,
        { ...f, apagadoEm: quando, atualizadoEm: quando },
      ]),
    );
    // Os ajustes pendentes (categorias recém-mexidas, saldo de abertura) não
    // têm nada a ver com o apagão e continuam na fila — substituí-la inteira
    // descartava essas mudanças em silêncio.
    const pendentes = [
      ...this.estado.pendentes.filter((c) => c.startsWith("a:")),
      ...Object.keys(lancamentos).map((id) => `l:${id}`),
      ...Object.keys(fixos).map((id) => `f:${id}`),
    ];
    this.publicar({ lancamentos, fixos, pendentes });
    await this.sincronizar();
  }

  // --------------------------------------------------------- sincronização

  async sincronizar(): Promise<void> {
    if (this.enviando) {
      this.pedidoDuranteEnvio = true;
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      this.publicar({ situacao: "sem-internet" }, false);
      return;
    }

    this.enviando = true;
    this.pedidoDuranteEnvio = false;
    // Em lotes: o servidor aceita até 2000 lançamentos por pedido, e um backup
    // restaurado pode ter mais. Um pedido acima do teto era 400 determinístico
    // — e a fila travava para sempre. O que sobrar vai no próximo envio.
    const enviados = primeirosDaFila(this.estado.pendentes);
    const relogioNoEnvio = new Map<string, string | undefined>();
    for (const chave of enviados) relogioNoEnvio.set(chave, this.relogioDe(chave));

    if (enviados.length > 0) this.publicar({ situacao: "enviando" }, false);

    try {
      // Com prazo. O iPhone congela o app com o pedido no meio do caminho, e
      // um pedido que nunca responde deixava `enviando` preso para sempre:
      // nenhuma sincronização depois disso — nem a que descobriria a versão
      // nova. Vinte segundos é muito mais do que um sync leva.
      const prazo = new AbortController();
      const relogioDoPrazo = setTimeout(() => prazo.abort(), 20_000);
      const resposta = await fetch("/api/sync", {
        method: "POST",
        signal: prazo.signal,
        headers: { "content-type": "application/json", "x-versao": VERSAO_DO_APP },
        body: JSON.stringify({
          desde: this.estado.ate,
          lancamentos: enviados
            .filter((c) => c.startsWith("l:"))
            .map((c) => this.estado.lancamentos[c.slice(2)])
            .filter(Boolean),
          fixos: enviados
            .filter((c) => c.startsWith("f:"))
            .map((c) => this.estado.fixos[c.slice(2)])
            .filter(Boolean),
          ajustes: enviados
            .filter((c) => c.startsWith("a:"))
            .map((c) => {
              const chave = c.slice(2);
              const a = this.estado.ajustes[chave];
              return a ? { chave, valor: a.valor, atualizadoEm: a.atualizadoEm } : null;
            })
            .filter(Boolean),
        }),
      });

      clearTimeout(relogioDoPrazo);
      if (resposta.status === 401 || resposta.redirected) {
        // A sessão venceu no meio do uso. Navegar à força para /entrar jogava
        // fora o que estava sendo digitado; o dado está salvo no aparelho, e
        // um aviso na tela resolve sem destruir nada.
        this.publicar({ situacao: "sessao-vencida" }, false);
        return;
      }
      if (!resposta.ok) {
        throw new Error(`O servidor respondeu ${resposta.status}.`);
      }
      const versaoDoServidor = resposta.headers.get("x-versao");
      if (versaoDoServidor && versaoDoServidor !== VERSAO_DO_APP) {
        recarregarQuandoSeguro(versaoDoServidor);
      }

      const vindo = (await resposta.json()) as {
        ate: string;
        recusados?: { id: string; motivo: string }[];
        lancamentos: Lancamento[];
        fixos: Fixo[];
        ajustes: { chave: string; valor: string; atualizadoEm: string }[];
      };

      // O que o servidor recusou de vez (valor impossível, data que não
      // existe) sai da fila — reenviar daria a mesma recusa para sempre, e a
      // fila travada era pior que a linha perdida: nada mais subia. A linha
      // continua no aparelho, e o recado diz qual foi e por quê.
      const recusadas = new Set((vindo.recusados ?? []).map((r) => r.id));

      const lancamentos = { ...this.estado.lancamentos };
      for (const l of vindo.lancamentos) {
        const meu = lancamentos[l.id];
        if (!meu || (l.atualizadoEm ?? "") > (meu.atualizadoEm ?? "")) lancamentos[l.id] = l;
      }
      const fixos = { ...this.estado.fixos };
      for (const f of vindo.fixos) {
        const meu = fixos[f.id];
        if (!meu || (f.atualizadoEm ?? "") > (meu.atualizadoEm ?? "")) fixos[f.id] = f;
      }
      const ajustes = { ...this.estado.ajustes };
      for (const a of vindo.ajustes) {
        const meu = ajustes[a.chave];
        if (!meu || a.atualizadoEm > meu.atualizadoEm) {
          ajustes[a.chave] = { valor: a.valor, atualizadoEm: a.atualizadoEm };
        }
      }

      // Sai da fila só o que não foi mexido de novo enquanto o pedido ia e
      // voltava. O que mudou no meio do caminho fica, e sobe no próximo envio.
      const pendentes = this.estado.pendentes.filter((chave) => {
        if (recusadas.has(chave.slice(2))) return false;
        if (!relogioNoEnvio.has(chave)) return true;
        return this.relogioDe(chave) !== relogioNoEnvio.get(chave);
      });

      const recusadosAgora = vindo.recusados ?? [];
      const recusados = [
        ...this.estado.recusados.filter((r) => !recusadas.has(r.id)),
        ...recusadosAgora,
      ];

      this.publicar({
        lancamentos,
        fixos,
        ajustes,
        pendentes,
        recusados,
        ate: vindo.ate,
        situacao: "guardado",
        ultimaSincronizacao: agora(),
        recadoDeErro: null,
      });
    } catch (erro) {
      const semRede = typeof navigator !== "undefined" && navigator.onLine === false;
      this.publicar(
        {
          situacao: semRede ? "sem-internet" : "erro",
          recadoDeErro: erro instanceof Error ? erro.message : String(erro),
        },
        false,
      );
    } finally {
      this.enviando = false;
      // Reagendar só quando faz sentido: o envio deu certo e sobrou fila (o
      // próximo lote, ou algo que mudou no meio), ou alguém bateu na porta
      // durante o envio. Em ERRO, não: reagendar a cada 1,5 s para sempre era
      // martelar um servidor caído, e um pedido que o servidor recusa de forma
      // determinística viraria um loop eterno. O erro espera a próxima
      // escrita, a volta da internet ou a tela ficar visível — como sempre.
      const deuCerto = this.estado.situacao === "guardado";
      if ((deuCerto && this.estado.pendentes.length > 0) || (deuCerto && this.pedidoDuranteEnvio)) {
        this.agendarEnvio();
      }
    }
  }

  private relogioDe(chave: string): string | undefined {
    const id = chave.slice(2);
    if (chave.startsWith("l:")) return this.estado.lancamentos[id]?.atualizadoEm;
    if (chave.startsWith("f:")) return this.estado.fixos[id]?.atualizadoEm;
    return this.estado.ajustes[id]?.atualizadoEm;
  }
}

export const loja = new Loja();

export const VERSAO_DO_APP = process.env.NEXT_PUBLIC_VERSAO ?? "local";
const CHAVE_DO_RECARREGO = "termometro.recarregouPara";

/**
 * Saiu versão nova: recarrega, mas só num momento que não custa nada.
 *
 * Nunca com uma folha aberta nem com o dedo num campo — um lançamento em
 * digitação não pode sumir porque saiu um deploy. Nesses casos fica para o
 * próximo sync (que vem 1,5 s depois de salvar, ou na próxima vez que o app
 * voltar para a frente). E uma vez só por versão: se depois de recarregar o
 * aparelho continuar velho (cache teimoso, rede caindo no meio), não entra em
 * laço — espera a próxima abertura.
 */
function recarregarQuandoSeguro(versaoDoServidor: string) {
  if (typeof window === "undefined") return;
  if (document.visibilityState !== "visible") return;
  if (document.querySelector('[role="dialog"]')) return;
  const foco = document.activeElement?.tagName;
  if (foco === "INPUT" || foco === "TEXTAREA" || foco === "SELECT") return;

  try {
    if (sessionStorage.getItem(CHAVE_DO_RECARREGO) === versaoDoServidor) return;
    sessionStorage.setItem(CHAVE_DO_RECARREGO, versaoDoServidor);
  } catch {
    // Sem sessionStorage (aba privada estrita): recarrega mesmo assim, uma
    // vez por abertura já é o que o `return` acima garantiria.
  }
  window.location.reload();
}

/** O quanto cabe num pedido, folgado abaixo dos tetos do servidor (2000/500/100). */
const LOTE = { "l:": 500, "f:": 100, "a:": 50 } as const;

function primeirosDaFila(pendentes: string[]): string[] {
  const contagem: Record<string, number> = { "l:": 0, "f:": 0, "a:": 0 };
  return pendentes.filter((chave) => {
    const tipo = chave.slice(0, 2) as keyof typeof LOTE;
    if (!(tipo in LOTE)) return false;
    if (contagem[tipo] >= LOTE[tipo]) return false;
    contagem[tipo]++;
    return true;
  });
}

// ------------------------------------------------------------------ leitura

/**
 * A fila, refeita a partir dos próprios dados na abertura do app.
 *
 * Tudo o que mudou depois da última sincronização bem-sucedida volta para a
 * fila. É cinto e suspensório: mesmo que a gravação da fila tenha se perdido —
 * armazenamento cheio, aba anônima, aparelho desligado no meio —, nada que você
 * escreveu deixa de subir. Reenviar o que o servidor já tem não faz mal: ele
 * compara os relógios e ignora o que não é mais novo.
 */
function refazerAFila(estado: Estado): string[] {
  const corte = estado.ultimaSincronizacao;
  const fila = new Set(estado.pendentes);

  for (const l of Object.values(estado.lancamentos)) {
    if (!corte || (l.atualizadoEm ?? "") > corte) fila.add(`l:${l.id}`);
  }
  for (const f of Object.values(estado.fixos)) {
    if (!corte || (f.atualizadoEm ?? "") > corte) fila.add(`f:${f.id}`);
  }
  for (const [chave, a] of Object.entries(estado.ajustes)) {
    if (!corte || a.atualizadoEm > corte) fila.add(`a:${chave}`);
  }
  return [...fila];
}

export function lancamentosVivos(estado: Estado): Lancamento[] {
  return Object.values(estado.lancamentos).filter((l) => !l.apagadoEm);
}

export function fixosVivos(estado: Estado): Fixo[] {
  return Object.values(estado.fixos)
    .filter((f) => !f.apagadoEm)
    .sort((a, b) => a.dia - b.dia || a.tipo.localeCompare(b.tipo));
}

const CHAVE_DO_RATEIO = "rateioApto";
const chaveDoSaldo = (ano: number) => `saldoInicial:${ano}`;

/** O saldo de abertura que a pessoa digitou para este ano, se digitou algum. */
export function saldoInicialExplicito(estado: Estado, ano: number): number | null {
  const bruto = estado.ajustes[chaveDoSaldo(ano)]?.valor;
  if (bruto === undefined) return null;
  const n = Number(bruto);
  return Number.isFinite(n) ? n : null;
}

/** Todos os saldos de abertura digitados à mão, por ano — o combustível da corrente. */
export function saldosIniciaisDigitados(estado: Estado): Record<number, number> {
  const saldos: Record<number, number> = {};
  for (const [chave, a] of Object.entries(estado.ajustes)) {
    if (!chave.startsWith("saldoInicial:")) continue;
    const ano = Number(chave.slice(13));
    const cents = Number(a.valor);
    if (Number.isFinite(ano) && Number.isFinite(cents)) saldos[ano] = cents;
  }
  return saldos;
}

export function rateioApto(estado: Estado): number {
  const n = Number(estado.ajustes[CHAVE_DO_RATEIO]?.valor);
  return Number.isFinite(n) ? n : AJUSTES_PADRAO.rateioAptoPercent;
}

export function ajustesDoAno(estado: Estado, ano: number): Ajustes {
  const rateio = Number(estado.ajustes[CHAVE_DO_RATEIO]?.valor);
  const saldo = Number(estado.ajustes[chaveDoSaldo(ano)]?.valor);
  return {
    ano,
    saldoInicialCents: Number.isFinite(saldo) ? saldo : 0,
    rateioAptoPercent: Number.isFinite(rateio) ? rateio : AJUSTES_PADRAO.rateioAptoPercent,
  };
}

/**
 * Passa o pente nos centavos que já estavam guardados.
 *
 * Os 815 lançamentos vieram da planilha com centavos, e daqui em diante nada
 * mais entra com eles. Enquanto os dois convivem, um rodapé pode mostrar 10.150
 * enquanto as parcelas somam 10.151, porque cada uma foi arredondada sozinha na
 * hora de aparecer — a diferença de um real que faz a gente passar meia hora
 * procurando erro onde não tem.
 *
 * Só mexe em quem precisa: o que já é redondo não é tocado, não vira pendência
 * e não sobe de novo. Devolve quantos mudaram, porque uma operação que promete
 * arrumar o passado precisa dizer o tamanho do que fez.
 */
export function arredondarTudo(): { lancamentos: number; fixos: number } {
  const estado = loja.instantaneo();

  const lancamentos = Object.values(estado.lancamentos).filter(
    (l) => !l.apagadoEm && l.valorCents !== aoReal(l.valorCents),
  );
  const fixos = Object.values(estado.fixos).filter(
    (f) => !f.apagadoEm && f.valorCents !== aoReal(f.valorCents),
  );

  if (lancamentos.length > 0) {
    // `atualizadoEm` fica de fora de propósito: `salvarVariosLancamentos`
    // carimba a hora, e é esse carimbo novo que faz a linha ganhar do que está
    // no servidor quando a sincronização comparar as duas.
    loja.salvarVariosLancamentos(
      lancamentos.map(({ atualizadoEm: _, ...resto }) => ({
        ...resto,
        valorCents: aoReal(resto.valorCents),
      })),
    );
  }
  for (const f of fixos) {
    loja.salvarFixo({ ...f, valorCents: aoReal(f.valorCents) });
  }

  for (const [chave, ajuste] of Object.entries(estado.ajustes)) {
    if (!chave.startsWith("saldoInicial:")) continue;
    const cents = Number(ajuste.valor);
    if (Number.isFinite(cents) && cents !== aoReal(cents)) {
      loja.definirAjuste(chave, String(aoReal(cents)));
    }
  }

  return { lancamentos: lancamentos.length, fixos: fixos.length };
}

/** Quantos valores ainda carregam centavos. Zero quer dizer que não há o que fazer. */
export function quantosComCentavos(estado: Estado): number {
  const conta = (v: { valorCents: number; apagadoEm?: string | null }) =>
    !v.apagadoEm && v.valorCents !== aoReal(v.valorCents);
  return (
    Object.values(estado.lancamentos).filter(conta).length +
    Object.values(estado.fixos).filter(conta).length
  );
}

/** As categorias deste aparelho, já lidas do ajuste que sincroniza. */
export function categoriasDe(estado: Estado): Categoria[] {
  return lerCategorias(estado.ajustes[CHAVE_DAS_CATEGORIAS]?.valor);
}

export function guardarCategorias(lista: Categoria[]) {
  loja.definirAjuste(CHAVE_DAS_CATEGORIAS, escreverCategorias(lista));
}

/** Os atalhos de lançamento rápido, do mesmo ajuste que sincroniza. */
export function atalhosDe(estado: Estado): AtalhoFixo[] {
  return lerAtalhos(estado.ajustes[CHAVE_DOS_ATALHOS]?.valor);
}

export function guardarAtalhos(lista: AtalhoFixo[]) {
  loja.definirAjuste(CHAVE_DOS_ATALHOS, escreverAtalhos(lista));
}

export function guardarSaldoInicial(ano: number, cents: number) {
  cents = aoReal(cents);
  loja.definirAjuste(chaveDoSaldo(ano), String(Math.round(cents)));
}

export function guardarRateio(percent: number) {
  loja.definirAjuste(CHAVE_DO_RATEIO, String(Math.round(percent)));
}

/** Os anos que têm alguma coisa dentro, do mais novo para o mais velho. */
export function anosComDados(estado: Estado, incluir: number[] = []): number[] {
  const anos = new Set<number>(incluir);
  for (const l of lancamentosVivos(estado)) anos.add(Number(l.data.slice(0, 4)));
  for (const chave of Object.keys(estado.ajustes)) {
    if (chave.startsWith("saldoInicial:")) anos.add(Number(chave.slice(13)));
  }
  return [...anos].filter((a) => Number.isFinite(a)).sort((a, b) => b - a);
}

export const RECADO_DA_SITUACAO: Record<Situacao, string> = {
  guardado: "Tudo sincronizado",
  enviando: "Sincronizando…",
  "sem-internet": "Sem internet — guardado no aparelho",
  erro: "Não consegui sincronizar agora",
  "sessao-vencida": "A sessão venceu — entre de novo para sincronizar",
};

export type { Tipo };
