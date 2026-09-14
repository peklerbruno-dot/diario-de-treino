"use client";

import { useMemo, useState } from "react";
import { useMachane } from "@/components/machane/provedor";
import { Cartao, CartaoCorpo, CartaoDescricao, CartaoTitulo, CartaoTopo } from "@/components/ui/card";
import { AreaTexto, Rotulo } from "@/components/ui/input";
import { Botao } from "@/components/ui/button";
import { Aviso } from "@/components/ui/avisos";
import { Selo } from "@/components/ui/badge";
import { calcular } from "@/lib/calculo";
import { paraInput } from "@/lib/estado";
import { brl, brlComSinal, dataHora, pct } from "@/lib/dinheiro";

/**
 * Tela 5 — o coração do produto.
 *
 * O peso do rateio é calculado por pessoa-dia. A coordenação pode mudá-lo, mas
 * só vendo, em reais, quem paga a conta do ajuste.
 */
export function TelaRateio() {
  const { estado, resultado, definirPeso, somenteLeitura } = useMachane();

  const pesoCalculado = resultado.pesoCalculado;
  const [candidato, setCandidato] = useState<number>(estado.pesoOverride ?? pesoCalculado);
  const [justificativa, setJustificativa] = useState(estado.pesoJustificativa ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Simulação: o mesmo motor, com o peso que o slider está propondo.
  const simulado = useMemo(
    () => calcular(paraInput({ ...estado, pesoOverride: candidato })),
    [estado, candidato],
  );
  const semOverride = useMemo(
    () => calcular(paraInput({ ...estado, pesoOverride: null })),
    [estado],
  );

  const diferenca = candidato - pesoCalculado;
  const mexeu = Math.abs(diferenca) > 0.0005;
  const deslocamento = simulado.deslocamentoPorOverrideCents;
  const direcao = deslocamento > 0 ? "dos pequenos para os grandes" : "dos grandes para os pequenos";

  // Vêm do motor: dividir o deslocamento total pelas crianças evita somar
  // arredondamento em cima de arredondamento.
  const porGrande = simulado.deslocamentoPorChanichGrandeCents;
  const porPequeno = simulado.deslocamentoPorChanichPequenoCents;

  async function salvar(peso: number | null) {
    setErro(null);
    setSalvando(true);
    const r = await definirPeso(peso, justificativa);
    setSalvando(false);
    if (!r.ok) setErro(r.erro);
    if (r.ok && peso === null) setJustificativa("");
  }

  return (
    <div className="space-y-4">
      <Cartao>
        <CartaoTopo>
          <CartaoTitulo>Como o custo se divide entre as duas turmas</CartaoTitulo>
          <CartaoDescricao>
            O peso não é uma escolha: é a participação de cada turma no total de pessoa-dia. Na
            planilha antiga ele era digitado à mão e parecia arbitrário.
          </CartaoDescricao>
        </CartaoTopo>
        <CartaoCorpo className="space-y-3">
          <div className="rounded-md border border-borda bg-fundo/60 p-3 font-mono text-xs leading-relaxed">
            peso_grandes = ({resultado.chanichimGrandes} chanichim × {estado.diasGrandes} dias) ÷ (
            {resultado.chanichimGrandes} × {estado.diasGrandes} + {resultado.chanichimPequenos} ×{" "}
            {estado.diasPequenos})
            <br />
            peso_grandes = {resultado.chanichimGrandes * estado.diasGrandes} ÷{" "}
            {resultado.chanichimGrandes * estado.diasGrandes +
              resultado.chanichimPequenos * estado.diasPequenos}{" "}
            = <strong>{pct(pesoCalculado, 4)}</strong>
          </div>
          <p className="text-sm">
            Peso calculado: <strong>{pct(pesoCalculado, 2)}</strong> para os grandes,{" "}
            <strong>{pct(1 - pesoCalculado, 2)}</strong> para os pequenos.
          </p>
        </CartaoCorpo>
      </Cartao>

      <Cartao>
        <CartaoTopo className="flex items-start justify-between gap-3">
          <div>
            <CartaoTitulo>Ajustar à mão</CartaoTitulo>
            <CartaoDescricao>
              Aliviar os babys é uma decisão política legítima — desde que fique escrito quem
              decidiu, por quê, e quanto custa.
            </CartaoDescricao>
          </div>
          {estado.pesoOverride !== null ? (
            <Selo variante="atencao">override ativo</Selo>
          ) : (
            <Selo variante="ok">usando o peso calculado</Selo>
          )}
        </CartaoTopo>
        <CartaoCorpo className="space-y-4">
          <div>
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span>
                grandes <strong className="tabular">{pct(candidato, 2)}</strong>
              </span>
              <span>
                pequenos <strong className="tabular">{pct(1 - candidato, 2)}</strong>
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.0001}
              value={candidato}
              disabled={somenteLeitura}
              className="w-full"
              aria-label="Peso dos grandes no rateio"
              onChange={(e) => setCandidato(Number(e.target.value))}
            />
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              <Botao
                variante="contorno"
                tamanho="pequeno"
                onClick={() => setCandidato(pesoCalculado)}
              >
                peso calculado ({pct(pesoCalculado, 2)})
              </Botao>
              {[0.85, 0.87, 0.89, 0.9, 0.92].map((p) => (
                <Botao
                  key={p}
                  variante="contorno"
                  tamanho="pequeno"
                  onClick={() => setCandidato(p)}
                >
                  {pct(p, 0)}
                </Botao>
              ))}
            </div>
          </div>

          {mexeu ? (
            <Aviso tom="atencao">
              Movendo para <strong>{pct(candidato, 1)}</strong> você transfere{" "}
              <strong>{brl(Math.abs(deslocamento))}</strong> {direcao}: cada chanich grande paga{" "}
              <strong>{brlComSinal(porGrande)}</strong> e cada baby paga{" "}
              <strong>{brlComSinal(porPequeno)}</strong>.
            </Aviso>
          ) : (
            <Aviso tom="ok">
              O slider está no peso matemático. Nada é deslocado entre as turmas.
            </Aviso>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-borda p-3">
              <p className="text-[11px] uppercase tracking-wide text-suave">Chanich grande</p>
              <p className="tabular text-lg font-semibold">
                {brl(simulado.custoPorChanichGrandesCents)}
              </p>
              <p className="text-xs text-suave">
                peso calculado daria {brl(semOverride.custoPorChanichGrandesCents)}
              </p>
            </div>
            <div className="rounded-md border border-borda p-3">
              <p className="text-[11px] uppercase tracking-wide text-suave">Chanich pequeno</p>
              <p className="tabular text-lg font-semibold">
                {brl(simulado.custoPorChanichPequenosCents)}
              </p>
              <p className="text-xs text-suave">
                peso calculado daria {brl(semOverride.custoPorChanichPequenosCents)}
              </p>
            </div>
          </div>

          <div>
            <Rotulo htmlFor="just">Justificativa (obrigatória para salvar o ajuste)</Rotulo>
            <AreaTexto
              id="just"
              value={justificativa}
              disabled={somenteLeitura}
              placeholder="Ex.: decisão da hanhagá em 12/01 — segurar o preço dos babys para não perder famílias de primeira viagem."
              onChange={(e) => setJustificativa(e.target.value)}
            />
          </div>

          {erro ? <Aviso tom="erro">{erro}</Aviso> : null}

          <div className="flex flex-wrap gap-2">
            <Botao
              disabled={somenteLeitura || salvando || !mexeu || justificativa.trim().length < 10}
              onClick={() => void salvar(candidato)}
            >
              {salvando ? "Salvando…" : "Salvar este peso"}
            </Botao>
            {estado.pesoOverride !== null ? (
              <Botao
                variante="contorno"
                disabled={somenteLeitura || salvando}
                onClick={() => {
                  setCandidato(pesoCalculado);
                  void salvar(null);
                }}
              >
                Voltar ao peso calculado
              </Botao>
            ) : null}
          </div>

          {estado.pesoOverride !== null ? (
            <div className="rounded-md border border-borda bg-fundo/60 p-3 text-xs">
              <p>
                Em uso: <strong>{pct(estado.pesoOverride, 2)}</strong> — ajustado por{" "}
                {estado.pesoOverridePor ?? "—"} em {dataHora(estado.pesoOverrideEm)}.
              </p>
              {estado.pesoJustificativa ? (
                <p className="mt-1 italic text-suave">&ldquo;{estado.pesoJustificativa}&rdquo;</p>
              ) : null}
            </div>
          ) : null}
        </CartaoCorpo>
      </Cartao>
    </div>
  );
}
