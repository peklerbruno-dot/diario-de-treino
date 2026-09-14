"use client";

import { useState } from "react";
import { useMachane } from "@/components/machane/provedor";
import { Cartao, CartaoCorpo, CartaoDescricao, CartaoTitulo, CartaoTopo } from "@/components/ui/card";
import { Rotulo, Selecao } from "@/components/ui/input";
import { Botao } from "@/components/ui/button";
import { Tabela, Td, Th } from "@/components/ui/table";
import { Aviso } from "@/components/ui/avisos";
import { CampoDinheiro, CampoDinheiroOpcional, CampoPercentual } from "@/components/campos";
import { brl, reais } from "@/lib/dinheiro";
import { ARREDONDAMENTOS, METODOS_PRECO } from "@/lib/textos";
import { linhasDaGrade, textoDivulgacao } from "@/lib/divulgacao";
import { baixarPdfDePrecos } from "@/lib/pdf";
import type { GradePrecos } from "@/lib/calculo";
import type { Arredondamento } from "@/lib/estado";

function Celula({ valor, base }: { valor: number; base?: number }) {
  return (
    <Td className="tabular text-right">
      <span className="font-medium">{brl(valor)}</span>
      {base !== undefined ? (
        <span className="ml-1 text-[11px] text-suave">({brl(valor - base)})</span>
      ) : null}
    </Td>
  );
}

function GradeTabela({
  grandes,
  pequenos,
  segundaGrandes,
  segundaPequenos,
  custoGrandes,
  custoPequenos,
}: {
  grandes: GradePrecos;
  pequenos: GradePrecos;
  segundaGrandes: GradePrecos;
  segundaPequenos: GradePrecos;
  custoGrandes: number;
  custoPequenos: number;
}) {
  return (
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
            <Celula valor={grandes[chave]} />
            <Celula valor={segundaGrandes[chave]} />
            <Celula valor={pequenos[chave]} />
            <Celula valor={segundaPequenos[chave]} />
          </tr>
        ))}
        <tr className="bg-fundo text-xs text-suave">
          <Td>custo rateado (antes da margem)</Td>
          <Td className="tabular text-right">{brl(custoGrandes)}</Td>
          <Td />
          <Td className="tabular text-right">{brl(custoPequenos)}</Td>
          <Td />
        </tr>
      </tbody>
    </Tabela>
  );
}

export function TelaPrecos() {
  const { estado, resultado: r, editarPolitica, somenteLeitura } = useMachane();
  const p = estado.politica;
  const [copiado, setCopiado] = useState(false);
  const aditivo = p.metodo === "ADITIVO";
  const texto = textoDivulgacao(estado, r);

  return (
    <div className="space-y-4">
      <Cartao>
        <CartaoTopo>
          <CartaoTitulo>Como o preço se forma a partir do custo</CartaoTitulo>
          <CartaoDescricao>
            A margem é o único número escolhido aqui. Tudo o mais vem do rateio — não existe preço
            digitado à mão nesta plataforma.
          </CartaoDescricao>
        </CartaoTopo>
        <CartaoCorpo className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Rotulo htmlFor="metodo">Método</Rotulo>
              <Selecao
                id="metodo"
                value={p.metodo}
                disabled={somenteLeitura}
                onChange={(e) =>
                  editarPolitica({ metodo: e.target.value as "ADITIVO" | "MULTIPLICATIVO" })
                }
              >
                {Object.entries(METODOS_PRECO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Selecao>
            </div>
            <div>
              <Rotulo htmlFor="arred">Arredondamento</Rotulo>
              <Selecao
                id="arred"
                value={p.arredondamento}
                disabled={somenteLeitura}
                onChange={(e) =>
                  editarPolitica({ arredondamento: e.target.value as Arredondamento })
                }
              >
                {Object.entries(ARREDONDAMENTOS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Selecao>
            </div>
            <div>
              <Rotulo htmlFor="leva">Acréscimo da 2ª leva</Rotulo>
              <CampoDinheiro
                id="leva"
                valor={p.acrescimoSegundaLevaCents}
                disabled={somenteLeitura}
                aoMudar={(c) => editarPolitica({ acrescimoSegundaLevaCents: c })}
              />
            </div>
            <div>
              <Rotulo htmlFor="alvo">Superávit-alvo (entra no rateio)</Rotulo>
              <CampoDinheiro
                id="alvo"
                valor={p.superavitAlvoCents}
                disabled={somenteLeitura}
                aoMudar={(c) => editarPolitica({ superavitAlvoCents: c })}
              />
            </div>
          </div>

          {aditivo ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Rotulo htmlFor="mg">Margem — grandes</Rotulo>
                <CampoDinheiro
                  id="mg"
                  valor={p.margemBaseGrandesCents ?? 0}
                  disabled={somenteLeitura}
                  aoMudar={(c) => editarPolitica({ margemBaseGrandesCents: c })}
                />
              </div>
              <div>
                <Rotulo htmlFor="mp">Margem — pequenos</Rotulo>
                <CampoDinheiro
                  id="mp"
                  valor={p.margemBasePequenosCents ?? 0}
                  disabled={somenteLeitura}
                  aoMudar={(c) => editarPolitica({ margemBasePequenosCents: c })}
                />
              </div>
              <div>
                <Rotulo htmlFor="ns">Acréscimo não-sócio</Rotulo>
                <CampoDinheiro
                  id="ns"
                  valor={p.acrescimoNaoSocioCents ?? 0}
                  disabled={somenteLeitura}
                  aoMudar={(c) => editarPolitica({ acrescimoNaoSocioCents: c })}
                />
              </div>
              <div>
                <Rotulo htmlFor="d2">Desconto 2º filho</Rotulo>
                <CampoDinheiro
                  id="d2"
                  valor={p.descontoSegundoFilhoCents ?? 0}
                  disabled={somenteLeitura}
                  aoMudar={(c) => editarPolitica({ descontoSegundoFilhoCents: c })}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Rotulo htmlFor="mpct">Margem sobre o custo</Rotulo>
                <CampoPercentual
                  id="mpct"
                  valor={p.margemBasePct ?? 0}
                  disabled={somenteLeitura}
                  aoMudar={(f) => editarPolitica({ margemBasePct: f })}
                />
              </div>
              <div>
                <Rotulo htmlFor="nspct">Acréscimo não-sócio</Rotulo>
                <CampoPercentual
                  id="nspct"
                  valor={p.acrescimoNaoSocioPct ?? 0}
                  disabled={somenteLeitura}
                  aoMudar={(f) => editarPolitica({ acrescimoNaoSocioPct: f })}
                />
              </div>
              <div>
                <Rotulo htmlFor="d2pct">Desconto 2º filho</Rotulo>
                <CampoPercentual
                  id="d2pct"
                  valor={p.descontoSegundoFilhoPct ?? 0}
                  disabled={somenteLeitura}
                  aoMudar={(f) => editarPolitica({ descontoSegundoFilhoPct: f })}
                />
              </div>
            </div>
          )}

          <details className="rounded-md border border-borda bg-fundo/60 p-3 text-xs">
            <summary className="cursor-pointer font-medium">
              Desconto de 2º filho diferente por turma (a grade histórica usava)
            </summary>
            <p className="mt-2 leading-relaxed text-suave">
              O modelo é regular: o mesmo desconto vale para sócio e não-sócio. A planilha de 2026
              descontava R$ 130 nos grandes e R$ 100 nos pequenos — e R$ 70 na linha de não-sócio
              dos grandes, que é arredondamento manual, não política. Preencha abaixo só se quiser
              reproduzir a diferença entre turmas; vazio, vale o desconto único.
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <Rotulo htmlFor="dg">Desconto 2º filho — grandes</Rotulo>
                {aditivo ? (
                  <CampoDinheiroOpcional
                    id="dg"
                    valor={p.descontoSegundoFilhoGrandesCents ?? null}
                    disabled={somenteLeitura}
                    aoMudar={(c) => editarPolitica({ descontoSegundoFilhoGrandesCents: c })}
                  />
                ) : (
                  <CampoPercentual
                    id="dg"
                    valor={p.descontoSegundoFilhoGrandesPct ?? null}
                    disabled={somenteLeitura}
                    aoMudar={(f) => editarPolitica({ descontoSegundoFilhoGrandesPct: f })}
                  />
                )}
              </div>
              <div>
                <Rotulo htmlFor="dp">Desconto 2º filho — pequenos</Rotulo>
                {aditivo ? (
                  <CampoDinheiroOpcional
                    id="dp"
                    valor={p.descontoSegundoFilhoPequenosCents ?? null}
                    disabled={somenteLeitura}
                    aoMudar={(c) => editarPolitica({ descontoSegundoFilhoPequenosCents: c })}
                  />
                ) : (
                  <CampoPercentual
                    id="dp"
                    valor={p.descontoSegundoFilhoPequenosPct ?? null}
                    disabled={somenteLeitura}
                    aoMudar={(f) => editarPolitica({ descontoSegundoFilhoPequenosPct: f })}
                  />
                )}
              </div>
            </div>
          </details>
        </CartaoCorpo>
      </Cartao>

      <Cartao>
        <CartaoTopo className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CartaoTitulo>A grade: 4 categorias × 2 turmas</CartaoTitulo>
            <CartaoDescricao>
              Mais a segunda leva, que soma {brl(p.acrescimoSegundaLevaCents)} em cada célula.
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
          <GradeTabela
            grandes={r.precosGrandes}
            pequenos={r.precosPequenos}
            segundaGrandes={r.segundaLevaGrandes}
            segundaPequenos={r.segundaLevaPequenos}
            custoGrandes={r.custoPorChanichGrandesCents}
            custoPequenos={r.custoPorChanichPequenosCents}
          />
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
            {p.arredondamento !== "NENHUM" ? (
              <Aviso>
                Com arredondamento ligado, o preço divulgado deixa de bater centavo a centavo com o
                custo rateado. A diferença já está refletida no superávit acima.
              </Aviso>
            ) : null}
          </CartaoCorpo>
        </Cartao>
      </div>
    </div>
  );
}
