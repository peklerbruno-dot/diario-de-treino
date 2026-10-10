"use client";

import { useMemo, useState } from "react";
import { FolhaDeLancamento } from "@/componentes/folha-de-lancamento";
import { Botao, Cartao, Dinheiro, Selo, Sobrescrito, Subtitulo, Titulo } from "@/componentes/pecas";
import { useEstado } from "@/componentes/usar-loja";
import { nomeDaCategoria } from "@/lib/categorias";
import { curta, hoje } from "@/lib/datas";
import { comCifrao } from "@/lib/dinheiro";
import {
  CHAVE_DO_CARTAO,
  escreverCartao,
  faturasDoCartao,
  lerCartao,
  type Fatura,
} from "@/lib/fatura";
import { categoriasDe, lancamentosVivos, loja } from "@/lib/loja";
import type { Lancamento } from "@/lib/tipos";

/**
 * A fatura do cartão de crédito.
 *
 * Comprar no crédito não tira dinheiro da conta; tira no vencimento. Esta tela
 * junta o que foi comprado até o fechamento e diz quanto vai sair, e quando. A
 * saída prevista no dia do vencimento é escrita sozinha (ver `lib/fatura`) e
 * aparece em "O que vem", então o saldo do mês já conta com ela.
 */
export function TelaDaFatura() {
  const estado = useEstado();
  const agora = hoje();
  const cartao = lerCartao(estado.ajustes[CHAVE_DO_CARTAO]?.valor);
  const vivos = lancamentosVivos(estado);
  const faturas = useMemo(
    () => (cartao ? faturasDoCartao(vivos, cartao, agora) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [estado.lancamentos, estado.ajustes[CHAVE_DO_CARTAO]?.valor, agora],
  );
  const [editandoCartao, setEditandoCartao] = useState(false);
  const [aberta, setAberta] = useState<Lancamento | null>(null);

  if (!estado.carregado) return null;

  if (!cartao || editandoCartao) {
    return (
      <div>
        <Sobrescrito>Cartão de crédito</Sobrescrito>
        <Titulo className="mt-0.5">Fatura</Titulo>
        <CadastroDoCartao
          inicial={cartao}
          aoSalvar={() => setEditandoCartao(false)}
          aoCancelar={cartao ? () => setEditandoCartao(false) : undefined}
        />
      </div>
    );
  }

  const emAndamento = faturas.filter((f) => f.estado !== "paga");
  // A que ainda recebe compras é a "fatura aberta"; a que já fechou espera o pagamento.
  const aAberta = [...emAndamento].reverse().find((f) => f.estado === "aberta") ?? null;
  const fechadas = emAndamento.filter((f) => f.estado === "fechada");
  const pagas = faturas.filter((f) => f.estado === "paga");

  return (
    <div className="pb-4">
      <Sobrescrito>Cartão de crédito</Sobrescrito>
      <Titulo className="mt-0.5">Fatura</Titulo>

      <Cartao escuro className="mt-4 px-5 py-4">
        <Sobrescrito escuro>Fatura aberta</Sobrescrito>
        <p className="mt-1">
          <Dinheiro cents={aAberta?.totalCents ?? 0} tamanho="gigante" />
        </p>
        <p className="mt-2 text-[13px] text-heroi-fosco">
          {aAberta ? (
            <>
              Fecha em <b className="text-heroi-tinta">{curta(aAberta.fechamento)}</b> e vence em{" "}
              <b className="text-heroi-tinta">{curta(aAberta.vencimento)}</b>. Só sai da conta no
              vencimento.
            </>
          ) : (
            "Nenhuma compra no crédito nesta fatura ainda."
          )}
        </p>
      </Cartao>

      {fechadas.map((f) => (
        <FaturaFechada key={f.id} fatura={f} />
      ))}

      {aAberta && (
        <ListaDeCompras titulo="Compras desta fatura" fatura={aAberta} aoAbrir={setAberta} />
      )}

      {pagas.length > 0 && (
        <section className="mt-6">
          <Subtitulo className="mb-2">Pagas</Subtitulo>
          <Cartao className="px-4 py-1">
            {pagas.slice(0, 6).map((f) => (
              <div
                key={f.id}
                className="flex items-baseline justify-between gap-3 border-b border-linha py-2.5 last:border-b-0"
              >
                <span className="text-[14.5px]">
                  Vencia em {curta(f.vencimento)}
                  <span className="ml-2 text-[12.5px] text-fosco">
                    {quantasCompras(f.compras.length)}
                  </span>
                </span>
                <Dinheiro cents={f.totalCents} papel="neutro" />
              </div>
            ))}
          </Cartao>
        </section>
      )}

      <p className="mt-6 text-[13px] leading-relaxed text-fosco">
        Fecha dia {cartao.fechaDia}, vence dia {cartao.venceDia}.{" "}
        <button type="button" onClick={() => setEditandoCartao(true)} className="underline">
          Mudar os dias
        </button>
        . Para lançar no crédito, marque <b>No crédito</b> ao lançar um gasto, ou escolha{" "}
        <b>No crédito</b> nos botões do Gastei.
      </p>

      {aberta && (
        <FolhaDeLancamento
          data={aberta.data}
          lancamento={aberta}
          aoFechar={() => setAberta(null)}
        />
      )}
    </div>
  );
}

function FaturaFechada({ fatura }: { fatura: Fatura }) {
  const estado = useEstado();
  const categorias = categoriasDe(estado);
  const maiorGasto = nomeDoMaiorGasto(fatura, (id) => nomeDaCategoria(categorias, id));
  return (
    <section className="mt-4">
      <Subtitulo className="mb-2">Fechada, esperando o pagamento</Subtitulo>
      <Cartao className="px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[14.5px]">
            Vence em <b>{curta(fatura.vencimento)}</b>
            <Selo tom="quieto">{quantasCompras(fatura.compras.length)}</Selo>
          </span>
          <Dinheiro cents={fatura.totalCents} papel="saida" tamanho="grande" />
        </div>
        <p className="mt-1.5 text-[13px] leading-snug text-fosco">
          {maiorGasto ? `Maior parte em ${maiorGasto}. ` : ""}
          Ao pagar, {comCifrao(fatura.totalCents)} saem da conta.
        </p>
        <div className="mt-3">
          <Botao
            tipo="primario"
            onClick={() => loja.pagarFatura(fatura, hoje())}
            className="w-full"
          >
            Paguei a fatura
          </Botao>
        </div>
      </Cartao>
    </section>
  );
}

const quantasCompras = (n: number) => (n === 1 ? "1 compra" : `${n} compras`);

function nomeDoMaiorGasto(f: Fatura, nome: (id: string) => string): string | null {
  const soma = new Map<string, number>();
  for (const c of f.compras) {
    if (!c.categoria) continue;
    soma.set(c.categoria, (soma.get(c.categoria) ?? 0) + c.valorCents);
  }
  const [melhor] = [...soma.entries()].sort((a, b) => b[1] - a[1]);
  return melhor ? nome(melhor[0]) : null;
}

function ListaDeCompras({
  titulo,
  fatura,
  aoAbrir,
}: {
  titulo: string;
  fatura: Fatura;
  aoAbrir: (l: Lancamento) => void;
}) {
  return (
    <section className="mt-6">
      <Subtitulo className="mb-2">{titulo}</Subtitulo>
      <Cartao className="px-4 py-1">
        {fatura.compras.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => aoAbrir(c)}
            className="flex w-full items-baseline justify-between gap-3 border-b border-linha py-2.5 text-left last:border-b-0"
          >
            <span className="min-w-0 truncate text-[14.5px]">
              {c.nota || "Compra no crédito"}
              <span className="ml-2 text-[12.5px] text-fosco">{curta(c.data)}</span>
            </span>
            <Dinheiro cents={c.valorCents} papel="diario" />
          </button>
        ))}
      </Cartao>
    </section>
  );
}

function CadastroDoCartao({
  inicial,
  aoSalvar,
  aoCancelar,
}: {
  inicial: { fechaDia: number; venceDia: number } | null;
  aoSalvar: () => void;
  aoCancelar?: () => void;
}) {
  const [fecha, setFecha] = useState(String(inicial?.fechaDia ?? ""));
  const [vence, setVence] = useState(String(inicial?.venceDia ?? ""));
  const f = Number(fecha);
  const v = Number(vence);
  const ok = Number.isInteger(f) && f >= 1 && f <= 31 && Number.isInteger(v) && v >= 1 && v <= 31;

  return (
    <div className="mt-4">
      <p className="text-[15px] leading-relaxed text-grafite">
        Para separar o que você compra no crédito, o app precisa saber em que dia a fatura{" "}
        <b>fecha</b> e em que dia <b>vence</b>. Os dois aparecem no app do banco, na tela da fatura.
      </p>
      <Cartao className="mt-4 space-y-3 px-4 py-4">
        <label className="block">
          <span className="text-[13px] text-fosco">Fecha no dia</span>
          <input
            inputMode="numeric"
            value={fecha}
            onChange={(e) => setFecha(e.target.value.replace(/\D/g, "").slice(0, 2))}
            placeholder="25"
            className="tabular mt-1 w-full rounded-folha border border-regua bg-cartao px-3 py-3 text-[17px] outline-none focus:border-saldo"
          />
        </label>
        <label className="block">
          <span className="text-[13px] text-fosco">Vence no dia</span>
          <input
            inputMode="numeric"
            value={vence}
            onChange={(e) => setVence(e.target.value.replace(/\D/g, "").slice(0, 2))}
            placeholder="5"
            className="tabular mt-1 w-full rounded-folha border border-regua bg-cartao px-3 py-3 text-[17px] outline-none focus:border-saldo"
          />
        </label>
        <p className="text-[12.5px] leading-snug text-fosco">
          Compra feita no dia do fechamento já entra na fatura seguinte, como no Nubank.
        </p>
        <div className="flex gap-2">
          <Botao
            tipo="primario"
            onClick={() => {
              if (!ok) return;
              loja.definirAjuste(CHAVE_DO_CARTAO, escreverCartao({ fechaDia: f, venceDia: v }));
              aoSalvar();
            }}
            className="flex-1"
          >
            Salvar
          </Botao>
          {aoCancelar && <Botao onClick={aoCancelar}>Cancelar</Botao>}
        </div>
      </Cartao>
    </div>
  );
}
