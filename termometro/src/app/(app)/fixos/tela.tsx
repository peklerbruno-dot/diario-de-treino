"use client";

import { useState } from "react";
import { Aviso, Botao, Campo, CampoDeTexto, CampoDeValor, Dinheiro, Folha } from "@/componentes/pecas";
import { useEstado } from "@/componentes/usar-loja";
import { gerarPrevisao } from "@/lib/calculo";
import { hoje, partesDaData } from "@/lib/datas";
import { parcelas } from "@/lib/dinheiro";
import { fixosVivos, lancamentosVivos, loja } from "@/lib/loja";
import { EXPLICACAO_DO_TIPO, NOME_DO_TIPO, TIPOS, type Fixo, type Tipo } from "@/lib/tipos";

/**
 * O que se repete todo mês. É daqui que sai a previsão — e é a previsão que faz
 * o saldo do futuro aparecer na tela do mês, como aparecia na planilha quando
 * ela já trazia outubro, novembro e dezembro preenchidos.
 */
export function TelaDosFixos() {
  const estado = useEstado();
  const fixos = fixosVivos(estado);
  const [editando, setEditando] = useState<Fixo | "novo" | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  function preencherAteODezembro() {
    const agora = hoje();
    const { ano } = partesDaData(agora);
    const novos = gerarPrevisao({
      fixos,
      de: agora,
      ate: `${ano}-12-31`,
      existentes: lancamentosVivos(estado),
    });
    loja.salvarVariosLancamentos(novos);
    setRecado(
      novos.length === 0
        ? "Já estava tudo preenchido daqui até dezembro."
        : `Escrevi ${novos.length} lançamentos previstos, de hoje até 31 de dezembro.`,
    );
  }

  return (
    <div>
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold tracking-tight">Fixos</h1>
        <Botao onClick={() => setEditando("novo")}>Novo</Botao>
      </header>

      <p className="mt-2 text-[15px] leading-relaxed text-grafite">
        O salário do dia 5, a fatura do dia 10, os 60 reais de todo dia. O app usa esses valores
        para preencher os dias que ainda não chegaram.
      </p>

      {fixos.length === 0 ? (
        <div className="mt-4">
          <Aviso>
            Nenhum fixo ainda. Sem eles o app só mostra o que já aconteceu — que é metade da graça.
          </Aviso>
        </div>
      ) : (
        <ul className="mt-4 overflow-hidden rounded-folha border border-reguafina bg-cartao">
          {fixos.map((f) => (
            <li key={f.id} className="border-b border-reguafina last:border-b-0">
              <button
                type="button"
                onClick={() => setEditando(f)}
                className="flex w-full items-center gap-3 px-3 py-3 text-left"
              >
                <span className="w-[74px] shrink-0 text-[13px] text-fosco">
                  {f.dia === 0 ? "todo dia" : `dia ${f.dia}`}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px]">
                    {f.nota || NOME_DO_TIPO[f.tipo]}
                  </span>
                  <span className="block text-[13px] text-fosco">
                    {[
                      NOME_DO_TIPO[f.tipo],
                      f.ativo === false ? "desligado" : null,
                      f.rendaPropria ? "dinheiro seu" : null,
                      f.investimento ? "investimento" : null,
                      f.apartamento ? "apartamento" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <Dinheiro
                  cents={f.valorCents}
                  papel={f.tipo === "ENTRADA" ? "entrada" : "saida"}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {fixos.length > 0 && (
        <div className="mt-5">
          <Botao tipo="primario" onClick={preencherAteODezembro} className="w-full">
            Preencher previsão até dezembro
          </Botao>
          <p className="mt-2 text-[13px] leading-snug text-fosco">
            Escreve os fixos nos dias de hoje em diante que ainda estiverem vazios. Não mexe no
            passado e não repete o que já está lançado.
          </p>
        </div>
      )}

      {recado && (
        <p className="mt-3 text-[15px] text-grafite" role="status">
          {recado}
        </p>
      )}

      {editando && (
        <FolhaDeFixo
          fixo={editando === "novo" ? undefined : editando}
          aoFechar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function FolhaDeFixo({ fixo, aoFechar }: { fixo?: Fixo; aoFechar: () => void }) {
  const [tipo, setTipo] = useState<Tipo>(fixo?.tipo ?? "SAIDA");
  const [dia, setDia] = useState(String(fixo?.dia ?? 5));
  const [valor, setValor] = useState(
    fixo ? (fixo.valorCents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [nota, setNota] = useState(fixo?.nota ?? "");
  const [ativo, setAtivo] = useState(fixo?.ativo !== false);
  const [rendaPropria, setRendaPropria] = useState(!!fixo?.rendaPropria);
  const [investimento, setInvestimento] = useState(!!fixo?.investimento);
  const [apartamento, setApartamento] = useState(!!fixo?.apartamento);
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    const valores = parcelas(valor);
    const total = valores?.reduce((t, v) => t + v, 0) ?? 0;
    if (!valores || total === 0) {
      setErro("Digite um valor.");
      return;
    }
    loja.salvarFixo({
      id: fixo?.id,
      tipo,
      dia: Number(dia),
      valorCents: total,
      nota: nota.trim() || null,
      ativo,
      rendaPropria: tipo === "ENTRADA" && rendaPropria,
      investimento: tipo === "SAIDA" && investimento,
      apartamento: tipo === "SAIDA" && apartamento,
    });
    aoFechar();
  }

  return (
    <Folha titulo={fixo ? "Editar fixo" : "Novo fixo"} aoFechar={aoFechar}>
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

        <Campo rotulo="Valor">
          <CampoDeValor valor={valor} aoMudar={setValor} autoFocus={!fixo} />
        </Campo>

        <Campo
          rotulo="Em que dia"
          dica={
            Number(dia) === 0
              ? "Todo dia do mês."
              : Number(dia) > 28
                ? "Em mês que não tem esse dia, cai no último."
                : undefined
          }
        >
          <select
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className="mt-1 w-full rounded-folha border border-regua bg-cartao px-4 py-3 outline-none focus:border-saldo"
          >
            <option value="0">Todo dia</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Dia {d}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Nome" dica="Como ele aparece na lista.">
          <CampoDeTexto valor={nota} aoMudar={setNota} placeholder="salário" />
        </Campo>

        <label className="flex items-center gap-3 rounded-folha border border-reguafina p-3">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="h-5 w-5 accent-[var(--saldo)]"
          />
          <span className="text-[17px]">Ligado</span>
        </label>

        {tipo === "ENTRADA" && (
          <label className="flex items-center gap-3 rounded-folha border border-reguafina p-3">
            <input
              type="checkbox"
              checked={rendaPropria}
              onChange={(e) => setRendaPropria(e.target.checked)}
              className="h-5 w-5 accent-[var(--saldo)]"
            />
            <span className="text-[17px]">É dinheiro seu</span>
          </label>
        )}

        {tipo === "SAIDA" && (
          <>
            <label className="flex items-center gap-3 rounded-folha border border-reguafina p-3">
              <input
                type="checkbox"
                checked={investimento}
                onChange={(e) => setInvestimento(e.target.checked)}
                className="h-5 w-5 accent-[var(--saldo)]"
              />
              <span className="text-[17px]">Foi para investimento</span>
            </label>
            <label className="flex items-center gap-3 rounded-folha border border-reguafina p-3">
              <input
                type="checkbox"
                checked={apartamento}
                onChange={(e) => setApartamento(e.target.checked)}
                className="h-5 w-5 accent-[var(--saldo)]"
              />
              <span className="text-[17px]">É do apartamento</span>
            </label>
          </>
        )}

        {erro && (
          <p role="alert" className="text-[15px] text-atencao">
            {erro}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Botao tipo="primario" onClick={salvar} className="flex-1">
            Salvar
          </Botao>
          {fixo && (
            <Botao
              tipo="perigo"
              onClick={() => {
                loja.apagarFixo(fixo.id);
                aoFechar();
              }}
            >
              Apagar
            </Botao>
          )}
        </div>

        <p className="text-[13px] leading-snug text-fosco">
          Apagar um fixo não apaga o que ele já escreveu nos dias. Os lançamentos previstos
          continuam lá, e você apaga os que não quiser.
        </p>
      </div>
    </Folha>
  );
}
