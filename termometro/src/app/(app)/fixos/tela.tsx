"use client";

import { useState } from "react";
import {
  Aviso,
  Botao,
  Campo,
  CampoDeTexto,
  CampoDeValor,
  Cartao,
  Dinheiro,
  Folha,
  Sobrescrito,
  Titulo,
} from "@/componentes/pecas";
import { useEstado } from "@/componentes/usar-loja";
import { categoriasDoTipo } from "@/lib/categorias";
import {
  DIAS_DA_SEMANA,
  descreverRepeticao,
  escreverRepeticao,
  lerRepeticao,
  type Repeticao,
} from "@/lib/repeticao";
import { gerarPrevisao } from "@/lib/calculo";
import { hoje, partesDaData } from "@/lib/datas";
import { parcelas } from "@/lib/dinheiro";
import { categoriasDe, fixosVivos, lancamentosVivos, loja } from "@/lib/loja";
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

  // Até o fim do ano que vem, e não até dezembro deste. Em outubro, "até
  // dezembro" são dez semanas de futuro — pouco para decidir qualquer coisa que
  // atravesse o Ano-Novo, e a vida atravessa. Esticando até o dezembro
  // seguinte, a pergunta "dá?" sempre tem pelo menos doze meses de resposta.
  const ateQuando = partesDaData(hoje()).ano + 1;

  function preencherAPrevisao() {
    const agora = hoje();
    const novos = gerarPrevisao({
      fixos,
      de: agora,
      ate: `${ateQuando}-12-31`,
      existentes: lancamentosVivos(estado),
    });
    loja.salvarVariosLancamentos(novos);
    setRecado(
      novos.length === 0
        ? `Já estava tudo preenchido daqui até o fim de ${ateQuando}.`
        : `Escrevi ${novos.length} lançamentos previstos, de hoje até 31 de dezembro de ${ateQuando}.`,
    );
  }

  return (
    <div>
      <header className="flex items-center justify-between gap-3">
        <div>
          <Sobrescrito>Todo mês</Sobrescrito>
          <Titulo className="mt-0.5">Fixos</Titulo>
        </div>
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
        <Cartao className="mt-4 overflow-hidden">
          <ul>
            {fixos.map((f) => (
              <li key={f.id} className="border-b border-linha last:border-b-0">
                <button
                  type="button"
                  onClick={() => setEditando(f)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left"
                >
                  <span className="w-[88px] shrink-0 text-[12.5px] leading-snug text-fosco">
                    {descreverRepeticao(lerRepeticao(f))}
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
                    papel={
                      f.tipo === "ENTRADA" ? "entrada" : f.tipo === "SAIDA" ? "saida" : "diario"
                    }
                  />
                </button>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {fixos.length > 0 && (
        <div className="mt-5">
          <Botao tipo="primario" onClick={preencherAPrevisao} className="w-full">
            Preencher previsão até dezembro de {ateQuando}
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
  const categorias = categoriasDe(useEstado());
  const [tipo, setTipo] = useState<Tipo>(fixo?.tipo ?? "SAIDA");
  const [regra, setRegra] = useState<Repeticao>(
    fixo ? lerRepeticao(fixo) : { tipo: "DIA_DO_MES", dia: 5 },
  );
  const [valor, setValor] = useState(
    fixo ? (fixo.valorCents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [nota, setNota] = useState(fixo?.nota ?? "");
  const [categoria, setCategoria] = useState<string | null>(fixo?.categoria ?? null);
  const [ativo, setAtivo] = useState(fixo?.ativo !== false);
  const [rendaPropria, setRendaPropria] = useState(!!fixo?.rendaPropria);
  const [investimento, setInvestimento] = useState(!!fixo?.investimento);
  const [apartamento, setApartamento] = useState(!!fixo?.apartamento);
  const [erro, setErro] = useState<string | null>(null);

  const daColuna = categoriasDoTipo(categorias, tipo);

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
      // `dia` continua sendo escrito: é o recuo de quem ler esta linha sem
      // entender a regra, e o que mantém os fixos antigos funcionando.
      dia: regra.tipo === "DIA_DO_MES" ? regra.dia : 0,
      repeticao: escreverRepeticao(regra),
      valorCents: total,
      nota: nota.trim() || null,
      categoria: daColuna.some((c) => c.id === categoria) ? categoria : null,
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
                className={`min-h-[44px] flex-1 rounded-folha px-2 text-[17px] ${
                  tipo === t ? "bg-heroi text-heroi-tinta" : "bg-cartao text-tinta shadow-baixa"
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

        <QuandoCai regra={regra} aoMudar={setRegra} />

        <Campo rotulo="Nome" dica="Como ele aparece na lista.">
          <CampoDeTexto valor={nota} aoMudar={setNota} placeholder="salário" />
        </Campo>

        {daColuna.length > 0 && (
          <div>
            <span className="block text-[15px] text-grafite">
              Para onde vai
              <span className="ml-2 text-[13px] text-fosco">
                os lançamentos previstos herdam esta
              </span>
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {daColuna.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={categoria === c.id}
                  onClick={() => setCategoria(categoria === c.id ? null : c.id)}
                  className={`min-h-[38px] rounded-full px-4 text-[14px] shadow-baixa ${
                    categoria === c.id
                      ? "bg-saldo font-semibold text-white"
                      : "bg-cartao text-grafite"
                  }`}
                >
                  {categoria === c.id ? "✓ " : ""}
                  {c.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="flex items-center gap-3 rounded-folha bg-cartao p-3 shadow-baixa">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="h-5 w-5 accent-[var(--saldo)]"
          />
          <span className="text-[17px]">Ligado</span>
        </label>

        {tipo === "ENTRADA" && (
          <label className="flex items-center gap-3 rounded-folha bg-cartao p-3 shadow-baixa">
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
            <label className="flex items-center gap-3 rounded-folha bg-cartao p-3 shadow-baixa">
              <input
                type="checkbox"
                checked={investimento}
                onChange={(e) => setInvestimento(e.target.checked)}
                className="h-5 w-5 accent-[var(--saldo)]"
              />
              <span className="text-[17px]">Foi para investimento</span>
            </label>
            <label className="flex items-center gap-3 rounded-folha bg-cartao p-3 shadow-baixa">
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

/**
 * Quando o fixo cai.
 *
 * Quatro regras em vez de um seletor de 1 a 31, porque metade do que se repete
 * não tem dia fixo: a feira é sábado, a diarista vem toda primeira quarta, o
 * boleto vence no último dia útil. Escrever isso como "dia 4" obriga a corrigir
 * à mão todo mês — o mesmo que não ter fixo nenhum.
 */
function QuandoCai({ regra, aoMudar }: { regra: Repeticao; aoMudar: (r: Repeticao) => void }) {
  const modos = [
    { tipo: "DIA_DO_MES", rotulo: "Dia do mês" },
    { tipo: "DIA_DA_SEMANA", rotulo: "Dia da semana" },
    { tipo: "DIA_UTIL", rotulo: "Dia útil" },
    { tipo: "TODO_DIA", rotulo: "Todo dia" },
  ] as const;

  function trocarModo(tipo: (typeof modos)[number]["tipo"]) {
    if (tipo === regra.tipo) return;
    // Cada modo estreia num valor que faz sentido sozinho, para a tela nunca
    // ficar num estado que não dá para salvar.
    if (tipo === "DIA_DO_MES") aoMudar({ tipo, dia: 5 });
    else if (tipo === "DIA_DA_SEMANA") aoMudar({ tipo, ordem: 1, diaDaSemana: 3 });
    else if (tipo === "DIA_UTIL") aoMudar({ tipo, qual: "ultimo" });
    else aoMudar({ tipo: "TODO_DIA" });
  }

  return (
    <div>
      <span className="block text-[15px] text-grafite">Quando cai</span>

      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        {modos.map((m) => (
          <button
            key={m.tipo}
            type="button"
            aria-pressed={regra.tipo === m.tipo}
            onClick={() => trocarModo(m.tipo)}
            className={`min-h-[40px] rounded-folha text-[14px] ${
              regra.tipo === m.tipo
                ? "bg-heroi font-semibold text-heroi-tinta"
                : "bg-cartao text-tinta shadow-baixa"
            }`}
          >
            {m.rotulo}
          </button>
        ))}
      </div>

      {regra.tipo === "DIA_DO_MES" && (
        <select
          value={regra.dia}
          onChange={(e) => aoMudar({ tipo: "DIA_DO_MES", dia: Number(e.target.value) })}
          aria-label="Dia do mês"
          className="mt-2 w-full rounded-folha border border-regua bg-cartao px-4 py-3 outline-none focus:border-saldo"
        >
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              Dia {d}
            </option>
          ))}
        </select>
      )}

      {regra.tipo === "DIA_DA_SEMANA" && (
        <div className="mt-2 flex gap-2">
          <select
            value={regra.ordem}
            onChange={(e) =>
              aoMudar({ ...regra, ordem: Number(e.target.value) as 1 | 2 | 3 | 4 | -1 })
            }
            aria-label="Qual semana"
            className="w-full rounded-folha border border-regua bg-cartao px-3 py-3 outline-none focus:border-saldo"
          >
            <option value={1}>Primeira</option>
            <option value={2}>Segunda</option>
            <option value={3}>Terceira</option>
            <option value={4}>Quarta</option>
            <option value={-1}>Última</option>
          </select>
          <select
            value={regra.diaDaSemana}
            onChange={(e) => aoMudar({ ...regra, diaDaSemana: Number(e.target.value) })}
            aria-label="Dia da semana"
            className="w-full rounded-folha border border-regua bg-cartao px-3 py-3 outline-none focus:border-saldo"
          >
            {DIAS_DA_SEMANA.map((nome, i) => (
              <option key={nome} value={i}>
                {nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {regra.tipo === "DIA_UTIL" && (
        <select
          value={regra.qual}
          onChange={(e) =>
            aoMudar({ tipo: "DIA_UTIL", qual: e.target.value as "primeiro" | "ultimo" })
          }
          aria-label="Qual dia útil"
          className="mt-2 w-full rounded-folha border border-regua bg-cartao px-4 py-3 outline-none focus:border-saldo"
        >
          <option value="primeiro">Primeiro dia útil do mês</option>
          <option value="ultimo">Último dia útil do mês</option>
        </select>
      )}

      <p className="mt-1.5 text-[12.5px] leading-snug text-fosco">
        {regra.tipo === "DIA_DO_MES" && regra.dia > 28
          ? "Em mês que não tem esse dia, cai no último."
          : regra.tipo === "DIA_DA_SEMANA" && regra.ordem === 4
            ? "Em mês que só tem quatro, esta é a última. Para sempre pegar a última, escolha “Última”."
            : regra.tipo === "DIA_UTIL"
              ? "Dia útil aqui é de segunda a sexta. Feriado não conta — seria uma lista que não acaba, e errar nela seria pior."
              : `Cai ${descreverRepeticao(regra)}.`}
      </p>
    </div>
  );
}
