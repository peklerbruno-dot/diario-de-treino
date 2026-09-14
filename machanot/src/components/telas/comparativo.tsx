"use client";

import { useState } from "react";
import { useMachane } from "@/components/machane/provedor";
import { Cartao, CartaoCorpo, CartaoDescricao, CartaoTitulo, CartaoTopo } from "@/components/ui/card";
import { Selecao } from "@/components/ui/input";
import { Tabela, Td, Th } from "@/components/ui/table";
import { Aviso } from "@/components/ui/avisos";
import { brl, brlComSinal, pct, pctComSinal } from "@/lib/dinheiro";
import { linhasDaGrade } from "@/lib/divulgacao";
import { TIPOS_MACHANE } from "@/lib/textos";
import type { ResumoMachane } from "@/lib/resumo";

function LinhaComparada({
  rotulo,
  atual,
  anterior,
  formatar = brl,
  inverterCor,
}: {
  rotulo: string;
  atual: number;
  anterior: number;
  formatar?: (n: number) => string;
  inverterCor?: boolean;
}) {
  const dif = atual - anterior;
  const variacao = anterior === 0 ? null : dif / Math.abs(anterior);
  const sobe = dif > 0;
  const corRuim = inverterCor ? !sobe : sobe;
  return (
    <tr>
      <Td className="text-sm">{rotulo}</Td>
      <Td className="tabular text-right">{formatar(anterior)}</Td>
      <Td className="tabular text-right font-medium">{formatar(atual)}</Td>
      <Td
        className={`tabular text-right ${dif === 0 ? "text-suave" : corRuim ? "text-erro" : "text-ok"}`}
      >
        {dif === 0 ? "—" : formatar === brl ? brlComSinal(dif) : `${dif > 0 ? "+" : "−"}${formatar(Math.abs(dif))}`}
      </Td>
      <Td
        className={`tabular text-right ${
          variacao === null || dif === 0 ? "text-suave" : corRuim ? "text-erro" : "text-ok"
        }`}
      >
        {variacao === null || dif === 0 ? "—" : pctComSinal(variacao)}
      </Td>
    </tr>
  );
}

export function TelaComparativo({ outras }: { outras: ResumoMachane[] }) {
  const { estado, resultado: r } = useMachane();
  const mesmoTipo = outras.filter((o) => o.tipo === estado.tipo);
  const sugerida = mesmoTipo[0] ?? outras[0];
  const [escolhida, setEscolhida] = useState<string>(sugerida?.id ?? "");
  const anterior = outras.find((o) => o.id === escolhida) ?? sugerida;

  if (!anterior) {
    return (
      <Aviso tom="neutro">
        Não há outra machané cadastrada para comparar. Depois da próxima edição, esta tela mostra
        custo, headcount, diária e os oito preços lado a lado.
      </Aviso>
    );
  }

  return (
    <div className="space-y-4">
      <Cartao>
        <CartaoTopo className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CartaoTitulo>
              {estado.nome} contra {anterior.nome}
            </CartaoTitulo>
            <CartaoDescricao>
              Variação em reais e em percentual. Preço que sobe mais que o custo é margem; custo que
              sobe sem preço é déficit à espera.
            </CartaoDescricao>
          </div>
          <Selecao
            aria-label="Machané de comparação"
            className="w-auto"
            value={anterior.id}
            onChange={(e) => setEscolhida(e.target.value)}
          >
            {outras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome} ({TIPOS_MACHANE[o.tipo]} {o.ano})
              </option>
            ))}
          </Selecao>
        </CartaoTopo>
        <CartaoCorpo className="p-0">
          <Tabela>
            <thead>
              <tr>
                <Th className="min-w-[200px]" />
                <Th className="text-right">{anterior.nome}</Th>
                <Th className="text-right">{estado.nome}</Th>
                <Th className="text-right">variação</Th>
                <Th className="text-right">%</Th>
              </tr>
            </thead>
            <tbody>
              <LinhaComparada rotulo="Diária" atual={estado.diariaCents} anterior={anterior.diariaCents} />
              <LinhaComparada
                rotulo="Pessoas na machané"
                atual={r.totalPessoas}
                anterior={anterior.totalPessoas}
                formatar={(n) => String(n)}
                inverterCor
              />
              <LinhaComparada
                rotulo="Chanichim grandes"
                atual={r.chanichimGrandes}
                anterior={anterior.chanichimGrandes}
                formatar={(n) => String(n)}
                inverterCor
              />
              <LinhaComparada
                rotulo="Chanichim pequenos"
                atual={r.chanichimPequenos}
                anterior={anterior.chanichimPequenos}
                formatar={(n) => String(n)}
                inverterCor
              />
              <LinhaComparada rotulo="Hospedagem" atual={r.hospedagemCents} anterior={anterior.hospedagemCents} />
              <LinhaComparada rotulo="Gastos fixos" atual={r.gastosFixosCents} anterior={anterior.gastosFixosCents} />
              <LinhaComparada rotulo="Custo total" atual={r.custoTotalCents} anterior={anterior.custoTotalCents} />
              <LinhaComparada rotulo="Fundo de bolsas" atual={r.bolsaCents} anterior={anterior.bolsaCents} />
              <LinhaComparada
                rotulo="Receita dos madrichim"
                atual={r.receitaMadrichimCents}
                anterior={anterior.receitaMadrichimCents}
                inverterCor
              />
              <LinhaComparada
                rotulo="Custo por chanich grande"
                atual={r.custoPorChanichGrandesCents}
                anterior={anterior.custoPorChanichGrandesCents}
              />
              <LinhaComparada
                rotulo="Custo por chanich pequeno"
                atual={r.custoPorChanichPequenosCents}
                anterior={anterior.custoPorChanichPequenosCents}
              />
              <tr className="bg-fundo">
                <Td className="text-xs font-semibold uppercase tracking-wide">Peso aplicado (grandes)</Td>
                <Td className="tabular text-right">{pct(anterior.pesoAplicado)}</Td>
                <Td className="tabular text-right font-medium">{pct(r.pesoAplicado)}</Td>
                <Td className="tabular text-right text-suave" colSpan={2}>
                  {pctComSinal(r.pesoAplicado - anterior.pesoAplicado, 2)} em pontos
                </Td>
              </tr>
              {linhasDaGrade.map(([chave, rotulo]) => (
                <LinhaComparada
                  key={`g-${chave}`}
                  rotulo={`grandes · ${rotulo}`}
                  atual={r.precosGrandes[chave]}
                  anterior={anterior.precosGrandes[chave]}
                />
              ))}
              {linhasDaGrade.map(([chave, rotulo]) => (
                <LinhaComparada
                  key={`p-${chave}`}
                  rotulo={`pequenos · ${rotulo}`}
                  atual={r.precosPequenos[chave]}
                  anterior={anterior.precosPequenos[chave]}
                />
              ))}
            </tbody>
          </Tabela>
        </CartaoCorpo>
      </Cartao>

      <Aviso tom="neutro">
        A machané anterior tinha {anterior.diasGrandes} dias para os grandes e{" "}
        {anterior.diasPequenos} para os pequenos; esta tem {estado.diasGrandes} e{" "}
        {estado.diasPequenos}. Quando a duração muda, comparar preço por criança sem olhar o preço
        por pessoa-dia engana.
      </Aviso>
    </div>
  );
}
