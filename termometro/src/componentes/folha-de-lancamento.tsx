"use client";

import { useRef, useState } from "react";
import type { PartidaDoAtalho } from "@/lib/atalhos";
import { avaliar } from "@/lib/calculadora";
import { categoriaPelaNota } from "@/lib/busca";
import { categoriasDoTipo, nomeDaCategoria } from "@/lib/categorias";
import { paraOTeclado } from "@/lib/dinheiro";
import { curta, dataExiste, hoje, mesesDepois, porExtenso } from "@/lib/datas";
import { categoriasDe, lancamentosVivos, loja } from "@/lib/loja";
import { EXPLICACAO_DO_TIPO, NOME_DO_TIPO, TIPOS, type Lancamento, type Tipo } from "@/lib/tipos";
import { Botao, CampoDeTexto, Folha, Sobrescrito } from "./pecas";
import { useEstado } from "./usar-loja";
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
  partida,
  aoFechar,
}: {
  data: string;
  lancamento?: Lancamento;
  tipoInicial?: Tipo;
  /**
   * O que um atalho de lançamento rápido já deixou preenchido. Vence
   * `tipoInicial`, porque o atalho diz a coluna junto com o resto.
   */
  partida?: PartidaDoAtalho;
  aoFechar: () => void;
}) {
  const editando = !!lancamento;

  const [tipo, setTipo] = useState<Tipo>(lancamento?.tipo ?? partida?.tipo ?? tipoInicial);
  const [valor, setValor] = useState(() =>
    paraOTeclado(lancamento?.valorCents ?? partida?.valorCents),
  );
  const [quando, setQuando] = useState(lancamento?.data ?? data);
  const [nota, setNota] = useState(lancamento?.nota ?? partida?.nota ?? "");
  const [categoria, setCategoria] = useState<string | null>(
    lancamento?.categoria ?? partida?.categoria ?? null,
  );
  const [marcado, setMarcado] = useState({
    rendaPropria: !!lancamento?.rendaPropria,
    investimento: !!lancamento?.investimento,
    apartamento: !!lancamento?.apartamento,
    credito: !!lancamento?.credito,
  });
  const [erro, setErro] = useState<string | null>(null);
  // Editar um previsto NÃO o confirma: mexer na nota da fatura não é dizer que
  // ela foi paga. Confirmar é este chip, ou o "Aconteceu" da folha do dia.
  const [aconteceu, setAconteceu] = useState(false);
  // Dois toques rápidos no mesmo botão são um lançamento só, não dois.
  const jaSalvou = useRef(false);

  // Em quantas vezes (só saída nova): 1 é à vista; 10 grava dez lançamentos,
  // um por mês, os futuros como previstos — dívida assumida é previsão.
  const [vezes, setVezes] = useState(1);

  const conta = avaliar(valor);
  const dataOk = dataExiste(quando);
  const estado = useEstado();
  const categorias = categoriasDe(estado);
  const daColuna = categoriasDoTipo(categorias, tipo);
  // Trocar de coluna troca a lista, e a categoria escolhida pode não existir na
  // nova: "fatura" não é gasto do dia a dia. Em vez de guardar uma escolha
  // impossível, ela é esquecida — e o que fica na tela é o que vai ser salvo.
  const escolhida = daColuna.some((c) => c.id === categoria) ? categoria : null;

  // A memória do hábito: "ifood" foi Comida quarenta vezes, a tela oferece a
  // quadragésima primeira. Oferece — quem escolhe é o dedo.
  const idSugerido =
    !escolhida && !editando && nota.trim()
      ? categoriaPelaNota(lancamentosVivos(estado), nota)
      : null;
  const sugestao = idSugerido && daColuna.some((c) => c.id === idSugerido) ? idSugerido : null;

  function salvar() {
    if (jaSalvou.current) return;
    if (!conta) {
      setErro("Digite um valor.");
      return;
    }
    if (tipo === "SAIDA" && vezes > 1 && conta.parcelas.length > 1) {
      setErro("Parcelado não combina com soma de valores: digite só o valor da parcela.");
      return;
    }
    if (!dataExiste(quando)) {
      // O campo de data deixa apagar o dia; salvar assim gravaria um
      // lançamento com data vazia — dinheiro que some de todas as telas.
      setErro("Escolha um dia.");
      return;
    }
    jaSalvou.current = true;

    const comum = {
      data: quando,
      tipo,
      nota: nota.trim() || null,
      categoria: escolhida,
      previsto: editando ? !!lancamento.previsto && !aconteceu : false,
      rendaPropria: tipo === "ENTRADA" && marcado.rendaPropria,
      investimento: tipo === "SAIDA" && marcado.investimento,
      apartamento: tipo === "SAIDA" && marcado.apartamento,
      credito: tipo === "DIARIO" && marcado.credito,
      fixoId: lancamento?.fixoId ?? null,
    };

    if (editando) {
      loja.salvarLancamento({ ...comum, id: lancamento.id, valorCents: conta.totalCents });
    } else if (tipo === "SAIDA" && vezes > 1) {
      // Parcelado: o valor digitado é o DA PARCELA — é assim que a loja fala
      // ("10x de 39,90"). Um lançamento por mês, no mesmo dia; os futuros
      // nascem previstos, porque dívida assumida é previsão, e o cartão
      // "Aconteceu mesmo?" cobra cada um na data.
      const base = comum.nota ?? "Parcela";
      for (let k = 0; k < vezes; k++) {
        loja.salvarLancamento({
          ...comum,
          data: mesesDepois(quando, k),
          nota: `${base} (${k + 1}/${vezes})`,
          previsto: k > 0,
          valorCents: conta.totalCents,
        });
      }
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

        {daColuna.length > 0 && (
          <div className="!mt-4">
            <Sobrescrito>{tipo === "ENTRADA" ? "De onde veio" : "Para onde foi"}</Sobrescrito>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {daColuna.map((c) => (
                <Chip
                  key={c.id}
                  ligado={escolhida === c.id}
                  aoTocar={() => setCategoria(escolhida === c.id ? null : c.id)}
                >
                  {c.nome}
                </Chip>
              ))}
            </div>
            {sugestao && (
              <p className="mt-1.5 text-[12.5px] text-fosco">
                Da última vez, “{nota.trim()}” foi{" "}
                <button
                  type="button"
                  onClick={() => setCategoria(sugestao)}
                  className="font-medium text-tinta underline"
                >
                  {nomeDaCategoria(categorias, sugestao)}
                </button>
                .
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <CampoDeTexto valor={nota} aoMudar={setNota} placeholder="Observação" maxLength={500} />
          <input
            type="date"
            value={quando}
            onChange={(e) => setQuando(e.target.value)}
            aria-label="Dia do lançamento"
            className="tabular mt-1.5 w-[150px] shrink-0 rounded-folha border border-regua bg-cartao px-3 py-3 text-[15px] outline-none focus:border-saldo"
          />
        </div>
        {dataOk && quando !== data && (
          <p className="!mt-1.5 text-[12.5px] text-fosco">{porExtenso(quando)}</p>
        )}

        {tipo === "DIARIO" && (
          <Marcacoes>
            <Chip
              ligado={marcado.credito}
              aoTocar={() => setMarcado((m) => ({ ...m, credito: !m.credito }))}
            >
              No crédito
            </Chip>
            <span className="text-[12.5px] leading-snug text-fosco">
              {marcado.credito
                ? "Vai para a fatura do cartão e não mexe no saldo de agora."
                : "Pago na hora (débito, Pix, dinheiro). Se foi no cartão de crédito, marque."}
            </span>
          </Marcacoes>
        )}

        {tipo === "SAIDA" && !editando && (
          <Marcacoes>
            <label className="flex items-center gap-2 text-[14px] text-grafite">
              Em
              <select
                value={vezes}
                onChange={(e) => setVezes(Number(e.target.value))}
                className="rounded-folha border border-regua bg-cartao px-2 py-2 text-[15px]"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "1 vez" : `${n}x`}
                  </option>
                ))}
              </select>
            </label>
            {vezes > 1 && (
              <span className="text-[12.5px] leading-snug text-fosco">
                O valor é o de cada parcela. Uma por mês a partir de {dataOk ? curta(quando) : "…"};
                as futuras entram como previstas.
              </span>
            )}
          </Marcacoes>
        )}

        {editando && lancamento.previsto && (
          <Marcacoes>
            <Chip ligado={aconteceu} aoTocar={() => setAconteceu(!aconteceu)}>
              Aconteceu
            </Chip>
            <span className="text-[12.5px] leading-snug text-fosco">
              Isto é uma previsão. Marque quando acontecer de verdade.
            </span>
          </Marcacoes>
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

        {editando && (
          <button
            type="button"
            onClick={() => {
              if (!conta) return;
              // O gasto que se repete sem ser fixo: mesmo valor, mesma nota,
              // mesma categoria — só a data é a de hoje.
              loja.salvarLancamento({
                data: hoje(),
                tipo,
                valorCents: conta.totalCents,
                nota: nota.trim() || null,
                categoria: escolhida,
                previsto: false,
                rendaPropria: tipo === "ENTRADA" && marcado.rendaPropria,
                investimento: tipo === "SAIDA" && marcado.investimento,
                apartamento: tipo === "SAIDA" && marcado.apartamento,
                credito: tipo === "DIARIO" && marcado.credito,
                fixoId: null,
              });
              aoFechar();
            }}
            className="text-[13.5px] text-grafite underline"
          >
            Lançar um igual hoje
          </button>
        )}

        {erro && (
          <p role="alert" className="text-[14px] text-atencao">
            {erro}
          </p>
        )}

        {/* Grudado no rodapé do que está visível: a folha inteira é mais alta
            que a tela do iPhone, e o botão de confirmar ficava sempre abaixo
            da dobra — lançar pedia uma rolagem às cegas. */}
        <div className="sticky bottom-0 -mx-1 flex gap-2 bg-papel px-1 pb-1 pt-2">
          <Botao tipo="primario" onClick={salvar} className="flex-1">
            {editando ? "Salvar" : dataOk ? `Lançar em ${curta(quando)}` : "Escolha um dia"}
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
