"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { adicionarCompra, marcarComprado } from "@/app/acoes";
import { Botao, Cartao, Titulo, campo } from "@/componentes/pecas";
import { chaveDoItem, type Planejamento } from "@/lib/semana";

/**
 * A semana planejada: o que comer em cada dia, como cozinhar as marmitas de uma
 * vez e o que comprar. Tudo sai do plano da nutricionista; as preferências
 * ("não gosto de peixe", "tenho airfryer") ajustam o resto.
 */

type Semana = { id: string; inicio: string; criadoEm: string; dados: Planejamento; marcados: string[] } | null;
type Aba = "cardapio" | "preparo" | "compras";

export function TelaSemana({ semana, temPlano, temGemini, preferencias }: { semana: Semana; temPlano: boolean; temGemini: boolean; preferencias: string }) {
  const [aba, setAba] = useState<Aba>("compras");
  const [replanejando, setReplanejando] = useState(false);

  if (!temPlano) {
    return (
      <>
        <Titulo>Semana</Titulo>
        <Cartao>
          <p className="text-grafite">Cadastre o plano da nutricionista primeiro: é dele que sai o cardápio e a lista de compras.</p>
          <Link href="/plano/novo" className="mt-3 inline-block rounded-folha bg-folha px-4 py-2.5 font-medium text-sobre-cor">
            Ler o plano
          </Link>
        </Cartao>
      </>
    );
  }

  if (!semana || replanejando) {
    return (
      <>
        <Titulo>Semana</Titulo>
        <Planejar temGemini={temGemini} preferencias={preferencias} aoVoltar={semana ? () => setReplanejando(false) : undefined} />
      </>
    );
  }

  const total = semana.dados.compras.reduce((s, c) => s + c.itens.length, 0);
  return (
    <>
      <Titulo
        depois={
          <Botao tipo="fantasma" className="mb-1 !px-2 text-[15px]" onClick={() => setReplanejando(true)}>
            Planejar de novo
          </Botao>
        }
      >
        Semana
      </Titulo>

      <div className="mb-4 grid grid-cols-3 gap-1 rounded-folha bg-cartao p-1 shadow-cartao" role="tablist">
        {(
          [
            ["compras", `Compras`],
            ["cardapio", "Cardápio"],
            ["preparo", "Preparo"],
          ] as [Aba, string][]
        ).map(([chave, rotulo]) => (
          <button
            key={chave}
            type="button"
            role="tab"
            aria-selected={aba === chave}
            onClick={() => setAba(chave)}
            className={`whitespace-nowrap rounded-[12px] py-2 text-[15px] ${aba === chave ? "bg-folha font-semibold text-sobre-cor" : "text-grafite"}`}
          >
            {rotulo}
            {chave === "compras" && <span className="ml-1 text-[12.5px] font-normal tabular opacity-80">{semana.marcados.length}/{total}</span>}
          </button>
        ))}
      </div>

      {aba === "compras" && <Compras semana={semana} />}

      {aba === "cardapio" && (
        <div className="space-y-3">
          {semana.dados.cardapio.map((d) => (
            <Cartao key={d.dia}>
              <p className="text-[17px] font-semibold">{d.dia}</p>
              <ul className="mt-1 divide-y divide-linha">
                {d.refeicoes.map((r, i) => (
                  <li key={i} className="py-2">
                    <p className="text-[13px] text-fosco">{r.nome}</p>
                    <p className="text-[15.5px] leading-snug">{r.prato}</p>
                  </li>
                ))}
              </ul>
            </Cartao>
          ))}
        </div>
      )}

      {aba === "preparo" && (
        <Cartao>
          <p className="text-[17px] font-semibold">Dia de cozinhar</p>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-[15.5px] leading-snug">
            {semana.dados.preparo.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
          {semana.dados.dicas && <p className="mt-4 rounded-folha bg-papel px-3 py-2 text-[14.5px] text-grafite">💡 {semana.dados.dicas}</p>}
        </Cartao>
      )}
    </>
  );
}

function Compras({ semana }: { semana: NonNullable<Semana> }) {
  const [, iniciar] = useTransition();
  const [marcados, alternar] = useOptimistic(new Set(semana.marcados), (atual, [chave, sim]: [string, boolean]) => {
    const novo = new Set(atual);
    if (sim) novo.add(chave);
    else novo.delete(chave);
    return novo;
  });
  const [novo, setNovo] = useState("");

  return (
    <div className="space-y-3">
      {semana.dados.compras.map((sec) => (
        <Cartao key={sec.secao} className="!py-2">
          <p className="sobrescrito pt-1">{sec.secao}</p>
          <ul className="divide-y divide-linha">
            {sec.itens.map((i) => {
              const chave = chaveDoItem(sec.secao, i.item);
              const ok = marcados.has(chave);
              return (
                <li key={chave}>
                  <label className="flex min-h-[48px] cursor-pointer items-center gap-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={ok}
                      onChange={(e) => {
                        const sim = e.target.checked;
                        iniciar(async () => {
                          alternar([chave, sim]);
                          await marcarComprado(semana.id, chave, sim);
                        });
                      }}
                      className="h-5 w-5 accent-[var(--folha)]"
                    />
                    <span className={`flex-1 text-[16px] ${ok ? "text-fosco line-through" : ""}`}>{i.item}</span>
                    {i.quantidade && <span className="text-right text-[14px] text-fosco">{i.quantidade}</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        </Cartao>
      ))}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const item = novo;
          setNovo("");
          iniciar(() => adicionarCompra(semana.id, item));
        }}
      >
        <input className={campo} value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Acrescentar item…" />
        <Botao type="submit" disabled={!novo.trim()}>
          +
        </Botao>
      </form>
    </div>
  );
}

function Planejar({ temGemini, preferencias, aoVoltar }: { temGemini: boolean; preferencias: string; aoVoltar?: () => void }) {
  const router = useRouter();
  const [pref, setPref] = useState(preferencias);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");

  const gerar = async () => {
    setErro("");
    setGerando(true);
    try {
      const r = await fetch("/api/semana", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferencias: pref }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.erro ?? "Não consegui planejar agora.");
      aoVoltar?.();
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui planejar agora.");
    } finally {
      setGerando(false);
    }
  };

  return (
    <Cartao>
      <p className="text-[18px] font-semibold">Planejar a semana</p>
      <p className="mt-1 text-[15px] leading-snug text-grafite">
        A partir do seu plano, o app monta o cardápio de cada dia (com marmitas para cozinhar de uma vez), o passo a passo do
        preparo e a lista de compras.
      </p>
      <label className="mt-4 block">
        <span className="text-[13px] text-fosco">Preferências e restrições (opcional)</span>
        <textarea
          className={`${campo} min-h-[90px]`}
          value={pref}
          onChange={(e) => setPref(e.target.value)}
          placeholder="Ex.: não gosto de peixe; tenho airfryer; cozinho no domingo; almoço e jantar de marmita"
        />
      </label>
      {!temGemini && <p className="mt-2 text-[14px] text-pulou">Falta a chave GEMINI_API_KEY na Vercel para isso funcionar.</p>}
      {erro && <p className="mt-2 text-[14px] text-pulou">{erro}</p>}
      <Botao tipo="primario" className="mt-3 w-full" disabled={gerando || !temGemini} onClick={gerar}>
        {gerando ? "Montando a semana… (até um minuto)" : "Planejar a semana"}
      </Botao>
      {aoVoltar && (
        <Botao tipo="fantasma" className="mt-1 w-full" onClick={aoVoltar}>
          Voltar para a semana atual
        </Botao>
      )}
    </Cartao>
  );
}
