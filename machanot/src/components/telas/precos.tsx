"use client";

import { useState } from "react";
import { useMachane } from "@/components/machane/provedor";
import { Cartao, CartaoCorpo, CartaoDescricao, CartaoTitulo, CartaoTopo } from "@/components/ui/card";
import { Rotulo, Selecao } from "@/components/ui/input";
import { Botao } from "@/components/ui/button";
import { Tabela, Td, Th } from "@/components/ui/table";
import { Aviso } from "@/components/ui/avisos";
import { CampoDinheiro, CampoDinheiroOpcional, CampoPercentual } from "@/components/campos";
import { brl, brlComSinal, pct, reais } from "@/lib/dinheiro";
import { ARREDONDAMENTOS } from "@/lib/textos";
import { linhasDaGrade, textoDivulgacao } from "@/lib/divulgacao";
import { baixarPdfDePrecos } from "@/lib/pdf";
import type { Arredondamento } from "@/lib/estado";

/** Um campo com o nome em português e uma frase dizendo o que ele faz. */
function Ajuste({
  rotulo,
  explicacao,
  children,
}: {
  rotulo: string;
  explicacao: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Rotulo>{rotulo}</Rotulo>
      {children}
      <p className="mt-1 text-[11px] leading-snug text-suave">{explicacao}</p>
    </div>
  );
}

function LinhaConta({
  rotulo,
  valor,
  tipo = "parcela",
}: {
  rotulo: string;
  valor: string;
  tipo?: "base" | "parcela" | "total";
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 py-1 ${
        tipo === "total" ? "mt-1 border-t border-borda pt-2 font-semibold" : ""
      }`}
    >
      <span className={tipo === "parcela" ? "text-suave" : ""}>{rotulo}</span>
      <span className={`tabular ${tipo === "total" ? "text-base" : "text-sm"}`}>{valor}</span>
    </div>
  );
}

/** A conta que leva do custo rateado ao preço divulgado, turma por turma. */
function Montagem({
  turma,
  custo,
  margem,
  preco,
  chanichim,
  dias,
  percentual,
}: {
  turma: string;
  custo: number;
  margem: number;
  preco: number;
  chanichim: number;
  dias: number;
  percentual: number | null;
}) {
  return (
    <div className="rounded-md border border-borda p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-suave">
        {turma} · {chanichim} chanichim · {dias} dias
      </p>
      <LinhaConta rotulo="custo rateado de cada um" valor={brl(custo)} tipo="base" />
      <LinhaConta
        rotulo={percentual === null ? "margem que vocês escolheram" : `margem de ${pct(percentual)}`}
        valor={brlComSinal(margem)}
      />
      <LinhaConta rotulo="preço do 1º filho sócio" valor={brl(preco)} tipo="total" />
    </div>
  );
}

export function TelaPrecos() {
  const { estado, resultado: r, editarPolitica, somenteLeitura } = useMachane();
  const p = estado.politica;
  const [copiado, setCopiado] = useState(false);
  const aditivo = p.metodo === "ADITIVO";
  const texto = textoDivulgacao(estado, r);

  const naoSocio = aditivo ? (p.acrescimoNaoSocioCents ?? 0) : null;
  const segundoFilho = aditivo ? (p.descontoSegundoFilhoCents ?? 0) : null;

  return (
    <div className="space-y-4">
      <Cartao>
        <CartaoTopo>
          <CartaoTitulo>Como o preço se monta</CartaoTitulo>
          <CartaoDescricao>
            O custo de cada criança vem do rateio, calculado nas telas anteriores. A única coisa
            escolhida aqui é a margem — nenhum preço é digitado à mão nesta plataforma.
          </CartaoDescricao>
        </CartaoTopo>
        <CartaoCorpo className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Montagem
              turma="grandes"
              custo={r.custoPorChanichGrandesCents}
              margem={r.precosGrandes.primeiroFilhoSocio - r.custoPorChanichGrandesCents}
              preco={r.precosGrandes.primeiroFilhoSocio}
              chanichim={r.chanichimGrandes}
              dias={estado.diasGrandes}
              percentual={aditivo ? null : (p.margemBasePct ?? 0)}
            />
            <Montagem
              turma="pequenos/babys"
              custo={r.custoPorChanichPequenosCents}
              margem={r.precosPequenos.primeiroFilhoSocio - r.custoPorChanichPequenosCents}
              preco={r.precosPequenos.primeiroFilhoSocio}
              chanichim={r.chanichimPequenos}
              dias={estado.diasPequenos}
              percentual={aditivo ? null : (p.margemBasePct ?? 0)}
            />
          </div>

          <p className="text-xs leading-relaxed text-suave">
            A partir desse preço saem as outras três linhas da tabela:{" "}
            {aditivo ? (
              <>
                quem não é sócio paga <strong>{brl(naoSocio ?? 0)}</strong> a mais, o segundo filho
                da mesma família paga <strong>{brl(segundoFilho ?? 0)}</strong> a menos, e a segunda
                leva soma <strong>{brl(p.acrescimoSegundaLevaCents)}</strong> em qualquer uma delas.
              </>
            ) : (
              <>
                quem não é sócio paga <strong>{pct(p.acrescimoNaoSocioPct ?? 0)}</strong> a mais, o
                segundo filho paga <strong>{pct(p.descontoSegundoFilhoPct ?? 0)}</strong> a menos, e
                a segunda leva soma <strong>{brl(p.acrescimoSegundaLevaCents)}</strong>.
              </>
            )}
          </p>

          {p.arredondamento !== "NENHUM" ? (
            <Aviso>
              O arredondamento está ligado, então o preço divulgado não bate centavo a centavo com a
              conta acima. A diferença já está refletida no superávit.
            </Aviso>
          ) : null}
        </CartaoCorpo>
      </Cartao>

      <Cartao>
        <CartaoTopo>
          <CartaoTitulo>Os números que vocês escolhem</CartaoTitulo>
          <CartaoDescricao>
            Quatro decisões comerciais. Mexa em qualquer uma e olhe a tabela abaixo mudando.
          </CartaoDescricao>
        </CartaoTopo>
        <CartaoCorpo className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {aditivo ? (
              <>
                <Ajuste
                  rotulo="Margem — grandes"
                  explicacao="Quanto a machané cobra além do custo de cada chanich grande. Zero = preço igual ao custo."
                >
                  <CampoDinheiro
                    valor={p.margemBaseGrandesCents ?? 0}
                    disabled={somenteLeitura}
                    aoMudar={(c) => editarPolitica({ margemBaseGrandesCents: c })}
                  />
                </Ajuste>
                <Ajuste
                  rotulo="Margem — pequenos"
                  explicacao="O mesmo para os babys. Costuma ser maior, para a diferença de preço entre as turmas não assustar."
                >
                  <CampoDinheiro
                    valor={p.margemBasePequenosCents ?? 0}
                    disabled={somenteLeitura}
                    aoMudar={(c) => editarPolitica({ margemBasePequenosCents: c })}
                  />
                </Ajuste>
                <Ajuste
                  rotulo="A mais: não-sócio"
                  explicacao="Quanto a família que não é sócia do movimento paga além do preço de sócio."
                >
                  <CampoDinheiro
                    valor={p.acrescimoNaoSocioCents ?? 0}
                    disabled={somenteLeitura}
                    aoMudar={(c) => editarPolitica({ acrescimoNaoSocioCents: c })}
                  />
                </Ajuste>
                <Ajuste
                  rotulo="A menos: 2º filho"
                  explicacao="Desconto para a segunda criança da mesma família na mesma machané."
                >
                  <CampoDinheiro
                    valor={p.descontoSegundoFilhoCents ?? 0}
                    disabled={somenteLeitura}
                    aoMudar={(c) => editarPolitica({ descontoSegundoFilhoCents: c })}
                  />
                </Ajuste>
              </>
            ) : (
              <>
                <Ajuste
                  rotulo="Margem sobre o custo"
                  explicacao="Percentual somado ao custo rateado, igual para as duas turmas."
                >
                  <CampoPercentual
                    valor={p.margemBasePct ?? 0}
                    disabled={somenteLeitura}
                    aoMudar={(f) => editarPolitica({ margemBasePct: f })}
                  />
                </Ajuste>
                <Ajuste rotulo="A mais: não-sócio" explicacao="Percentual a mais para quem não é sócio.">
                  <CampoPercentual
                    valor={p.acrescimoNaoSocioPct ?? 0}
                    disabled={somenteLeitura}
                    aoMudar={(f) => editarPolitica({ acrescimoNaoSocioPct: f })}
                  />
                </Ajuste>
                <Ajuste rotulo="A menos: 2º filho" explicacao="Percentual de desconto para o segundo filho.">
                  <CampoPercentual
                    valor={p.descontoSegundoFilhoPct ?? 0}
                    disabled={somenteLeitura}
                    aoMudar={(f) => editarPolitica({ descontoSegundoFilhoPct: f })}
                  />
                </Ajuste>
                <div />
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Ajuste
              rotulo="A mais: segunda leva"
              explicacao="Quanto a inscrição tardia paga a mais, somado em todas as oito células da tabela."
            >
              <CampoDinheiro
                valor={p.acrescimoSegundaLevaCents}
                disabled={somenteLeitura}
                aoMudar={(c) => editarPolitica({ acrescimoSegundaLevaCents: c })}
              />
            </Ajuste>
            <Ajuste
              rotulo="Arredondar o preço final"
              explicacao="Deixa a tabela redonda para divulgar. O centavo que sobra ou falta aparece no superávit."
            >
              <Selecao
                value={p.arredondamento}
                disabled={somenteLeitura}
                onChange={(e) => editarPolitica({ arredondamento: e.target.value as Arredondamento })}
              >
                {Object.entries(ARREDONDAMENTOS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Selecao>
            </Ajuste>
          </div>

          <details className="rounded-md border border-borda bg-fundo/60 p-3">
            <summary className="cursor-pointer text-xs font-medium">Ajustes raros</summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Ajuste
                rotulo="Margem em reais ou em porcentagem"
                explicacao="Em reais, vocês somam um valor fixo ao custo. Em porcentagem, o acréscimo acompanha o custo."
              >
                <Selecao
                  value={p.metodo}
                  disabled={somenteLeitura}
                  onChange={(e) =>
                    editarPolitica({ metodo: e.target.value as "ADITIVO" | "MULTIPLICATIVO" })
                  }
                >
                  <option value="ADITIVO">em reais (R$)</option>
                  <option value="MULTIPLICATIVO">em porcentagem (%)</option>
                </Selecao>
              </Ajuste>
              <Ajuste
                rotulo="Sobra planejada"
                explicacao="Se a machané precisa terminar com caixa, escreva quanto. O valor é dividido entre os chanichim como se fosse custo — e por isso aparece no preço."
              >
                <CampoDinheiro
                  valor={p.superavitAlvoCents}
                  disabled={somenteLeitura}
                  aoMudar={(c) => editarPolitica({ superavitAlvoCents: c })}
                />
              </Ajuste>
            </div>

            <div className="mt-4 border-t border-borda pt-3">
              <p className="text-[11px] leading-relaxed text-suave">
                Desconto de 2º filho diferente por turma. O modelo é regular: o mesmo desconto vale
                para sócio e não-sócio. A planilha de 2026 descontava R$ 130 nos grandes e R$ 100
                nos pequenos — preencha abaixo só se quiser reproduzir essa diferença. Vazio, vale o
                desconto único.
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <Rotulo>Grandes</Rotulo>
                  {aditivo ? (
                    <CampoDinheiroOpcional
                      valor={p.descontoSegundoFilhoGrandesCents ?? null}
                      disabled={somenteLeitura}
                      aoMudar={(c) => editarPolitica({ descontoSegundoFilhoGrandesCents: c })}
                    />
                  ) : (
                    <CampoPercentual
                      valor={p.descontoSegundoFilhoGrandesPct ?? null}
                      disabled={somenteLeitura}
                      aoMudar={(f) => editarPolitica({ descontoSegundoFilhoGrandesPct: f })}
                    />
                  )}
                </div>
                <div>
                  <Rotulo>Pequenos</Rotulo>
                  {aditivo ? (
                    <CampoDinheiroOpcional
                      valor={p.descontoSegundoFilhoPequenosCents ?? null}
                      disabled={somenteLeitura}
                      aoMudar={(c) => editarPolitica({ descontoSegundoFilhoPequenosCents: c })}
                    />
                  ) : (
                    <CampoPercentual
                      valor={p.descontoSegundoFilhoPequenosPct ?? null}
                      disabled={somenteLeitura}
                      aoMudar={(f) => editarPolitica({ descontoSegundoFilhoPequenosPct: f })}
                    />
                  )}
                </div>
              </div>
            </div>
          </details>
        </CartaoCorpo>
      </Cartao>

      <Cartao>
        <CartaoTopo className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CartaoTitulo>A tabela que vai para as famílias</CartaoTitulo>
            <CartaoDescricao>
              Quatro tipos de inscrição × duas turmas, mais a segunda leva.
            </CartaoDescricao>
          </div>
          <div className="flex gap-2">
            <Botao
              variante="contorno"
              tamanho="pequeno"
              onClick={() => void baixarPdfDePrecos(estado, r)}
            >
              Baixar PDF
            </Botao>
            <a href={`/api/machane/${estado.id}/csv`} download>
              <Botao variante="contorno" tamanho="pequeno">
                Baixar CSV do orçamento
              </Botao>
            </a>
          </div>
        </CartaoTopo>
        <CartaoCorpo className="p-0">
          <Tabela>
            <thead>
              <tr>
                <Th className="min-w-[150px]" />
                <Th className="text-right">grandes</Th>
                <Th className="text-right">grandes · 2ª leva</Th>
                <Th className="text-right">pequenos</Th>
                <Th className="text-right">pequenos · 2ª leva</Th>
              </tr>
            </thead>
            <tbody>
              {linhasDaGrade.map(([chave, rotulo]) => (
                <tr key={chave}>
                  <Td className="text-sm">{rotulo}</Td>
                  <Td className="tabular text-right font-medium">{brl(r.precosGrandes[chave])}</Td>
                  <Td className="tabular text-right">{brl(r.segundaLevaGrandes[chave])}</Td>
                  <Td className="tabular text-right font-medium">{brl(r.precosPequenos[chave])}</Td>
                  <Td className="tabular text-right">{brl(r.segundaLevaPequenos[chave])}</Td>
                </tr>
              ))}
              <tr className="bg-fundo text-xs text-suave">
                <Td>custo rateado, antes da margem</Td>
                <Td className="tabular text-right">{brl(r.custoPorChanichGrandesCents)}</Td>
                <Td />
                <Td className="tabular text-right">{brl(r.custoPorChanichPequenosCents)}</Td>
                <Td />
              </tr>
            </tbody>
          </Tabela>
        </CartaoCorpo>
      </Cartao>

      <div className="grid gap-3 lg:grid-cols-2">
        <Cartao>
          <CartaoTopo className="flex items-center justify-between">
            <CartaoTitulo>Texto para divulgação</CartaoTitulo>
            <Botao
              variante="contorno"
              tamanho="pequeno"
              onClick={() => {
                void navigator.clipboard.writeText(texto).then(() => {
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                });
              }}
            >
              {copiado ? "copiado!" : "copiar"}
            </Botao>
          </CartaoTopo>
          <CartaoCorpo>
            <pre className="whitespace-pre-wrap rounded-md border border-borda bg-fundo/60 p-3 text-xs leading-relaxed">
              {texto}
            </pre>
          </CartaoCorpo>
        </Cartao>

        <Cartao>
          <CartaoTopo>
            <CartaoTitulo>Conferência</CartaoTitulo>
          </CartaoTopo>
          <CartaoCorpo className="space-y-2 text-xs leading-relaxed">
            <p>
              Se todos os {r.chanichimGrandes + r.chanichimPequenos} chanichim fossem 1º filho
              sócio, entrariam <strong>{brl(r.receitaSeTodosPrimeiroFilhoSocioCents)}</strong>, mais{" "}
              {brl(r.receitaMadrichimCents)} dos madrichim, contra um custo de{" "}
              {brl(r.custoTotalCents)}.
            </p>
            <p>
              Isso dá{" "}
              <strong className={r.superavitProjetadoCents < 0 ? "text-erro" : "text-ok"}>
                {r.superavitProjetadoCents < 0 ? "déficit" : "superávit"} de R${" "}
                {reais(Math.abs(r.superavitProjetadoCents))}
              </strong>
              . Não-sócios e segunda leva só aumentam esse número.
            </p>
            <p className="text-suave">
              Baixe o CSV antes de cada machané: é o seu backup do orçamento, e ele não depende
              desta plataforma continuar no ar.
            </p>
          </CartaoCorpo>
        </Cartao>
      </div>
    </div>
  );
}
