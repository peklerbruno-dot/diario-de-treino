"use client";

import { useMemo, useState, useTransition } from "react";
import { apagarMedida, salvarMedida } from "@/app/acoes";
import type { MedidaVista } from "@/lib/consultas";
import { diaCurto } from "@/lib/datas";
import { Botao, Cartao, campo } from "./pecas";

/**
 * Peso e medidas: um gráfico de linha do peso, o registro de hoje e a lista.
 *
 * Uma série só, então sem legenda — o título diz o que é. Linha de 2 px na cor
 * do app, pontos de 8 px que dá para tocar (o valor aparece em cima), grade
 * clarinha. A lista embaixo é a "tabela" do gráfico: o mesmo dado, em texto.
 */

const kg = (n: number) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
const cm = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} cm`;

export function PesoEMedidas({ lista, hoje }: { lista: MedidaVista[]; hoje: string }) {
  const [anotando, setAnotando] = useState(false);
  const comPeso = lista.filter((m) => m.peso != null);
  const ultimo = comPeso[0];
  const primeiro = comPeso[comPeso.length - 1];
  const variacao = ultimo && primeiro && ultimo !== primeiro ? ultimo.peso! - primeiro.peso! : null;
  const ultimaCintura = lista.find((m) => m.cintura != null);

  return (
    <Cartao>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Peso</p>
          {ultimo ? (
            <p className="mt-0.5 text-[14px] text-grafite">
              <span className="text-[22px] font-semibold tabular text-tinta">{kg(ultimo.peso!)}</span>
              {variacao != null && (
                <span className="block tabular">
                  {variacao > 0 ? "+" : variacao < 0 ? "−" : "±"}
                  {kg(Math.abs(variacao))} desde {diaCurto(primeiro.dia)}
                </span>
              )}
            </p>
          ) : (
            <p className="mt-0.5 text-[14px] text-grafite">Anote o peso uma vez por semana, de manhã, em jejum.</p>
          )}
          {ultimaCintura && <p className="text-[13.5px] text-fosco">Cintura: {cm(ultimaCintura.cintura!)}</p>}
        </div>
        {!anotando && (
          <Botao tipo="primario" className="shrink-0 whitespace-nowrap !px-3 !py-2 text-[15px]" onClick={() => setAnotando(true)}>
            + Anotar
          </Botao>
        )}
      </div>

      {comPeso.length >= 2 && <Grafico pontos={[...comPeso].reverse().map((m) => ({ dia: m.dia, valor: m.peso! }))} />}
      {anotando && <Formulario hoje={hoje} aoFechar={() => setAnotando(false)} />}
      {lista.length > 0 && <Lista lista={lista} />}
    </Cartao>
  );
}

function Grafico({ pontos }: { pontos: { dia: string; valor: number }[] }) {
  const [tocado, setTocado] = useState<number | null>(null);
  const L = 320;
  const A = 120;
  const M = { esq: 8, dir: 8, cima: 22, baixo: 18 };
  const { x, y, min, max } = useMemo(() => {
    const vals = pontos.map((p) => p.valor);
    let min = Math.min(...vals);
    let max = Math.max(...vals);
    if (max - min < 1) {
      min -= 0.5;
      max += 0.5;
    }
    const x = (i: number) => M.esq + (i / Math.max(1, pontos.length - 1)) * (L - M.esq - M.dir);
    const y = (v: number) => M.cima + (1 - (v - min) / (max - min)) * (A - M.cima - M.baixo);
    return { x, y, min, max };
  }, [pontos, M.esq, M.dir, M.cima, M.baixo]);
  const caminho = pontos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const ativo = tocado ?? pontos.length - 1;

  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="mt-3 w-full" role="img" aria-label={`Peso de ${kg(pontos[0].valor)} a ${kg(pontos[pontos.length - 1].valor)}`}>
      {[min, (min + max) / 2, max].map((v, i) => (
        <line key={i} x1={M.esq} x2={L - M.dir} y1={y(v)} y2={y(v)} stroke="var(--linha)" strokeWidth={1} />
      ))}
      <path d={caminho} fill="none" stroke="var(--folha)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {pontos.map((p, i) => (
        <g key={i} onClick={() => setTocado(i)} style={{ cursor: "pointer" }}>
          {/* Alvo de toque maior que o ponto. */}
          <circle cx={x(i)} cy={y(p.valor)} r={14} fill="transparent" />
          <circle cx={x(i)} cy={y(p.valor)} r={i === ativo ? 5 : 4} fill="var(--folha)" stroke="var(--cartao)" strokeWidth={2} />
        </g>
      ))}
      <text
        x={Math.min(Math.max(x(ativo), 40), L - 40)}
        y={y(pontos[ativo].valor) - 10}
        textAnchor="middle"
        fontSize="11.5"
        fill="var(--tinta)"
        className="tabular"
      >
        {kg(pontos[ativo].valor)} · {diaCurto(pontos[ativo].dia)}
      </text>
      <text x={M.esq} y={A - 3} fontSize="10.5" fill="var(--fosco)">
        {diaCurto(pontos[0].dia)}
      </text>
      <text x={L - M.dir} y={A - 3} fontSize="10.5" fill="var(--fosco)" textAnchor="end">
        {diaCurto(pontos[pontos.length - 1].dia)}
      </text>
    </svg>
  );
}

function Formulario({ hoje, aoFechar }: { hoje: string; aoFechar: () => void }) {
  const [v, setV] = useState({ dia: hoje, peso: "", cintura: "", quadril: "", braco: "", nota: "" });
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  const mudar = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const numero = (k: keyof typeof v, rotulo: string, unidade: string) => (
    <label className="block">
      <span className="text-[13px] text-fosco">
        {rotulo} ({unidade})
      </span>
      <input className={`${campo} tabular`} inputMode="decimal" value={v[k]} onChange={mudar(k)} placeholder="—" />
    </label>
  );

  return (
    <div className="mt-4 space-y-3 border-t border-linha pt-4">
      <div className="grid grid-cols-2 gap-2">
        {numero("peso", "Peso", "kg")}
        <label className="block">
          <span className="text-[13px] text-fosco">Dia</span>
          <input type="date" className={campo} value={v.dia} onChange={mudar("dia")} />
        </label>
        {numero("cintura", "Cintura", "cm")}
        {numero("quadril", "Quadril", "cm")}
        {numero("braco", "Braço", "cm")}
      </div>
      <input className={campo} value={v.nota} onChange={mudar("nota")} placeholder="Observação (opcional)" />
      {erro && <p className="text-[14px] text-pulou">{erro}</p>}
      <div className="flex gap-2">
        <Botao
          tipo="primario"
          className="flex-1"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await salvarMedida(v);
              if (r.erro) setErro(r.erro);
              else aoFechar();
            })
          }
        >
          Salvar
        </Botao>
        <Botao tipo="fantasma" onClick={aoFechar}>
          Cancelar
        </Botao>
      </div>
    </div>
  );
}

function Lista({ lista }: { lista: MedidaVista[] }) {
  const [, iniciar] = useTransition();
  const [todas, setTodas] = useState(false);
  const visiveis = todas ? lista : lista.slice(0, 4);
  return (
    <div className="mt-3 border-t border-linha pt-2">
      <ul className="divide-y divide-linha">
        {visiveis.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-[14.5px]">
            <span className="w-[44px] shrink-0 tabular text-fosco">{diaCurto(m.dia)}</span>
            <span className="flex-1 tabular">
              {[m.peso != null && kg(m.peso), m.cintura != null && `cintura ${cm(m.cintura)}`, m.quadril != null && `quadril ${cm(m.quadril)}`, m.braco != null && `braço ${cm(m.braco)}`]
                .filter(Boolean)
                .join(" · ")}
              {m.nota && <span className="block text-[13px] text-fosco">{m.nota}</span>}
            </span>
            <button type="button" aria-label="Apagar" className="px-1 text-fosco" onClick={() => confirm("Apagar esta anotação?") && iniciar(() => apagarMedida(m.id))}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      {lista.length > 4 && (
        <button type="button" className="mt-1 text-[14px] text-folha" onClick={() => setTodas((t) => !t)}>
          {todas ? "Mostrar menos" : `Ver todas (${lista.length})`}
        </button>
      )}
    </div>
  );
}
