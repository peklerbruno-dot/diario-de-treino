import { litros } from "@/lib/ajustes";
import { milhar } from "@/lib/analise";
import type { Padrao, Resumo } from "@/lib/padroes";
import { Cartao } from "./pecas";

const pct = (parte: number, todo: number) => (todo ? Math.round((parte / todo) * 100) : null);

/** Os números de um período (mês ou semana), com a comparação ao anterior. */
export function ResumoDoPeriodo({ r, antes, rotuloAntes }: { r: Resumo; antes?: Resumo; rotuloAntes: string }) {
  const marcadas = r.seguiu + r.trocou + r.pulou;
  const agora = pct(r.seguiu, marcadas);
  const anterior = antes ? pct(antes.seguiu, antes.seguiu + antes.trocou + antes.pulou) : null;
  const delta = agora != null && anterior != null ? agora - anterior : null;

  if (r.diasUsados === 0) {
    return (
      <Cartao>
        <p className="text-grafite">Nada registrado neste período.</p>
      </Cartao>
    );
  }

  const blocos = [
    { valor: `${r.diasBons}`, rotulo: `dia${r.diasBons === 1 ? "" : "s"} no plano (de ${r.diasUsados})` },
    { valor: litros(r.mediaAgua), rotulo: `de água por dia · meta em ${r.diasNaMetaDeAgua} dia${r.diasNaMetaDeAgua === 1 ? "" : "s"}`, so: r.mediaAgua > 0 },
    { valor: `≈${milhar(r.mediaKcal)}`, rotulo: `kcal por dia nas fotos (${r.diasComFoto} dia${r.diasComFoto === 1 ? "" : "s"})`, so: r.mediaKcal > 0 },
    { valor: `${r.fotos}`, rotulo: `foto${r.fotos === 1 ? "" : "s"} de prato` },
  ].filter((b) => b.so !== false);

  return (
    <Cartao>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[34px] font-semibold tabular leading-none">{agora != null ? `${agora}%` : "—"}</p>
          <p className="mt-1 text-[13.5px] text-fosco">das refeições marcadas, seguindo o plano</p>
        </div>
        {delta != null && delta !== 0 && (
          <p className={`shrink-0 rounded-full px-2.5 py-1 text-[13px] font-medium tabular ${delta > 0 ? "bg-folha-clara text-folha" : "bg-pulou-clara text-pulou"}`}>
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} pts vs {rotuloAntes}
          </p>
        )}
      </div>
      {marcadas > 0 && (
        <>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full" aria-hidden>
            <div className="bg-folha" style={{ width: `${(r.seguiu / marcadas) * 100}%` }} />
            <div className="bg-troca" style={{ width: `${(r.trocou / marcadas) * 100}%` }} />
            <div className="bg-pulou" style={{ width: `${(r.pulou / marcadas) * 100}%` }} />
          </div>
          <p className="mt-1.5 text-[13px] text-grafite">
            {r.seguiu} segui · {r.trocou} troquei · {r.pulou} pulei
          </p>
        </>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {blocos.map((b, i) => (
          <div key={i} className="rounded-folha bg-papel px-3 py-2">
            <p className="text-[18px] font-semibold tabular leading-tight">{b.valor}</p>
            <p className="text-[12.5px] leading-snug text-fosco">{b.rotulo}</p>
          </div>
        ))}
      </div>
    </Cartao>
  );
}

/** Os padrões encontrados, ou o aviso de que ainda é cedo. */
export function Padroes({ lista, titulo = "Padrões" }: { lista: Padrao[]; titulo?: string }) {
  return (
    <Cartao>
      <p className="font-semibold">{titulo}</p>
      {lista.length === 0 ? (
        <p className="mt-1 text-[14.5px] text-grafite">
          Ainda sem padrões. Eles aparecem com algumas semanas de refeições marcadas — e marcar na hora (ou tirar foto do prato) mostra também
          se os horários estão batendo.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {lista.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-[15px] leading-snug">
              <span aria-hidden>{p.icone}</span>
              <span>{p.texto}</span>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
