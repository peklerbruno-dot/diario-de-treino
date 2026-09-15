"use client";

import { useState } from "react";
import { porExtenso } from "@/lib/datas";
import { comCifrao, parcelas } from "@/lib/dinheiro";
import { loja } from "@/lib/loja";
import { EXPLICACAO_DO_TIPO, NOME_DO_TIPO, TIPOS, type Lancamento, type Tipo } from "@/lib/tipos";
import { Botao, Campo, CampoDeTexto, CampoDeValor, Folha } from "./pecas";

/**
 * Lançar é uma tela só: valor, em qual das três colunas, e pronto. Tudo o mais
 * — nota, data, as marcações do rodapé — está ali, mas fora do caminho de quem
 * só quer registrar os 38 reais do almoço antes de guardar o celular.
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
  const [rendaPropria, setRendaPropria] = useState(!!lancamento?.rendaPropria);
  const [investimento, setInvestimento] = useState(!!lancamento?.investimento);
  const [apartamento, setApartamento] = useState(!!lancamento?.apartamento);
  const [erro, setErro] = useState<string | null>(null);

  const valores = parcelas(valor);
  const total = valores?.reduce((t, v) => t + v, 0) ?? 0;
  const virariaVarios = !editando && (valores?.length ?? 0) > 1;

  function salvar() {
    if (!valores || total === 0) {
      setErro("Digite um valor.");
      return;
    }

    const comum = {
      data: quando,
      tipo,
      nota: nota.trim() || null,
      previsto: false,
      rendaPropria: tipo === "ENTRADA" && rendaPropria,
      investimento: tipo === "SAIDA" && investimento,
      apartamento: tipo === "SAIDA" && apartamento,
      fixoId: lancamento?.fixoId ?? null,
    };

    if (editando) {
      loja.salvarLancamento({ ...comum, id: lancamento.id, valorCents: total });
    } else {
      // "195+15+83" eram três gastos, e viram três lançamentos.
      for (const parcela of valores) {
        loja.salvarLancamento({ ...comum, valorCents: parcela });
      }
    }
    aoFechar();
  }

  return (
    <Folha titulo={editando ? "Editar lançamento" : "Novo lançamento"} aoFechar={aoFechar}>
      <div className="space-y-4">
        <div>
          <span className="block text-[15px] text-grafite">Em qual coluna</span>
          <div className="mt-1 flex gap-2">
            {TIPOS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                aria-pressed={tipo === t}
                className={`min-h-[44px] flex-1 rounded-folha border px-2 text-[17px] ${
                  tipo === t
                    ? "border-tinta bg-tinta text-papel"
                    : "border-regua bg-cartao text-tinta"
                }`}
              >
                {NOME_DO_TIPO[t]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[13px] leading-snug text-fosco">{EXPLICACAO_DO_TIPO[tipo]}</p>
        </div>

        <Campo
          rotulo="Valor"
          dica={
            virariaVarios
              ? `${valores!.length} lançamentos, ${comCifrao(total)} no total`
              : "Dá para somar na hora: 195+15+83"
          }
        >
          <CampoDeValor valor={valor} aoMudar={setValor} autoFocus={!editando} />
        </Campo>

        <Campo rotulo="Dia" dica={porExtenso(quando)}>
          <input
            type="date"
            value={quando}
            onChange={(e) => setQuando(e.target.value)}
            className="mt-1 w-full rounded-folha border border-regua bg-cartao px-4 py-3 outline-none focus:border-saldo"
          />
        </Campo>

        <Campo rotulo="Nota" dica="Opcional — o que era esse valor.">
          <CampoDeTexto valor={nota} aoMudar={setNota} placeholder="fatura do cartão" />
        </Campo>

        {tipo === "ENTRADA" && (
          <Marcacao
            ligado={rendaPropria}
            aoMudar={setRendaPropria}
            titulo="É dinheiro seu"
            explicacao="Salário, freela, trabalho. Repasse de terceiros e resgate não contam — é o que a planilha chamava de entrada sem o dinheiro de fora."
          />
        )}

        {tipo === "SAIDA" && (
          <>
            <Marcacao
              ligado={investimento}
              aoMudar={setInvestimento}
              titulo="Foi para investimento"
              explicacao="Entra no “investido %” do mês."
            />
            <Marcacao
              ligado={apartamento}
              aoMudar={setApartamento}
              titulo="É do apartamento"
              explicacao="Entra no rateio com a outra pessoa."
            />
          </>
        )}

        {erro && (
          <p role="alert" className="text-[15px] text-atencao">
            {erro}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Botao tipo="primario" onClick={salvar} className="flex-1">
            {editando ? "Salvar" : "Lançar"}
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
      </div>
    </Folha>
  );
}

function Marcacao({
  ligado,
  aoMudar,
  titulo,
  explicacao,
}: {
  ligado: boolean;
  aoMudar: (v: boolean) => void;
  titulo: string;
  explicacao: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-folha border border-reguafina p-3">
      <input
        type="checkbox"
        checked={ligado}
        onChange={(e) => aoMudar(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--saldo)]"
      />
      <span>
        <span className="block text-[17px]">{titulo}</span>
        <span className="block text-[13px] leading-snug text-fosco">{explicacao}</span>
      </span>
    </label>
  );
}
