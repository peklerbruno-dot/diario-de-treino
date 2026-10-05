"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Miniaturas } from "@/componentes/foto-do-prato";
import { Cartao } from "@/componentes/pecas";
import { milhar, somarDia } from "@/lib/analise";
import type { FotoDoDia } from "@/lib/consultas";
import { diaPorExtenso, maiuscula } from "@/lib/datas";

type Pagina = { fotos: FotoDoDia[]; proxima: string | null };

/**
 * Todas as fotos dos pratos, por dia, da mais nova para a mais velha. O filtro
 * de cima mostra uma refeição só — "todos os almoços" — que é o jeito mais
 * rápido de ver se o prato do dia a dia está parecido com o do plano.
 */
export function GaleriaDeFotos({ refeicao, nomes, inicio }: { refeicao: string; nomes: string[]; inicio: Pagina }) {
  const [fotos, setFotos] = useState(inicio.fotos);
  const [proxima, setProxima] = useState(inicio.proxima);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  // Foto apagada ou analisada de novo: o servidor manda a primeira página
  // outra vez, e a lista recomeça dela.
  useEffect(() => {
    setFotos(inicio.fotos);
    setProxima(inicio.proxima);
  }, [inicio]);

  const mais = async () => {
    if (!proxima) return;
    setCarregando(true);
    setErro(false);
    try {
      const q = new URLSearchParams({ antes: proxima, ...(refeicao ? { refeicao } : {}) });
      const r = await fetch(`/api/galeria?${q}`);
      if (!r.ok) throw new Error();
      const p = (await r.json()) as Pagina;
      setFotos((f) => [...f, ...p.fotos]);
      setProxima(p.proxima);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  };

  const porDia: { dia: string; fotos: FotoDoDia[] }[] = [];
  for (const f of fotos) {
    const ultimo = porDia.at(-1);
    if (ultimo?.dia === f.dia) ultimo.fotos.push(f);
    else porDia.push({ dia: f.dia, fotos: [f] });
  }

  const chip = (ativo: boolean) => `shrink-0 rounded-full px-3 py-1.5 text-[14px] ${ativo ? "bg-tinta text-cartao" : "bg-cartao text-grafite shadow-cartao"}`;

  return (
    <>
      {nomes.length > 1 && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
          <Link href="/historico/fotos" className={chip(!refeicao)}>
            Todas
          </Link>
          {nomes.map((n) => (
            <Link key={n} href={`/historico/fotos?refeicao=${encodeURIComponent(n)}`} className={chip(refeicao === n)}>
              {n}
            </Link>
          ))}
        </div>
      )}

      {fotos.length === 0 && (
        <Cartao>
          <p className="text-grafite">
            {refeicao ? `Nenhuma foto de ${refeicao.toLowerCase()} ainda.` : "Nenhuma foto ainda. Na tela Hoje, toque em “Foto do prato” depois de servir."}
          </p>
        </Cartao>
      )}

      <div className="space-y-4">
        {porDia.map(({ dia, fotos: doDia }) => {
          const kcal = somarDia(doDia.map((f) => f.analise)).calorias;
          return (
            <section key={dia}>
              <div className="mb-1.5 flex items-baseline justify-between px-1">
                <Link href={`/historico/dia/${dia}`} className="text-[15px] font-semibold">
                  {maiuscula(diaPorExtenso(dia))} ›
                </Link>
                {kcal > 0 && <span className="text-[13px] tabular text-fosco">≈ {milhar(kcal)} kcal</span>}
              </div>
              <Miniaturas fotos={doDia} grande comDia />
            </section>
          );
        })}
      </div>

      {proxima && (
        <button type="button" onClick={mais} disabled={carregando} className="mt-4 w-full rounded-folha bg-cartao py-3 text-[15px] font-medium shadow-cartao disabled:opacity-60">
          {carregando ? "Carregando…" : "Mais fotos"}
        </button>
      )}
      {erro && <p className="mt-2 text-center text-[14px] text-pulou">Não consegui carregar. Tente de novo.</p>}
    </>
  );
}
