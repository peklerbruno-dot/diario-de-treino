"use client";

import { useMemo, useState } from "react";
import { useMachane } from "@/components/machane/provedor";
import { Cartao, CartaoCorpo, CartaoDescricao, CartaoTitulo, CartaoTopo } from "@/components/ui/card";
import { Tabela, Td, Th } from "@/components/ui/table";
import { Aviso } from "@/components/ui/avisos";
import { calcular, type Resultado } from "@/lib/calculo";
import { paraInput, type EstadoMachane } from "@/lib/estado";
import { brl, brlComSinal, pct, pctComSinal } from "@/lib/dinheiro";
import { linhasDaGrade } from "@/lib/divulgacao";

interface Cenario {
  nome: string;
  receitaMadrichimCents: number;
  bolsaCents: number;
  superavitAlvoCents: number;
}

/** Aplica o cenário sobre o estado real e roda o mesmo motor de sempre. */
function simular(estado: EstadoMachane, c: Cenario): Resultado {
  const entrada = paraInput(estado);
  return calcular({
    ...entrada,
    receitaMadrichimRealCents: c.receitaMadrichimCents,
    gastos: [
      ...entrada.gastos.filter((g) => g.categoria !== "BOLSA"),
      {
        id: "bolsa-cenario",
        descricao: "fundo de bolsas (cenário)",
        tipo: "VALOR_FECHADO",
        categoria: "BOLSA",
        valorCents: c.bolsaCents,
      },
    ],
    politica: { ...entrada.politica, superavitAlvoCents: c.superavitAlvoCents },
  });
}

function Deslizante({
  rotulo,
  valor,
  maximo,
  passo,
  base,
  aoMudar,
}: {
  rotulo: string;
  valor: number;
  maximo: number;
  passo: number;
  base: number;
  aoMudar: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-suave">{rotulo}</span>
        <span className="tabular font-medium">{brl(valor)}</span>
      </div>
      <input
        type="range"
        className="w-full"
        min={0}
        max={maximo}
        step={passo}
        value={Math.min(valor, maximo)}
        aria-label={rotulo}
        onChange={(e) => aoMudar(Number(e.target.value))}
      />
      <p className="text-[11px] text-suave">
        {valor === base ? "igual ao atual" : `${brlComSinal(valor - base)} em relação ao atual`}
      </p>
    </div>
  );
}

export function TelaCenarios() {
  const { estado, resultado: atual } = useMachane();

  const base: Cenario = useMemo(
    () => ({
      nome: "hoje",
      receitaMadrichimCents: atual.receitaMadrichimCents,
      bolsaCents: atual.bolsaCents,
      superavitAlvoCents: estado.politica.superavitAlvoCents,
    }),
    [atual.receitaMadrichimCents, atual.bolsaCents, estado.politica.superavitAlvoCents],
  );

  const [a, setA] = useState<Cenario>({ ...base, nome: "cenário A" });
  const [b, setB] = useState<Cenario>({ ...base, nome: "cenário B" });

  const resultadoA = useMemo(() => simular(estado, a), [estado, a]);
  const resultadoB = useMemo(() => simular(estado, b), [estado, b]);

  const colunas: { cenario: Cenario; resultado: Resultado }[] = [
    { cenario: base, resultado: atual },
    { cenario: a, resultado: resultadoA },
    { cenario: b, resultado: resultadoB },
  ];

  const editor = (c: Cenario, set: (c: Cenario) => void) => (
    <div className="space-y-3">
      <Deslizante
        rotulo="Contribuição total dos madrichim"
        valor={c.receitaMadrichimCents}
        base={base.receitaMadrichimCents}
        maximo={Math.max(base.receitaMadrichimCents * 2, 5000000)}
        passo={50000}
        aoMudar={(v) => set({ ...c, receitaMadrichimCents: v })}
      />
      <Deslizante
        rotulo="Fundo de bolsas"
        valor={c.bolsaCents}
        base={base.bolsaCents}
        maximo={Math.max(base.bolsaCents * 2, 10000000)}
        passo={100000}
        aoMudar={(v) => set({ ...c, bolsaCents: v })}
      />
      <Deslizante
        rotulo="Superávit-alvo"
        valor={c.superavitAlvoCents}
        base={base.superavitAlvoCents}
        maximo={5000000}
        passo={50000}
        aoMudar={(v) => set({ ...c, superavitAlvoCents: v })}
      />
      <button
        className="text-[11px] text-acento underline"
        onClick={() => set({ ...base, nome: c.nome })}
      >
        voltar ao atual
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <Cartao>
        <CartaoTopo>
          <CartaoTitulo>E se…</CartaoTitulo>
          <CartaoDescricao>
            Mexa nos três números que a coordenação de fato decide. Nada aqui é salvo: é conversa de
            reunião, com os oito preços respondendo na hora.
          </CartaoDescricao>
        </CartaoTopo>
        <CartaoCorpo className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Cenário A</p>
            {editor(a, setA)}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Cenário B</p>
            {editor(b, setB)}
          </div>
        </CartaoCorpo>
      </Cartao>

      <Cartao>
        <CartaoTopo>
          <CartaoTitulo>Três cenários lado a lado</CartaoTitulo>
        </CartaoTopo>
        <CartaoCorpo className="p-0">
          <Tabela>
            <thead>
              <tr>
                <Th className="min-w-[190px]" />
                <Th className="text-right">hoje</Th>
                <Th className="text-right">cenário A</Th>
                <Th className="text-right">cenário B</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td className="text-xs uppercase tracking-wide text-suave">Contribuição madrichim</Td>
                {colunas.map((c, i) => (
                  <Td key={i} className="tabular text-right">
                    {brl(c.cenario.receitaMadrichimCents)}
                  </Td>
                ))}
              </tr>
              <tr>
                <Td className="text-xs uppercase tracking-wide text-suave">Fundo de bolsas</Td>
                {colunas.map((c, i) => (
                  <Td key={i} className="tabular text-right">
                    {brl(c.cenario.bolsaCents)}
                  </Td>
                ))}
              </tr>
              <tr>
                <Td className="text-xs uppercase tracking-wide text-suave">Superávit-alvo</Td>
                {colunas.map((c, i) => (
                  <Td key={i} className="tabular text-right">
                    {brl(c.cenario.superavitAlvoCents)}
                  </Td>
                ))}
              </tr>
              <tr className="bg-fundo">
                <Td className="text-xs font-semibold uppercase tracking-wide">Custo total</Td>
                {colunas.map((c, i) => (
                  <Td key={i} className="tabular text-right font-medium">
                    {brl(c.resultado.custoTotalCents)}
                  </Td>
                ))}
              </tr>
              {linhasDaGrade.map(([chave, rotulo]) => (
                <tr key={`g-${chave}`}>
                  <Td className="text-sm">grandes · {rotulo}</Td>
                  {colunas.map((c, i) => (
                    <Td key={i} className="tabular text-right">
                      {brl(c.resultado.precosGrandes[chave])}
                      {i > 0 && c.resultado.precosGrandes[chave] !== atual.precosGrandes[chave] ? (
                        <span className="ml-1 text-[11px] text-suave">
                          {brlComSinal(c.resultado.precosGrandes[chave] - atual.precosGrandes[chave])}
                        </span>
                      ) : null}
                    </Td>
                  ))}
                </tr>
              ))}
              {linhasDaGrade.map(([chave, rotulo]) => (
                <tr key={`p-${chave}`}>
                  <Td className="text-sm">pequenos · {rotulo}</Td>
                  {colunas.map((c, i) => (
                    <Td key={i} className="tabular text-right">
                      {brl(c.resultado.precosPequenos[chave])}
                      {i > 0 && c.resultado.precosPequenos[chave] !== atual.precosPequenos[chave] ? (
                        <span className="ml-1 text-[11px] text-suave">
                          {brlComSinal(
                            c.resultado.precosPequenos[chave] - atual.precosPequenos[chave],
                          )}
                        </span>
                      ) : null}
                    </Td>
                  ))}
                </tr>
              ))}
              <tr className="bg-fundo">
                <Td className="text-xs font-semibold uppercase tracking-wide">Superávit projetado</Td>
                {colunas.map((c, i) => (
                  <Td
                    key={i}
                    className={`tabular text-right font-medium ${
                      c.resultado.superavitProjetadoCents < 0 ? "text-erro" : "text-ok"
                    }`}
                  >
                    {brl(c.resultado.superavitProjetadoCents)}
                    <span className="ml-1 text-[11px] font-normal text-suave">
                      {pctComSinal(c.resultado.superavitProjetadoPct)}
                    </span>
                  </Td>
                ))}
              </tr>
              <tr>
                <Td className="text-xs uppercase tracking-wide text-suave">
                  Bolsa embutida no preço do grande
                </Td>
                {colunas.map((c, i) => (
                  <Td key={i} className="tabular text-right">
                    {brl(c.resultado.impactoBolsaPorChanichGrandeCents)}
                    <span className="ml-1 text-[11px] text-suave">
                      {c.resultado.precosGrandes.primeiroFilhoSocio > 0
                        ? pct(
                            c.resultado.impactoBolsaPorChanichGrandeCents /
                              c.resultado.precosGrandes.primeiroFilhoSocio,
                          )
                        : "—"}
                    </span>
                  </Td>
                ))}
              </tr>
            </tbody>
          </Tabela>
        </CartaoCorpo>
      </Cartao>

      <Aviso tom="neutro">
        Os cenários não alteram a machané. Para valer, mude o número na tela de origem: contribuição
        nas categorias ou no cadastro de madrichim, fundo de bolsas nos custos, superávit-alvo na
        tela de preços.
      </Aviso>
    </div>
  );
}
