"use client";

import { useState } from "react";
import { avaliar } from "@/lib/calculadora";
import { curta, porExtenso } from "@/lib/datas";
import { loja } from "@/lib/loja";
import { EXPLICACAO_DO_TIPO, NOME_DO_TIPO, TIPOS, type Lancamento, type Tipo } from "@/lib/tipos";
import { Botao, CampoDeTexto, Folha } from "./pecas";
import { ComoAsTeclasFuncionam, Teclado } from "./teclado";

/**
 * Lançar é uma tela só: a coluna, o valor, e pronto. A nota, a data e as
 * marcações estão ali, mas fora do caminho de quem só quer registrar os 38
 * reais do almoço antes de guardar o celular.
 */
export function FolhaDeLancamento({
  data,
  lancamento,
  tipoInicial = "DIARIO",
  aoFechar,
}: {
  data: string;
  lancamento?: Lancamento;
  tipoInicial?: Tipo;
  aoFechar: () => void;
}) {
  const editando = !!lancamento;

  const [tipo, setTipo] = useState<Tipo>(lancamento?.tipo ?? tipoInicial);
  const [valor, setValor] = useState(
    lancamento ? (lancamento.valorCents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [quando, setQuando] = useState(lancamento?.data ?? data);
  const [nota, setNota] = useState(lancamento?.nota ?? "");
  const [marcado, setMarcado] = useState({
    rendaPropria: !!lancamento?.rendaPropria,
    investimento: !!lancamento?.investimento,
    apartamento: !!lancamento?.apartamento,
  });
  const [erro, setErro] = useState<string | null>(null);

  const conta = avaliar(valor);

  function salvar() {
    if (!conta) {
      setErro("Digite um valor.");
      return;
    }

    const comum = {
      data: quando,
      tipo,
      nota: nota.trim() || null,
      previsto: false,
      rendaPropria: tipo === "ENTRADA" && marcado.rendaPropria,
      investimento: tipo === "SAIDA" && marcado.investimento,
      apartamento: tipo === "SAIDA" && marcado.apartamento,
      fixoId: lancamento?.fixoId ?? null,
    };

    if (editando) {
      loja.salvarLancamento({ ...comum, id: lancamento.id, valorCents: conta.totalCents });
    } else {
      // "195+15+83" eram três gastos, e viram três lançamentos.
      for (const parcela of conta.parcelas) {
        loja.salvarLancamento({ ...comum, valorCents: parcela });
      }
    }
    aoFechar();
  }

  return (
    <Folha titulo={editando ? "Editar lançamento" : "Novo lançamento"} aoFechar={aoFechar}>
      <div className="space-y-3">
        <div className="flex gap-2">
          {TIPOS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              aria-pressed={tipo === t}
              className={`min-h-[44px] flex-1 rounded-folha text-[16px] shadow-baixa ${
                tipo === t ? "bg-heroi font-semibold text-heroi-tinta" : "bg-cartao text-tinta"
              }`}
            >
              {NOME_DO_TIPO[t]}
            </button>
          ))}
        </div>
        <p className="!mt-2 text-[12.5px] leading-snug text-fosco">{EXPLICACAO_DO_TIPO[tipo]}</p>

        <Teclado valor={valor} aoMudar={setValor} />

        <div className="flex gap-2">
          <CampoDeTexto valor={nota} aoMudar={setNota} placeholder="Nota (opcional)" />
          <input
            type="date"
            value={quando}
            onChange={(e) => setQuando(e.target.value)}
            aria-label="Dia do lançamento"
            className="tabular mt-1.5 w-[150px] shrink-0 rounded-folha border border-regua bg-cartao px-3 py-3 text-[15px] outline-none focus:border-saldo"
          />
        </div>
        {quando !== data && (
          <p className="!mt-1.5 text-[12.5px] text-fosco">{porExtenso(quando)}</p>
        )}

        {tipo === "ENTRADA" && (
          <Marcacoes>
            <Chip
              ligado={marcado.rendaPropria}
              aoTocar={() => setMarcado((m) => ({ ...m, rendaPropria: !m.rendaPropria }))}
            >
              Dinheiro seu
            </Chip>
            <span className="text-[12.5px] leading-snug text-fosco">
              Salário, freela, trabalho. Repasse de fora e resgate não contam.
            </span>
          </Marcacoes>
        )}

        {tipo === "SAIDA" && (
          <Marcacoes>
            <Chip
              ligado={marcado.investimento}
              aoTocar={() => setMarcado((m) => ({ ...m, investimento: !m.investimento }))}
            >
              Investimento
            </Chip>
            <Chip
              ligado={marcado.apartamento}
              aoTocar={() => setMarcado((m) => ({ ...m, apartamento: !m.apartamento }))}
            >
              Apartamento
            </Chip>
          </Marcacoes>
        )}

        {erro && (
          <p role="alert" className="text-[14px] text-atencao">
            {erro}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Botao tipo="primario" onClick={salvar} className="flex-1">
            {editando ? "Salvar" : `Lançar em ${curta(quando)}`}
          </Botao>
          {editando && (
            <Botao
              tipo="perigo"
              onClick={() => {
                loja.apagarLancamento(lancamento.id);
                aoFechar();
              }}
            >
              Apagar
            </Botao>
          )}
        </div>

        <ComoAsTeclasFuncionam />
      </div>
    </Folha>
  );
}

function Marcacoes({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

function Chip({
  ligado,
  aoTocar,
  children,
}: {
  ligado: boolean;
  aoTocar: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      aria-pressed={ligado}
      className={`min-h-[38px] rounded-full px-4 text-[14px] shadow-baixa ${
        ligado ? "bg-saldo font-semibold text-white" : "bg-cartao text-grafite"
      }`}
    >
      {ligado ? "✓ " : ""}
      {children}
    </button>
  );
}
