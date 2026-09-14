"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { calcular, type Resultado } from "@/lib/calculo";
import {
  paraInput,
  type CategoriaEstado,
  type EstadoMachane,
  type GastoEstado,
  type PoliticaEstado,
} from "@/lib/estado";
import {
  apagarCategoria,
  apagarGasto,
  criarCategoria,
  criarGasto,
  salvarCategoria,
  salvarGasto,
  salvarMachane,
  salvarPeso,
  salvarPolitica,
  type Resposta,
} from "@/app/actions";

/**
 * Guarda o estado da machané no navegador e recalcula a cada tecla.
 *
 * Não existe botão "calcular": o painel lateral acompanha a edição. O
 * salvamento acontece em segundo plano, agrupado por linha, meio segundo depois
 * da última tecla — a pessoa nunca precisa lembrar de salvar.
 */

type Situacao = "limpo" | "salvando" | "salvo" | "erro";

interface Contexto {
  estado: EstadoMachane;
  resultado: Resultado;
  situacao: Situacao;
  erro: string | null;
  somenteLeitura: boolean;

  editarMachane: (patch: Partial<EstadoMachane>) => void;
  /** O status muda por ação própria; aqui só refletimos o que o servidor já gravou. */
  refletirStatus: (status: EstadoMachane["status"]) => void;
  editarCategoria: (id: string, patch: Partial<CategoriaEstado>) => void;
  adicionarCategoria: () => Promise<void>;
  removerCategoria: (id: string) => Promise<void>;
  editarGasto: (id: string, patch: Partial<GastoEstado>) => void;
  adicionarGasto: () => Promise<void>;
  removerGasto: (id: string) => Promise<void>;
  editarPolitica: (patch: Partial<PoliticaEstado>) => void;
  definirPeso: (peso: number | null, justificativa: string) => Promise<Resposta>;
}

const Ctx = createContext<Contexto | null>(null);

const ATRASO_SALVAMENTO = 500;

export function ProvedorMachane({
  inicial,
  children,
}: {
  inicial: EstadoMachane;
  children: ReactNode;
}) {
  const [estado, setEstado] = useState<EstadoMachane>(inicial);
  const [situacao, setSituacao] = useState<Situacao>("limpo");
  const [erro, setErro] = useState<string | null>(null);

  // patches ainda não enviados, agrupados por linha ("gasto:abc", "machane"…)
  const pendentes = useRef(new Map<string, Record<string, unknown>>());
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enviar = useCallback(async () => {
    const lote = Array.from(pendentes.current.entries());
    pendentes.current.clear();
    if (lote.length === 0) return;

    setSituacao("salvando");
    setErro(null);
    for (const [chave, patch] of lote) {
      const [tipo, id] = chave.split(":");
      let r: Resposta<unknown>;
      if (tipo === "machane") r = await salvarMachane(inicial.id, patch);
      else if (tipo === "politica") r = await salvarPolitica(inicial.id, patch);
      else if (tipo === "categoria") r = await salvarCategoria(id!, patch);
      else if (tipo === "gasto") r = await salvarGasto(id!, patch);
      else continue;

      if (!r.ok) {
        setSituacao("erro");
        setErro(r.erro);
        return;
      }
    }
    setSituacao("salvo");
  }, [inicial.id]);

  const agendar = useCallback(
    (chave: string, patch: Record<string, unknown>) => {
      const atual = pendentes.current.get(chave) ?? {};
      pendentes.current.set(chave, { ...atual, ...patch });
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => void enviar(), ATRASO_SALVAMENTO);
    },
    [enviar],
  );

  const editarMachane = useCallback(
    (patch: Partial<EstadoMachane>) => {
      setEstado((e) => ({ ...e, ...patch }));
      agendar("machane", patch as Record<string, unknown>);
    },
    [agendar],
  );

  const refletirStatus = useCallback((status: EstadoMachane["status"]) => {
    setEstado((e) => ({ ...e, status }));
  }, []);

  const editarCategoria = useCallback(
    (id: string, patch: Partial<CategoriaEstado>) => {
      setEstado((e) => ({
        ...e,
        categorias: e.categorias.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }));
      agendar(`categoria:${id}`, patch as Record<string, unknown>);
    },
    [agendar],
  );

  const editarGasto = useCallback(
    (id: string, patch: Partial<GastoEstado>) => {
      setEstado((e) => ({
        ...e,
        gastos: e.gastos.map((g) => (g.id === id ? { ...g, ...patch } : g)),
      }));
      agendar(`gasto:${id}`, patch as Record<string, unknown>);
    },
    [agendar],
  );

  const editarPolitica = useCallback(
    (patch: Partial<PoliticaEstado>) => {
      setEstado((e) => ({ ...e, politica: { ...e.politica, ...patch } }));
      const { id: _ignora, ...resto } = patch as Record<string, unknown>;
      agendar("politica", resto);
    },
    [agendar],
  );

  const comEstrutura = useCallback(async <T,>(tarefa: () => Promise<Resposta<T>>) => {
    setSituacao("salvando");
    const r = await tarefa();
    if (!r.ok) {
      setSituacao("erro");
      setErro(r.erro);
      return null;
    }
    setSituacao("salvo");
    setErro(null);
    return r.dado;
  }, []);

  const adicionarCategoria = useCallback(async () => {
    const nova = await comEstrutura(() => criarCategoria(inicial.id));
    if (nova) setEstado((e) => ({ ...e, categorias: [...e.categorias, nova] }));
  }, [comEstrutura, inicial.id]);

  const removerCategoria = useCallback(
    async (id: string) => {
      const antes = estado.categorias;
      setEstado((e) => ({ ...e, categorias: e.categorias.filter((c) => c.id !== id) }));
      const r = await apagarCategoria(id);
      if (!r.ok) {
        setEstado((e) => ({ ...e, categorias: antes }));
        setSituacao("erro");
        setErro(r.erro);
      }
    },
    [estado.categorias],
  );

  const adicionarGasto = useCallback(async () => {
    const novo = await comEstrutura(() => criarGasto(inicial.id));
    if (novo) setEstado((e) => ({ ...e, gastos: [...e.gastos, novo] }));
  }, [comEstrutura, inicial.id]);

  const removerGasto = useCallback(
    async (id: string) => {
      const antes = estado.gastos;
      setEstado((e) => ({ ...e, gastos: e.gastos.filter((g) => g.id !== id) }));
      const r = await apagarGasto(id);
      if (!r.ok) {
        setEstado((e) => ({ ...e, gastos: antes }));
        setSituacao("erro");
        setErro(r.erro);
      }
    },
    [estado.gastos],
  );

  const definirPeso = useCallback(
    async (peso: number | null, justificativa: string) => {
      const r = await salvarPeso(inicial.id, { pesoOverride: peso, justificativa });
      if (r.ok) {
        setEstado((e) => ({
          ...e,
          pesoOverride: peso,
          pesoJustificativa: peso === null ? null : justificativa,
          pesoOverrideEm: peso === null ? null : new Date().toISOString(),
        }));
        setSituacao("salvo");
        setErro(null);
      } else {
        setSituacao("erro");
        setErro(r.erro);
      }
      return r;
    },
    [inicial.id],
  );

  const resultado = useMemo(() => calcular(paraInput(estado)), [estado]);

  const valor: Contexto = {
    estado,
    resultado,
    situacao,
    erro,
    somenteLeitura: estado.status === "ENCERRADA",
    editarMachane,
    refletirStatus,
    editarCategoria,
    adicionarCategoria,
    removerCategoria,
    editarGasto,
    adicionarGasto,
    removerGasto,
    editarPolitica,
    definirPeso,
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useMachane(): Contexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMachane precisa estar dentro de <ProvedorMachane>.");
  return ctx;
}
