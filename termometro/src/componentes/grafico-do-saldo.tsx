"use client";

import { useMemo, useRef, useState } from "react";
import type { AnoCalculado } from "@/lib/calculo";
import { MESES_CURTOS, curta } from "@/lib/datas";
import { comCifrao, redondo } from "@/lib/dinheiro";

/**
 * O termômetro propriamente dito: o saldo de cada dia do ano, numa linha só.
 *
 * Uma série, então não há legenda — o título diz o que a linha é. O zero é a
 * régua que importa, e o trecho que cai abaixo dele muda de cor; a cor não
 * carrega isso sozinha, porque o eixo tem o zero marcado e o trecho negativo
 * fica visivelmente abaixo da régua. A tabela dos doze meses logo abaixo é a
 * leitura em números do mesmo dado.
 */

const LARGURA = 720;
const ALTURA = 190;
const MARGEM = { topo: 14, direita: 8, baixo: 20, esquerda: 52 };

export function GraficoDoSaldo({ ano, hoje }: { ano: AnoCalculado; hoje: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const [indiceSobOToque, setIndiceSobOToque] = useState<number | null>(null);

  const pontos = useMemo(() => {
    const lista: { data: string; saldoCents: number; mes: number; dia: number }[] = [];
    for (const mes of ano.meses) {
      for (const dia of mes.dias) {
        lista.push({ data: dia.data, saldoCents: dia.saldoCents, mes: mes.mes, dia: dia.dia });
      }
    }
    return lista;
  }, [ano]);

  const { paraX, paraY, caminho, yDoZero, topo, base } = useMemo(() => {
    const valores = pontos.map((p) => p.saldoCents);
    const maior = Math.max(0, ...valores);
    const menor = Math.min(0, ...valores);
    const folga = Math.max((maior - menor) * 0.08, 1000);
    const topo = maior + folga;
    const base = menor - folga;

    const larguraUtil = LARGURA - MARGEM.esquerda - MARGEM.direita;
    const alturaUtil = ALTURA - MARGEM.topo - MARGEM.baixo;

    const paraX = (i: number) =>
      MARGEM.esquerda + (i / Math.max(pontos.length - 1, 1)) * larguraUtil;
    const paraY = (cents: number) =>
      MARGEM.topo + ((topo - cents) / Math.max(topo - base, 1)) * alturaUtil;

    const caminho = pontos
      .map(
        (p, i) => `${i === 0 ? "M" : "L"}${paraX(i).toFixed(2)},${paraY(p.saldoCents).toFixed(2)}`,
      )
      .join(" ");

    return { paraX, paraY, caminho, yDoZero: paraY(0), topo, base };
  }, [pontos]);

  const indiceDeHoje = pontos.findIndex((p) => p.data === hoje);
  const destacado = indiceSobOToque ?? (indiceDeHoje >= 0 ? indiceDeHoje : null);
  const ponto = destacado !== null ? pontos[destacado] : null;

  function seguirODedo(e: React.PointerEvent<SVGSVGElement>) {
    const caixa = svg.current?.getBoundingClientRect();
    if (!caixa) return;
    const x = ((e.clientX - caixa.left) / caixa.width) * LARGURA;
    const proporcao = (x - MARGEM.esquerda) / (LARGURA - MARGEM.esquerda - MARGEM.direita);
    const i = Math.round(proporcao * (pontos.length - 1));
    setIndiceSobOToque(Math.min(Math.max(i, 0), pontos.length - 1));
  }

  return (
    <figure className="m-0">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-titulo text-[19px] font-semibold tracking-tight">
          Saldo, dia a dia
        </span>
        {ponto && (
          <span className="text-[13px] text-grafite">
            <span className="tabular">{curta(ponto.data)}</span>
            {" · "}
            <span className={`tabular ${ponto.saldoCents < 0 ? "text-atencao" : "text-tinta"}`}>
              {comCifrao(ponto.saldoCents)}
            </span>
          </span>
        )}
      </figcaption>

      <svg
        ref={svg}
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        className="mt-1 w-full touch-pan-y select-none"
        style={{ height: "auto" }}
        role="img"
        aria-label={`Saldo de cada dia de ${ano.ano}. Começa em ${redondo(
          ano.saldoInicialCents,
        )} e termina em ${redondo(ano.saldoFinalCents)}.`}
        onPointerMove={seguirODedo}
        onPointerDown={seguirODedo}
        onPointerLeave={() => setIndiceSobOToque(null)}
      >
        <defs>
          {/* Só o que cai abaixo do zero é pintado de vermelho. */}
          <clipPath id="abaixoDoZero">
            <rect x={0} y={yDoZero} width={LARGURA} height={Math.max(ALTURA - yDoZero, 0)} />
          </clipPath>
        </defs>

        {/* Régua do topo e do fundo, discretas. */}
        <line
          x1={MARGEM.esquerda}
          x2={LARGURA - MARGEM.direita}
          y1={paraY(topo)}
          y2={paraY(topo)}
          stroke="var(--linha)"
          strokeWidth={1}
        />
        {Math.abs(paraY(topo) - yDoZero) > 16 && (
          <text x={0} y={paraY(topo) + 4} fontSize={11} fill="var(--fosco)" className="tabular">
            {redondo(topo)}
          </text>
        )}

        {/* O zero: a única régua que precisa ser lida. */}
        <line
          x1={MARGEM.esquerda}
          x2={LARGURA - MARGEM.direita}
          y1={yDoZero}
          y2={yDoZero}
          stroke="var(--regua)"
          strokeWidth={1}
        />
        <text x={0} y={yDoZero + 4} fontSize={11} fill="var(--fosco)">
          R$ 0
        </text>

        {/* O rótulo de baixo só aparece quando há espaço: com o saldo rente ao
            zero ele encostava no "R$ 0" e os dois viravam um borrão. */}
        {base < 0 && Math.abs(paraY(base) - yDoZero) > 16 && (
          <text x={0} y={paraY(base) - 3} fontSize={11} fill="var(--fosco)" className="tabular">
            {redondo(base)}
          </text>
        )}

        {/* Começo de cada mês. */}
        {ano.meses.map((mes) => {
          const i = pontos.findIndex((p) => p.mes === mes.mes && p.dia === 1);
          if (i < 0) return null;
          return (
            <g key={mes.mes}>
              <line
                x1={paraX(i)}
                x2={paraX(i)}
                y1={MARGEM.topo}
                y2={ALTURA - MARGEM.baixo}
                stroke="var(--linha)"
                strokeWidth={1}
              />
              <text x={paraX(i) + 3} y={ALTURA - 6} fontSize={11} fill="var(--fosco)">
                {MESES_CURTOS[mes.mes - 1]}
              </text>
            </g>
          );
        })}

        <path
          d={caminho}
          fill="none"
          stroke="var(--saldo)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <path
          d={caminho}
          fill="none"
          stroke="var(--atencao)"
          strokeWidth={2}
          strokeLinejoin="round"
          clipPath="url(#abaixoDoZero)"
        />

        {destacado !== null && ponto && (
          <g>
            <line
              x1={paraX(destacado)}
              x2={paraX(destacado)}
              y1={MARGEM.topo}
              y2={ALTURA - MARGEM.baixo}
              stroke="var(--grafite)"
              strokeWidth={1}
            />
            {/* Anel da cor da superfície, para o ponto não sumir sobre a linha. */}
            <circle
              cx={paraX(destacado)}
              cy={paraY(ponto.saldoCents)}
              r={5}
              fill={ponto.saldoCents < 0 ? "var(--atencao)" : "var(--saldo)"}
              stroke="var(--cartao)"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>

      <p className="mt-1 text-[13px] text-fosco">
        Arraste o dedo sobre a linha para ver um dia. O trecho vermelho é o que fica abaixo de zero.
      </p>
    </figure>
  );
}
