"use client";

import { useMachane } from "@/components/machane/provedor";
import { Cartao, CartaoCorpo, CartaoDescricao, CartaoTitulo, CartaoTopo } from "@/components/ui/card";
import { Campo, AreaTexto, Rotulo, Selecao } from "@/components/ui/input";
import { CampoDinheiro, CampoDinheiroOpcional, CampoInteiro } from "@/components/campos";
import { Aviso } from "@/components/ui/avisos";
import { brl, pct } from "@/lib/dinheiro";
import { TIPOS_MACHANE } from "@/lib/textos";

export function TelaParametros() {
  const { estado, resultado, editarMachane, somenteLeitura } = useMachane();

  const tabela = estado.diariaTabelaCents;
  const desconto =
    tabela && tabela > 0 ? (tabela - estado.diariaCents) / tabela : null;

  return (
    <div className="space-y-4">
      <Cartao>
        <CartaoTopo>
          <CartaoTitulo>A diária é o parâmetro-raiz</CartaoTitulo>
          <CartaoDescricao>
            Todo o resto sai daqui: hospedagem, diárias de equipe, custo por chanich e os oito
            preços. Mexer neste campo muda a tabela inteira.
          </CartaoDescricao>
        </CartaoTopo>
        <CartaoCorpo className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Rotulo htmlFor="diaria">Diária negociada (R$ por pessoa/dia)</Rotulo>
              <CampoDinheiro
                id="diaria"
                valor={estado.diariaCents}
                disabled={somenteLeitura}
                aoMudar={(c) => editarMachane({ diariaCents: c })}
              />
            </div>
            <div>
              <Rotulo htmlFor="tabela">Diária de tabela (antes da negociação)</Rotulo>
              <CampoDinheiroOpcional
                id="tabela"
                valor={estado.diariaTabelaCents}
                disabled={somenteLeitura}
                aoMudar={(c) => editarMachane({ diariaTabelaCents: c })}
              />
            </div>
            <div className="flex items-end pb-1">
              {desconto !== null ? (
                <p className="text-xs text-suave">
                  Desconto obtido:{" "}
                  <strong className="text-texto">{pct(desconto)}</strong> ({brl(tabela! - estado.diariaCents)}{" "}
                  por pessoa/dia)
                </p>
              ) : (
                <p className="text-xs text-suave">
                  Preencha o valor de tabela para registrar o desconto negociado.
                </p>
              )}
            </div>
          </div>

          <div>
            <Rotulo htmlFor="obs">Como esta diária foi acertada</Rotulo>
            <AreaTexto
              id="obs"
              value={estado.diariaObservacao ?? ""}
              disabled={somenteLeitura}
              placeholder="Ex.: 170,55 = 189,50 com 10% de desconto — acordado com o Sítio em jan/26, por telefone, com a Dani."
              onChange={(e) => editarMachane({ diariaObservacao: e.target.value })}
            />
            <p className="mt-1 text-[11px] text-suave">
              Escreva como se fosse para alguém que vai reabrir isto em seis meses sem lembrar de
              nada.
            </p>
          </div>

          <Aviso tom="neutro">
            Com {resultado.pessoaDiaTotal} pessoa-dia de hospedagem cadastrados, cada R$ 1,00 a mais
            na diária custa {brl(resultado.pessoaDiaTotal * 100)} à machané.
          </Aviso>
        </CartaoCorpo>
      </Cartao>

      <Cartao>
        <CartaoTopo>
          <CartaoTitulo>Duração e identificação</CartaoTitulo>
          <CartaoDescricao>
            Os dias de cada turma entram no rateio por pessoa-dia — não são números decorativos.
          </CartaoDescricao>
        </CartaoTopo>
        <CartaoCorpo className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Rotulo htmlFor="nome">Nome</Rotulo>
            <Campo
              id="nome"
              value={estado.nome}
              disabled={somenteLeitura}
              onChange={(e) => editarMachane({ nome: e.target.value })}
            />
          </div>
          <div>
            <Rotulo htmlFor="tipo">Tipo</Rotulo>
            <Selecao
              id="tipo"
              value={estado.tipo}
              disabled={somenteLeitura}
              onChange={(e) => editarMachane({ tipo: e.target.value as "KAITZ" | "CHOREF" })}
            >
              {Object.entries(TIPOS_MACHANE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Selecao>
          </div>
          <div>
            <Rotulo htmlFor="ano">Ano</Rotulo>
            <CampoInteiro
              id="ano"
              valor={estado.ano}
              min={2000}
              max={2100}
              disabled={somenteLeitura}
              aoMudar={(n) => editarMachane({ ano: n })}
            />
          </div>
          <div>
            <Rotulo htmlFor="dg">Dias — grandes</Rotulo>
            <CampoInteiro
              id="dg"
              valor={estado.diasGrandes}
              max={60}
              disabled={somenteLeitura}
              aoMudar={(n) => editarMachane({ diasGrandes: n })}
            />
          </div>
          <div>
            <Rotulo htmlFor="dp">Dias — pequenos/babys</Rotulo>
            <CampoInteiro
              id="dp"
              valor={estado.diasPequenos}
              max={60}
              disabled={somenteLeitura}
              aoMudar={(n) => editarMachane({ diasPequenos: n })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Rotulo htmlFor="ini">Início</Rotulo>
              <Campo
                id="ini"
                type="date"
                value={estado.dataInicio ?? ""}
                disabled={somenteLeitura}
                onChange={(e) => editarMachane({ dataInicio: e.target.value || null })}
              />
            </div>
            <div>
              <Rotulo htmlFor="fim">Fim</Rotulo>
              <Campo
                id="fim"
                type="date"
                value={estado.dataFim ?? ""}
                disabled={somenteLeitura}
                onChange={(e) => editarMachane({ dataFim: e.target.value || null })}
              />
            </div>
          </div>
        </CartaoCorpo>
      </Cartao>

      <Aviso>
        Mudar os dias aqui <strong>não</strong> muda os dias já digitados em cada categoria da tela
        de Pessoas — lá cada linha tem o seu, porque nem todo mundo fica a machané inteira. Confira
        a tela 2 depois de alterar.
      </Aviso>
    </div>
  );
}
