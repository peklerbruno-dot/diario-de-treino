"use client";

import { Fragment, useState } from "react";
import { useMachane } from "@/components/machane/provedor";
import { Cartao, CartaoCorpo, CartaoDescricao, CartaoTitulo, CartaoTopo } from "@/components/ui/card";
import { Campo, Selecao } from "@/components/ui/input";
import { Botao } from "@/components/ui/button";
import { Tabela, Td, Th } from "@/components/ui/table";
import { Selo } from "@/components/ui/badge";
import { Aviso } from "@/components/ui/avisos";
import { CampoDinheiro, CampoInteiro } from "@/components/campos";
import { brl, dataCurta, pct } from "@/lib/dinheiro";
import { TURMAS } from "@/lib/textos";
import {
  receitaEsperadaMadrichim,
  saldoMadrich,
  totalArrecadadoMadrichim,
  totalBolsaMadrichim,
  totalPago,
  type MadrichEstado,
} from "@/lib/estado";
import type { Turma } from "@/lib/calculo";

function Pagamentos({ m }: { m: MadrichEstado }) {
  const { adicionarPagamento, removerPagamento, somenteLeitura } = useMachane();
  const [valor, setValor] = useState(0);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="space-y-2 rounded-md border border-borda bg-fundo/60 p-3">
      {m.pagamentos.length === 0 ? (
        <p className="text-xs text-suave">Nenhum pagamento registrado.</p>
      ) : (
        <ul className="space-y-1 text-xs">
          {m.pagamentos.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <span className="tabular w-24 font-medium">{brl(p.valorCents)}</span>
              <span className="w-20 text-suave">{dataCurta(p.data)}</span>
              <span className="flex-1 text-suave">{p.observacao ?? ""}</span>
              <Botao
                variante="sutil"
                tamanho="pequeno"
                disabled={somenteLeitura}
                onClick={() => void removerPagamento(m.id, p.id)}
              >
                remover
              </Botao>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-32">
          <span className="mb-1 block text-[11px] text-suave">Valor</span>
          <CampoDinheiro valor={valor} aoMudar={setValor} disabled={somenteLeitura} />
        </div>
        <div className="w-36">
          <span className="mb-1 block text-[11px] text-suave">Data</span>
          <Campo
            type="date"
            value={data}
            disabled={somenteLeitura}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <span className="mb-1 block text-[11px] text-suave">Observação</span>
          <Campo
            value={obs}
            disabled={somenteLeitura}
            placeholder="pix, 1ª parcela…"
            onChange={(e) => setObs(e.target.value)}
          />
        </div>
        <Botao
          tamanho="pequeno"
          disabled={somenteLeitura || valor === 0}
          onClick={() => {
            setErro(null);
            void adicionarPagamento(m.id, valor, data, obs || null).then((r) => {
              if (r.ok) {
                setValor(0);
                setObs("");
              } else setErro(r.erro);
            });
          }}
        >
          Registrar pagamento
        </Botao>
      </div>
      {erro ? <Aviso tom="erro">{erro}</Aviso> : null}
    </div>
  );
}

export function TelaMadrichim() {
  const {
    estado,
    resultado,
    editarMadrich,
    adicionarMadrich,
    removerMadrich,
    usarTotalReal,
    somenteLeitura,
  } = useMachane();
  const [aberto, setAberto] = useState<string | null>(null);

  const esperado = receitaEsperadaMadrichim(estado.madrichim);
  const arrecadado = totalArrecadadoMadrichim(estado.madrichim);
  const bolsas = totalBolsaMadrichim(estado.madrichim);
  const porCategorias = estado.categorias
    .filter((c) => c.papel !== "CHANICH")
    .reduce((s, c) => s + c.quantidade * c.contribuicaoCents, 0);
  const usandoReal = estado.receitaMadrichimRealCents !== null;

  return (
    <div className="space-y-4">
      <Cartao>
        <CartaoTopo>
          <CartaoTitulo>Arrecadação dos madrichim</CartaoTitulo>
          <CartaoDescricao>
            O que eles pagam é uma contribuição simbólica; a diferença para o custo real cai no
            preço dos chanichim. Por isso este número entra direto no rateio.
          </CartaoDescricao>
        </CartaoTopo>
        <CartaoCorpo className="space-y-3">
          <div>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span>
                <strong className="tabular">{brl(arrecadado)}</strong>{" "}
                <span className="text-suave">de {brl(esperado)} esperados</span>
              </span>
              <span className="tabular text-suave">
                {esperado > 0 ? pct(arrecadado / esperado) : "—"}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full border border-borda bg-fundo">
              <div
                className="h-full bg-acento"
                style={{ width: `${esperado > 0 ? Math.min(100, (arrecadado / esperado) * 100) : 0}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-suave">
              {estado.madrichim.length} madrichim cadastrados · {brl(bolsas)} em bolsas concedidas ·
              falta receber {brl(esperado - arrecadado)}
            </p>
          </div>

          <div className="rounded-md border border-borda bg-fundo/60 p-3 text-xs">
            <p className="mb-2">
              O cálculo pode usar a soma das contribuições das categorias (tela 2) ou o total real
              deste cadastro (devido − bolsa).
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span>
                categorias: <strong className="tabular">{brl(porCategorias)}</strong>
              </span>
              <span>
                cadastro nominal: <strong className="tabular">{brl(esperado)}</strong>
              </span>
              <span>
                em uso agora:{" "}
                <Selo variante={usandoReal ? "acento" : "neutro"}>
                  {usandoReal ? "cadastro nominal" : "categorias"}
                </Selo>{" "}
                <strong className="tabular">{brl(resultado.receitaMadrichimCents)}</strong>
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Botao
                tamanho="pequeno"
                disabled={somenteLeitura || estado.madrichim.length === 0}
                onClick={() => void usarTotalReal(esperado)}
              >
                Usar este total no cálculo
              </Botao>
              {usandoReal ? (
                <Botao
                  variante="contorno"
                  tamanho="pequeno"
                  disabled={somenteLeitura}
                  onClick={() => void usarTotalReal(null)}
                >
                  Voltar a usar as categorias
                </Botao>
              ) : null}
            </div>
            {usandoReal && esperado !== porCategorias ? (
              <Aviso className="mt-2">
                O cadastro nominal difere das categorias em{" "}
                <strong>{brl(esperado - porCategorias)}</strong>. Quem manda no preço é o valor em
                uso — hoje, o cadastro nominal.
              </Aviso>
            ) : null}
          </div>
        </CartaoCorpo>
      </Cartao>

      <Cartao>
        <CartaoTopo className="flex items-start justify-between gap-3">
          <div>
            <CartaoTitulo>Cadastro</CartaoTitulo>
            <CartaoDescricao>
              Nome, telefone e kvutzá bastam para identificar. Não colete CPF nem RG.
            </CartaoDescricao>
          </div>
          <Botao onClick={() => void adicionarMadrich()} disabled={somenteLeitura}>
            Novo madrich
          </Botao>
        </CartaoTopo>
        <CartaoCorpo className="p-0">
          <Tabela>
            <thead>
              <tr>
                <Th className="min-w-[160px]">Nome</Th>
                <Th className="min-w-[120px]">Telefone</Th>
                <Th className="min-w-[110px]">Kvutzá</Th>
                <Th className="w-28">Turma</Th>
                <Th className="w-28 text-right">Devido</Th>
                <Th className="w-28 text-right">Bolsa</Th>
                <Th className="w-20 text-right">Parcelas</Th>
                <Th className="w-28 text-right">Pago</Th>
                <Th className="w-28 text-right">Saldo</Th>
                <Th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {estado.madrichim.map((m) => {
                const saldo = saldoMadrich(m);
                return (
                  <Fragment key={m.id}>
                    <tr className="hover:bg-fundo/60">
                      <Td>
                        <Campo
                          aria-label="Nome"
                          value={m.nome}
                          disabled={somenteLeitura}
                          onChange={(e) => editarMadrich(m.id, { nome: e.target.value })}
                        />
                      </Td>
                      <Td>
                        <Campo
                          aria-label="Telefone"
                          value={m.telefone ?? ""}
                          disabled={somenteLeitura}
                          onChange={(e) => editarMadrich(m.id, { telefone: e.target.value || null })}
                        />
                      </Td>
                      <Td>
                        <Campo
                          aria-label="Kvutzá"
                          value={m.kvutza ?? ""}
                          disabled={somenteLeitura}
                          onChange={(e) => editarMadrich(m.id, { kvutza: e.target.value || null })}
                        />
                      </Td>
                      <Td>
                        <Selecao
                          aria-label="Turma"
                          value={m.turma}
                          disabled={somenteLeitura}
                          onChange={(e) => editarMadrich(m.id, { turma: e.target.value as Turma })}
                        >
                          {Object.entries(TURMAS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </Selecao>
                      </Td>
                      <Td>
                        <CampoDinheiro
                          valor={m.valorDevidoCents}
                          disabled={somenteLeitura}
                          aoMudar={(c) => editarMadrich(m.id, { valorDevidoCents: c })}
                        />
                      </Td>
                      <Td>
                        <CampoDinheiro
                          valor={m.bolsaCents}
                          disabled={somenteLeitura}
                          aoMudar={(c) => editarMadrich(m.id, { bolsaCents: c })}
                        />
                      </Td>
                      <Td>
                        <CampoInteiro
                          valor={m.parcelas}
                          min={1}
                          max={24}
                          disabled={somenteLeitura}
                          aoMudar={(n) => editarMadrich(m.id, { parcelas: n })}
                        />
                      </Td>
                      <Td className="tabular text-right">{brl(totalPago(m))}</Td>
                      <Td
                        className={`tabular text-right font-medium ${
                          saldo <= 0 ? "text-ok" : "text-texto"
                        }`}
                      >
                        {brl(saldo)}
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Botao
                            variante="sutil"
                            tamanho="pequeno"
                            onClick={() => setAberto(aberto === m.id ? null : m.id)}
                          >
                            {aberto === m.id ? "fechar" : "pagamentos"}
                          </Botao>
                          <Botao
                            variante="sutil"
                            tamanho="icone"
                            aria-label={`Apagar ${m.nome}`}
                            disabled={somenteLeitura}
                            onClick={() => {
                              if (confirm(`Remover ${m.nome || "este madrich"} do cadastro?`))
                                void removerMadrich(m.id);
                            }}
                          >
                            ×
                          </Botao>
                        </div>
                      </Td>
                    </tr>
                    {aberto === m.id ? (
                      <tr>
                        <Td colSpan={10} className="bg-fundo/40">
                          <Pagamentos m={m} />
                        </Td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </Tabela>
          {estado.madrichim.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-suave">
              Nenhum madrich cadastrado. Enquanto isso, o cálculo usa a soma das contribuições das
              categorias.
            </p>
          ) : null}
        </CartaoCorpo>
      </Cartao>

      <Aviso tom="neutro">
        Boa parte dos madrichim é menor de idade. Guarde aqui só o necessário para cobrar e prestar
        contas — nome, telefone, kvutzá, valores. Nada de documento.
      </Aviso>
    </div>
  );
}
