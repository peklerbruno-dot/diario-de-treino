"use client";

import { aoReal } from "./dinheiro";
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

export type Situacao = "guardado" | "enviando" | "sem-internet" | "erro";

export interface Estado {
  lancamentos: Record<string, Lancamento>;
  fixos: Record<string, Fixo>;
  ajustes: Record<string, { valor: string; atualizadoEm: string }>;
  /** Até onde já lemos do servidor (relógio dele). */
  ate: string | null;
  /** O que ainda não subiu. */
  pendentes: string[];
  situacao: Situacao;
  ultimaSincronizacao: string | null;
  recadoDeErro: string | null;
  carregado: boolean;
}

const ESTADO_VAZIO: Estado = {
  lancamentos: {},
  fixos: {},
  ajustes: {},
  ate: null,
  pendentes: [],
  situacao: "guardado",
  ultimaSincronizacao: null,
  recadoDeErro: null,
  carregado: false,
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
    }
  }

  private guardarNoAparelho() {
    try {
      const { lancamentos, fixos, ajustes, ate, pendentes, ultimaSincronizacao } = this.estado;
      localStorage.setItem(
        CHAVE,
        JSON.stringify({ lancamentos, fixos, ajustes, ate, pendentes, ultimaSincronizacao }),
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

  apagarLancamento(id: string) {
    const atual = this.estado.lancamentos[id];
    if (!atual) return;
    const l: Lancamento = { ...atual, apagadoEm: agora(), atualizadoEm: agora() };
    this.publicar({ lancamentos: { ...this.estado.lancamentos, [id]: l } });
    this.marcarPendente(`l:${id}`);
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
      criadoEm: anterior?.criadoEm ?? agora(),
      atualizadoEm: agora(),
      apagadoEm: null,
    };
    this.publicar({ fixos: { ...this.estado.fixos, [id]: f } });
    this.marcarPendente(`f:${id}`);
    return f;
  }

  apagarFixo(id: string) {
    const atual = this.estado.fixos[id];
    if (!atual) return;
    const f: Fixo = { ...atual, apagadoEm: agora(), atualizadoEm: agora() };
    this.publicar({ fixos: { ...this.estado.fixos, [id]: f } });
    this.marcarPendente(`f:${id}`);
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
    const pendentes = [
      ...Object.keys(lancamentos).map((id) => `l:${id}`),
      ...Object.keys(fixos).map((id) => `f:${id}`),
    ];
    this.publicar({ lancamentos, fixos, pendentes });
    await this.sincronizar();
  }

  // --------------------------------------------------------- sincronização

  async sincronizar(): Promise<void> {
    if (this.enviando) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      this.publicar({ situacao: "sem-internet" }, false);
      return;
    }

    this.enviando = true;
    const enviados = [...this.estado.pendentes];
    const relogioNoEnvio = new Map<string, string | undefined>();
    for (const chave of enviados) relogioNoEnvio.set(chave, this.relogioDe(chave));

    if (enviados.length > 0) this.publicar({ situacao: "enviando" }, false);

    try {
      const resposta = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
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

      if (resposta.status === 401) {
        window.location.href = "/entrar";
        return;
      }
      if (!resposta.ok) {
        throw new Error(`O servidor respondeu ${resposta.status}.`);
      }

      const vindo = (await resposta.json()) as {
        ate: string;
        lancamentos: Lancamento[];
        fixos: Fixo[];
        ajustes: { chave: string; valor: string; atualizadoEm: string }[];
      };

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
        if (!relogioNoEnvio.has(chave)) return true;
        return this.relogioDe(chave) !== relogioNoEnvio.get(chave);
      });

      this.publicar({
        lancamentos,
        fixos,
        ajustes,
        pendentes,
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
};

export type { Tipo };
