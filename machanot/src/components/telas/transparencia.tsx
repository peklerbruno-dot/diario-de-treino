"use client";

import { useMachane } from "@/components/machane/provedor";
import { Cartao, CartaoCorpo, CartaoTitulo, CartaoTopo } from "@/components/ui/card";
import { Aviso } from "@/components/ui/avisos";
import { brl, brlRedondo, pct, pctComSinal, reais } from "@/lib/dinheiro";

function Formula({ linhas }: { linhas: string[] }) {
  return (
    <details className="mt-3 border-t border-borda pt-2">
      <summary className="cursor-pointer text-xs text-acento">
        como este número é calculado
      </summary>
      <pre className="mt-2 whitespace-pre-wrap rounded-md bg-fundo/80 p-2.5 font-mono text-[11px] leading-relaxed text-texto">
        {linhas.join("\n")}
      </pre>
    </details>
  );
}

function CartaoNumero({
  titulo,
  numero,
  frase,
  formula,
  tom,
}: {
  titulo: string;
  numero: string;
  frase: React.ReactNode;
  formula: string[];
  tom?: "ok" | "erro";
}) {
  return (
    <Cartao>
      <CartaoTopo>
        <CartaoTitulo>{titulo}</CartaoTitulo>
      </CartaoTopo>
      <CartaoCorpo>
        <p
          className={`tabular text-3xl font-semibold ${
            tom === "erro" ? "text-erro" : tom === "ok" ? "text-ok" : ""
          }`}
        >
          {numero}
        </p>
        <p className="mt-2 text-sm leading-relaxed">{frase}</p>
        <Formula linhas={formula} />
      </CartaoCorpo>
    </Cartao>
  );
}

/**
 * Tela 7 — o diferencial do produto.
 *
 * Cada cartão responde uma pergunta que a planilha não respondia: para onde vai
 * o dinheiro que os pais pagam, e quanto de cada preço é decisão política.
 */
export function TelaTransparencia() {
  const { estado, resultado: r } = useMachane();

  const precoGrande = r.precosGrandes.primeiroFilhoSocio;
  const fatiaBolsa = precoGrande > 0 ? r.impactoBolsaPorChanichGrandeCents / precoGrande : 0;
  const fatiaSubsidio = precoGrande > 0 ? r.impactoSubsidioPorChanichGrandeCents / precoGrande : 0;

  return (
    <div className="space-y-4">
      <Cartao>
        <CartaoCorpo className="text-sm leading-relaxed">
          Quatro perguntas que a planilha não respondia: quanto do preço de cada criança é subsídio
          à liderança, quanto é fundo de bolsas, de onde sai o coeficiente de rateio e qual é a
          margem de verdade. Os números abaixo são os mesmos do painel — nenhum é digitado.
        </CartaoCorpo>
      </Cartao>

      <div className="grid gap-3 lg:grid-cols-2">
        <CartaoNumero
          titulo="Subsídio à liderança"
          numero={brl(r.impactoSubsidioPorChanichGrandeCents)}
          frase={
            <>
              Os <strong>{r.quantidadeSubsidiados}</strong> madrichim e peilim custam{" "}
              <strong>{brl(r.custoDosNaoChanichimCents)}</strong> em hospedagem e pagam{" "}
              <strong>{brl(r.receitaMadrichimCents)}</strong>. Os{" "}
              <strong>{brl(r.subsidioMadrichimCents)}</strong> de diferença estão no preço dos
              chanichim: <strong>{brl(r.impactoSubsidioPorChanichGrandeCents)}</strong> por criança
              grande ({pct(fatiaSubsidio)} do preço final) e{" "}
              <strong>{brl(r.impactoSubsidioPorChanichPequenoCents)}</strong> por baby.
            </>
          }
          formula={[
            `custo da liderança = Σ (quantidade × dias × diária), só MADRICH e PT`,
            `                   = ${brl(r.custoDosNaoChanichimCents)}`,
            `receita             = ${brl(r.receitaMadrichimCents)}${
              estado.receitaMadrichimRealCents !== null
                ? "  (total real do cadastro de madrichim)"
                : "  (soma das contribuições das categorias)"
            }`,
            `subsídio            = ${brl(r.custoDosNaoChanichimCents)} − ${brl(r.receitaMadrichimCents)} = ${brl(r.subsidioMadrichimCents)}`,
            `por chanich grande  = ${brl(r.subsidioMadrichimCents)} × ${pct(r.pesoAplicado, 4)} ÷ ${r.chanichimGrandes}`,
            `                    = ${brl(r.impactoSubsidioPorChanichGrandeCents)}`,
          ]}
        />

        <CartaoNumero
          titulo="Fundo de bolsas"
          numero={brl(r.impactoBolsaPorChanichGrandeCents)}
          frase={
            <>
              O fundo de <strong>{brl(r.bolsaCents)}</strong> adiciona{" "}
              <strong>{brl(r.impactoBolsaPorChanichGrandeCents)}</strong> ao preço de cada chanich
              grande — <strong>{pct(fatiaBolsa)}</strong> do preço final — e{" "}
              <strong>{brl(r.impactoBolsaPorChanichPequenoCents)}</strong> ao de cada baby.
            </>
          }
          formula={[
            `fundo de bolsas    = Σ gastos da categoria "bolsas" = ${brl(r.bolsaCents)}`,
            `por chanich grande = ${brl(r.bolsaCents)} × ${pct(r.pesoAplicado, 4)} ÷ ${r.chanichimGrandes}`,
            `                   = ${brl(r.impactoBolsaPorChanichGrandeCents)}`,
            `fatia do preço     = ${brl(r.impactoBolsaPorChanichGrandeCents)} ÷ ${brl(precoGrande)} = ${pct(fatiaBolsa)}`,
          ]}
        />

        <CartaoNumero
          titulo="Rateio entre as turmas"
          numero={`${pct(r.pesoAplicado)} / ${pct(1 - r.pesoAplicado)}`}
          frase={
            estado.pesoOverride === null ? (
              <>
                O cálculo por pessoa-dia dá <strong>{pct(r.pesoCalculado, 2)}</strong> para os
                grandes e <strong>{pct(1 - r.pesoCalculado, 2)}</strong> para os pequenos, e é isso
                que está aplicado. Ninguém ajustou nada à mão.
              </>
            ) : (
              <>
                O cálculo por pessoa-dia daria{" "}
                <strong>
                  {pct(r.pesoCalculado, 1)} / {pct(1 - r.pesoCalculado, 1)}
                </strong>
                . Vocês aplicaram{" "}
                <strong>
                  {pct(r.pesoAplicado, 1)} / {pct(1 - r.pesoAplicado, 1)}
                </strong>
                , deslocando <strong>{brl(Math.abs(r.deslocamentoPorOverrideCents))}</strong>{" "}
                {r.deslocamentoPorOverrideCents > 0
                  ? "dos babys para os grandes"
                  : "dos grandes para os babys"}{" "}
                — {brl(Math.abs(r.deslocamentoPorChanichPequenoCents))} por baby.
              </>
            )
          }
          formula={[
            `pessoa-dia grandes  = ${r.chanichimGrandes} × ${estado.diasGrandes} = ${r.chanichimGrandes * estado.diasGrandes}`,
            `pessoa-dia pequenos = ${r.chanichimPequenos} × ${estado.diasPequenos} = ${r.chanichimPequenos * estado.diasPequenos}`,
            `peso calculado      = ${r.chanichimGrandes * estado.diasGrandes} ÷ ${
              r.chanichimGrandes * estado.diasGrandes + r.chanichimPequenos * estado.diasPequenos
            } = ${pct(r.pesoCalculado, 4)}`,
            `peso aplicado       = ${pct(r.pesoAplicado, 4)}${
              estado.pesoOverride === null ? "  (o calculado)" : "  (ajustado à mão)"
            }`,
            `deslocamento        = ${brl(r.aRatearCents)} × (${(r.pesoAplicado).toFixed(6)} − ${r.pesoCalculado.toFixed(6)})`,
            `                    = ${brl(r.deslocamentoPorOverrideCents)}`,
            ...(estado.pesoJustificativa ? [``, `justificativa: ${estado.pesoJustificativa}`] : []),
          ]}
        />

        <CartaoNumero
          titulo="Margem real"
          numero={`${brl(r.superavitProjetadoCents)} (${pctComSinal(r.superavitProjetadoPct)})`}
          tom={r.superavitProjetadoCents < 0 ? "erro" : "ok"}
          frase={
            <>
              Se todos forem 1º filho sócio, entram{" "}
              <strong>{brl(r.receitaSeTodosPrimeiroFilhoSocioCents)}</strong> dos chanichim mais{" "}
              <strong>{brl(r.receitaMadrichimCents)}</strong> dos madrichim, contra um custo de{" "}
              <strong>{brl(r.custoTotalCents)}</strong>.{" "}
              {r.superavitProjetadoCents < 0 ? "Déficit" : "Superávit"} de{" "}
              <strong>R$ {reais(Math.abs(r.superavitProjetadoCents))}</strong> (
              {pctComSinal(r.superavitProjetadoPct)}). Não-sócios e segunda leva só melhoram esse
              número.
            </>
          }
          formula={[
            `receita chanichim = ${r.chanichimGrandes} × ${brl(r.precosGrandes.primeiroFilhoSocio)} + ${r.chanichimPequenos} × ${brl(r.precosPequenos.primeiroFilhoSocio)}`,
            `                  = ${brl(r.receitaSeTodosPrimeiroFilhoSocioCents)}`,
            `receita madrichim = ${brl(r.receitaMadrichimCents)}`,
            `custo total       = hospedagem ${brl(r.hospedagemCents)} + fixos ${brl(r.gastosFixosCents)} = ${brl(r.custoTotalCents)}`,
            `superávit         = ${brl(r.receitaSeTodosPrimeiroFilhoSocioCents)} + ${brl(r.receitaMadrichimCents)} − ${brl(r.custoTotalCents)}`,
            `                  = ${brl(r.superavitProjetadoCents)} (${pctComSinal(r.superavitProjetadoPct)})`,
          ]}
        />
      </div>

      <Cartao>
        <CartaoTopo>
          <CartaoTitulo>
            De onde vêm os {brlRedondo(r.custoPorChanichGrandesCents)} de custo de um chanich grande
          </CartaoTitulo>
        </CartaoTopo>
        <CartaoCorpo className="space-y-2 text-sm">
          <p className="text-xs text-suave">
            O custo rateado de cada criança grande, aberto nas três decisões que mais pesam.
          </p>
          <ul className="space-y-1 text-sm">
            <li className="flex justify-between border-b border-borda/60 py-1">
              <span>fundo de bolsas</span>
              <span className="tabular font-medium">
                {brl(r.impactoBolsaPorChanichGrandeCents)}
              </span>
            </li>
            <li className="flex justify-between border-b border-borda/60 py-1">
              <span>subsídio aos madrichim e peilim</span>
              <span className="tabular font-medium">
                {brl(r.impactoSubsidioPorChanichGrandeCents)}
              </span>
            </li>
            <li className="flex justify-between border-b border-borda/60 py-1">
              <span>o resto (hospedagem, transporte, comida, estrutura…)</span>
              <span className="tabular font-medium">
                {brl(
                  r.custoPorChanichGrandesCents -
                    r.impactoBolsaPorChanichGrandeCents -
                    r.impactoSubsidioPorChanichGrandeCents,
                )}
              </span>
            </li>
            <li className="flex justify-between py-1 font-semibold">
              <span>custo rateado por chanich grande</span>
              <span className="tabular">{brl(r.custoPorChanichGrandesCents)}</span>
            </li>
          </ul>
        </CartaoCorpo>
      </Cartao>

      {r.avisos.length > 0 ? (
        <div className="space-y-2">
          {r.avisos.map((a) => (
            <Aviso key={a} tom={a.startsWith("DÉFICIT") ? "erro" : "atencao"}>
              {a}
            </Aviso>
          ))}
        </div>
      ) : null}
    </div>
  );
}
