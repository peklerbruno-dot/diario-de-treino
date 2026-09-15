"use client";

import { useState } from "react";
import { Aviso, Botao, Dinheiro } from "@/componentes/pecas";
import { useEstado } from "@/componentes/usar-loja";
import { MESES_CURTOS, hoje } from "@/lib/datas";
import { comCifrao } from "@/lib/dinheiro";
import { guardarSaldoInicial, lancamentosVivos, loja } from "@/lib/loja";
import { abasDeAno, lerPlanilha, type ResultadoImportacao } from "@/lib/planilha";

/**
 * Trazer a planilha para dentro do app.
 *
 * O arquivo é lido aqui mesmo, no aparelho: ele não sobe para servidor nenhum
 * antes de virar dado seu. Depois de conferido, o que vai para o banco são os
 * lançamentos — nunca o arquivo.
 */
export function TelaDeImportacao() {
  const estado = useEstado();
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [lido, setLido] = useState<ResultadoImportacao | null>(null);
  const [abas, setAbas] = useState<string[]>([]);
  const [arquivo, setArquivo] = useState<ArrayBuffer | null>(null);
  const [substituir, setSubstituir] = useState(true);
  const [pronto, setPronto] = useState<string | null>(null);

  const jaExistentes = lido
    ? lancamentosVivos(estado).filter((l) => l.data.startsWith(String(lido.ano)))
    : [];

  async function abrirArquivo(entrada: File) {
    setLendo(true);
    setErro(null);
    try {
      const bytes = await entrada.arrayBuffer();
      // O SheetJS só é baixado quando alguém importa de verdade — são umas
      // centenas de kB que não fazem falta no dia a dia do app.
      const XLSX = await import("xlsx");
      const pasta = XLSX.read(bytes, { type: "array", cellFormula: true });
      setArquivo(bytes);
      setAbas(abasDeAno(pasta));
      setLido(lerPlanilha(pasta, { hoje: hoje() }));
      setPronto(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setLido(null);
    } finally {
      setLendo(false);
    }
  }

  async function trocarDeAba(aba: string) {
    if (!arquivo) return;
    setLendo(true);
    try {
      const XLSX = await import("xlsx");
      const pasta = XLSX.read(arquivo, { type: "array", cellFormula: true });
      setLido(lerPlanilha(pasta, { aba, hoje: hoje() }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLendo(false);
    }
  }

  function confirmar() {
    if (!lido) return;
    if (substituir) {
      for (const l of jaExistentes) loja.apagarLancamento(l.id);
    }
    loja.salvarVariosLancamentos(lido.lancamentos);
    guardarSaldoInicial(lido.ano, lido.saldoInicialCents);
    setPronto(
      `Pronto: ${lido.lancamentos.length} lançamentos de ${lido.ano} entraram. ` +
        "Eles já estão indo para o servidor, e vão aparecer nos seus outros aparelhos.",
    );
    setLido(null);
    setArquivo(null);
  }

  return (
    <div>
      <h1 className="text-[22px] font-semibold tracking-tight">Importar planilha</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-grafite">
        Escolha o arquivo do Termômetro (.xlsx). O app lê a aba do ano, separa cada valor em um
        lançamento e traz junto os comentários das células.
      </p>

      <label className="mt-4 block">
        <span className="sr-only">Arquivo da planilha</span>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void abrirArquivo(f);
          }}
          className="w-full rounded-folha border border-regua bg-cartao p-3 text-[15px] file:mr-3 file:rounded-full file:border-0 file:bg-tinta file:px-4 file:py-2 file:text-papel"
        />
      </label>

      {lendo && <p className="mt-3 text-[15px] text-grafite">Lendo a planilha…</p>}

      {erro && (
        <div className="mt-4">
          <Aviso tom="atencao">{erro}</Aviso>
        </div>
      )}

      {pronto && (
        <div className="mt-4">
          <Aviso>{pronto}</Aviso>
        </div>
      )}

      {lido && (
        <section className="mt-5">
          {abas.length > 1 && (
            <label className="mb-3 block text-[15px] text-grafite">
              Qual ano
              <select
                value={lido.aba}
                onChange={(e) => void trocarDeAba(e.target.value)}
                className="ml-2 rounded-folha border border-regua bg-cartao px-3 py-2"
              >
                {abas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          )}

          <h2 className="text-[17px] font-semibold tracking-tight">
            Confira antes de trazer
          </h2>
          <div className="mt-2 rounded-folha border border-reguafina bg-cartao p-4">
            <p className="text-[15px]">
              <strong>{lido.lancamentos.length}</strong> lançamentos da aba{" "}
              <strong>{lido.aba}</strong>, começando com{" "}
              <span className="tabular">{comCifrao(lido.saldoInicialCents)}</span> de saldo.
            </p>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-[15px]">
                <thead>
                  <tr className="border-b border-regua text-[13px] text-fosco">
                    <th scope="col" className="py-2 text-left font-normal">
                      Mês
                    </th>
                    <th scope="col" className="py-2 text-right font-normal">
                      Entradas
                    </th>
                    <th scope="col" className="py-2 text-right font-normal">
                      Saídas
                    </th>
                    <th scope="col" className="py-2 text-right font-normal">
                      Diário
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lido.resumoPorMes.map((m) => (
                    <tr key={m.mes} className="border-b border-reguafina last:border-b-0">
                      <th scope="row" className="py-1.5 text-left font-normal">
                        {MESES_CURTOS[m.mes - 1]}
                      </th>
                      <td className="py-1.5 text-right">
                        <Dinheiro cents={m.entradasCents} papel="entrada" />
                      </td>
                      <td className="py-1.5 text-right">
                        <Dinheiro cents={m.saidasCents} papel="saida" />
                      </td>
                      <td className="py-1.5 text-right tabular text-grafite">
                        {comCifrao(m.diarioCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {lido.avisos.length > 0 && (
            <div className="mt-3">
              <Aviso tom="atencao">
                <span className="mb-1 block font-medium text-tinta">O que eu ajustei:</span>
                <span className="block">
                  {[...new Set(lido.avisos)].map((a) => (
                    <span key={a} className="block">
                      • {a}
                    </span>
                  ))}
                </span>
              </Aviso>
            </div>
          )}

          {jaExistentes.length > 0 && (
            <label className="mt-3 flex items-start gap-3 rounded-folha border border-atencao/40 p-3">
              <input
                type="checkbox"
                checked={substituir}
                onChange={(e) => setSubstituir(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-[var(--saldo)]"
              />
              <span>
                <span className="block text-[17px]">
                  Apagar os {jaExistentes.length} lançamentos que já existem em {lido.ano}
                </span>
                <span className="block text-[13px] leading-snug text-fosco">
                  Sem isso, a planilha entra por cima do que já está lá e tudo conta duas vezes.
                </span>
              </span>
            </label>
          )}

          <Botao tipo="primario" onClick={confirmar} className="mt-4 w-full">
            Trazer para o app
          </Botao>
        </section>
      )}
    </div>
  );
}
