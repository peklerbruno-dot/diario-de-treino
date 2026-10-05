import Link from "next/link";
import { notFound } from "next/navigation";
import { ESTADO, FUNDO } from "@/componentes/cores-do-dia";
import { Miniaturas } from "@/componentes/foto-do-prato";
import { Cartao } from "@/componentes/pecas";
import { litros } from "@/lib/ajustes";
import { milhar, somarDia } from "@/lib/analise";
import { ajustes, umDia } from "@/lib/consultas";
import { diaPorExtenso, hoje, horaFalada, somarDias, maiuscula } from "@/lib/datas";
import { corDoDia, HUMORES, ehHumor } from "@/lib/padroes";

/**
 * Um dia inteiro numa tela só: o que foi marcado em cada refeição (e como
 * estava), as fotos de cada uma, a água, as calorias e o peso, se pesou.
 */
export default async function PaginaDoDia({ params }: { params: Promise<{ dia: string }> }) {
  const { dia } = await params;
  const agora = hoje();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || dia > agora) notFound();
  const [d, a] = await Promise.all([umDia(dia), ajustes()]);
  const cor = corDoDia(d);
  const total = d.seguiu + d.trocou + d.pulou;
  const macros = somarDia(d.fotos.map((f) => f.analise));
  const nomesComRegistro = new Set(d.registros.map((r) => r.nome));
  const fotosSoltas = d.fotos.filter((f) => !nomesComRegistro.has(f.nome));
  const anterior = somarDias(dia, -1);
  const seguinte = somarDias(dia, 1);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href={`/historico/dia/${anterior}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-cartao shadow-cartao" aria-label="Dia anterior">
          ‹
        </Link>
        <div className="text-center">
          <p className="text-[20px] font-semibold leading-tight">{maiuscula(diaPorExtenso(dia))}</p>
          <Link href={`/historico/calendario?mes=${dia.slice(0, 7)}`} className="text-[13px] text-folha">
            ver o mês
          </Link>
        </div>
        {seguinte <= agora ? (
          <Link href={`/historico/dia/${seguinte}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-cartao shadow-cartao" aria-label="Dia seguinte">
            ›
          </Link>
        ) : (
          <span className="h-10 w-10" />
        )}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div className={`rounded-folha py-2.5 ${FUNDO[cor]}`}>
          <p className="text-[20px] font-semibold tabular leading-none">{total ? `${Math.round((d.seguiu / total) * 100)}%` : "—"}</p>
          <p className="mt-1 text-[12px] opacity-90">no plano</p>
        </div>
        <div className={`rounded-folha py-2.5 ${d.agua >= a.aguaMeta ? "bg-agua text-sobre-cor" : "bg-cartao shadow-cartao"}`}>
          <p className="text-[20px] font-semibold tabular leading-none">{d.agua ? litros(d.agua) : "—"}</p>
          <p className="mt-1 text-[12px] opacity-90">de água</p>
        </div>
        <div className="rounded-folha bg-cartao py-2.5 shadow-cartao">
          <p className="text-[20px] font-semibold tabular leading-none">{d.calorias ? `≈${milhar(d.calorias)}` : "—"}</p>
          <p className="mt-1 text-[12px] text-fosco">kcal nas fotos</p>
        </div>
      </div>

      {macros.fotos > 0 && (
        <p className="-mt-2 mb-4 text-center text-[13px] text-fosco">
          ≈ {macros.proteinas} g de proteína · {macros.carboidratos} g de carboidrato · {macros.gorduras} g de gordura
        </p>
      )}

      {d.peso != null && (
        <Cartao className="mb-3 !py-3">
          <p className="text-[15px]">
            ⚖️ Peso: <span className="font-semibold tabular">{d.peso.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} kg</span>
          </p>
        </Cartao>
      )}

      {d.registros.length === 0 && d.fotos.length === 0 && (
        <Cartao>
          <p className="text-grafite">Nada marcado neste dia.</p>
        </Cartao>
      )}

      <div className="space-y-3">
        {d.registros.map((r) => {
          const e = ESTADO[r.estado];
          const fotos = d.fotos.filter((f) => f.nome === r.nome);
          return (
            <Cartao key={r.refeicaoId}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] tabular text-fosco">
                    {horaFalada(r.horario)}
                    {r.hora && r.hora !== r.horario && <> · marcado às {horaFalada(r.hora)}</>}
                  </p>
                  <p className="text-[18px] font-semibold leading-tight">{r.nome}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {ehHumor(r.humor) && (
                    <span title={HUMORES[r.humor].rotulo} aria-label={HUMORES[r.humor].rotulo} className="text-[20px]">
                      {HUMORES[r.humor].emoji}
                    </span>
                  )}
                  <span className={`rounded-full px-2.5 py-1 text-[13px] font-medium ${e?.cor ?? "bg-papel"}`}>{e?.rotulo ?? r.estado}</span>
                </div>
              </div>
              {r.nota && <p className="mt-1 text-[15px] text-grafite">Comi: {r.nota}</p>}
              {fotos.length > 0 && (
                <div className="mt-3">
                  <Miniaturas fotos={fotos} grande />
                </div>
              )}
            </Cartao>
          );
        })}

        {fotosSoltas.length > 0 && (
          <Cartao>
            <p className="mb-2 font-semibold">{d.registros.length ? "Outras fotos" : "Fotos do dia"}</p>
            <Miniaturas fotos={fotosSoltas} grande />
          </Cartao>
        )}
      </div>
    </>
  );
}
