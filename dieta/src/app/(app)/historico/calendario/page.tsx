import Link from "next/link";
import { FUNDO, LEGENDA } from "@/componentes/cores-do-dia";
import { Padroes, ResumoDoPeriodo } from "@/componentes/resumo-periodo";
import { Cartao } from "@/componentes/pecas";
import { ajustes, historicoEntre, medidas } from "@/lib/consultas";
import { diaCurto, hoje, SEMANA_CURTA, maiuscula } from "@/lib/datas";
import { corDoDia, ehMes, mesPorExtenso, padroes, resumir, semanasDoMes, somarMeses, ultimoDiaDoMes } from "@/lib/padroes";

/**
 * O mês num relance: cada dia pintado pelo quanto seguiu o plano, com um
 * pontinho onde há foto. Tocar num dia abre o dia inteiro. Embaixo, os números
 * do mês contra o mês anterior e os padrões.
 */
export default async function Calendario({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const agora = hoje();
  const pedido = (await searchParams).mes ?? "";
  const mesAtual = agora.slice(0, 7);
  const mes = ehMes(pedido) && pedido <= mesAtual ? pedido : mesAtual;
  const anterior = somarMeses(mes, -1);
  const fim = ultimoDiaDoMes(mes) < agora ? ultimoDiaDoMes(mes) : agora;

  const [dias, diasAntes, a, pesos] = await Promise.all([
    historicoEntre(`${mes}-01`, fim),
    historicoEntre(`${anterior}-01`, ultimoDiaDoMes(anterior)),
    ajustes(),
    medidas(),
  ]);
  const porDia = new Map(dias.map((d) => [d.dia, d]));
  const paraPadrao = dias.map((d) => ({ ...d, fotos: d.fotos.map((f) => ({ nome: f.nome, hora: f.hora })) }));
  const resumo = resumir(paraPadrao, a.aguaMeta);
  const resumoAntes = resumir(diasAntes.map((d) => ({ ...d, fotos: d.fotos.map((f) => ({ nome: f.nome, hora: f.hora })) })), a.aguaMeta);

  // Peso no mês: a primeira e a última pesagem dentro dele.
  const pesosDoMes = pesos.filter((m) => m.peso != null && m.dia.startsWith(mes));
  const kg = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const variacao = pesosDoMes.length >= 2 ? pesosDoMes[0].peso! - pesosDoMes[pesosDoMes.length - 1].peso! : null;

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href={`/historico/calendario?mes=${anterior}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-cartao shadow-cartao" aria-label="Mês anterior">
          ‹
        </Link>
        <p className="text-[19px] font-semibold">{maiuscula(mesPorExtenso(mes))}</p>
        {mes < mesAtual ? (
          <Link href={`/historico/calendario?mes=${somarMeses(mes, 1)}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-cartao shadow-cartao" aria-label="Mês seguinte">
            ›
          </Link>
        ) : (
          <span className="h-10 w-10" />
        )}
      </div>

      <Cartao className="!p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-[11.5px] uppercase text-fosco">
          {SEMANA_CURTA.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <div className="mt-1 space-y-1">
          {semanasDoMes(mes).map((semana, i) => (
            <div key={i} className="grid grid-cols-7 gap-1">
              {semana.map((dia, j) => {
                if (!dia) return <span key={j} />;
                const n = Number(dia.slice(8));
                if (dia > agora) {
                  return (
                    <span key={j} className="flex aspect-square items-center justify-center rounded-[10px] text-[14px] text-regua">
                      {n}
                    </span>
                  );
                }
                const d = porDia.get(dia);
                const cor = d ? corDoDia(d) : "vazio";
                return (
                  <Link
                    key={j}
                    href={`/historico/dia/${dia}`}
                    className={`relative flex aspect-square flex-col items-center justify-center rounded-[10px] text-[15px] font-medium tabular ${FUNDO[cor]} ${dia === agora ? "ring-2 ring-tinta ring-offset-1" : ""}`}
                    aria-label={`${diaCurto(dia)}${d?.fotos.length ? `, ${d.fotos.length} foto(s)` : ""}`}
                  >
                    {n}
                    <span className="absolute bottom-1 flex gap-0.5" aria-hidden>
                      {d && d.fotos.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
                      {d && d.agua >= a.aguaMeta && <span className="h-1.5 w-1.5 rounded-full bg-agua ring-1 ring-white/70" />}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-grafite">
          {LEGENDA.map((l) => (
            <li key={l.cor} className="flex items-center gap-1">
              <span className={`h-3 w-3 rounded-[4px] ${FUNDO[l.cor]}`} /> {l.rotulo}
            </li>
          ))}
          <li className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-grafite" /> foto
          </li>
          <li className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-agua" /> água na meta
          </li>
        </ul>
      </Cartao>

      <p className="sobrescrito mb-2 mt-5 px-1">O mês</p>
      <ResumoDoPeriodo r={resumo} antes={resumoAntes.diasUsados ? resumoAntes : undefined} rotuloAntes={mesPorExtenso(anterior).split(" ")[0]} />
      {pesosDoMes.length > 0 && (
        <Cartao className="mt-3 !py-3">
          <p className="text-[15px]">
            ⚖️ {kg(pesosDoMes[0].peso!)} kg
            {variacao != null && (
              <span className="text-grafite">
                {" "}
                ({variacao > 0 ? "+" : variacao < 0 ? "−" : "±"}
                {kg(Math.abs(variacao))} kg no mês)
              </span>
            )}
          </p>
        </Cartao>
      )}

      <div className="mt-3">
        <Padroes lista={padroes(paraPadrao)} titulo="Padrões do mês" />
      </div>
    </>
  );
}
