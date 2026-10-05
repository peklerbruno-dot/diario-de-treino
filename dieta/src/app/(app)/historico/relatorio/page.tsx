import Link from "next/link";
import { CompartilharSemana } from "@/componentes/compartilhar-semana";
import { ESTADO, FUNDO } from "@/componentes/cores-do-dia";
import { Padroes, ResumoDoPeriodo } from "@/componentes/resumo-periodo";
import { Cartao } from "@/componentes/pecas";
import { litros } from "@/lib/ajustes";
import { milhar } from "@/lib/analise";
import { ajustes, historicoEntre, medidas, planoAtivo } from "@/lib/consultas";
import { diaCurto, hoje, SEMANA_CURTA, diaDaSemana, somarDias } from "@/lib/datas";
import { corDoDia, padroes, resumir } from "@/lib/padroes";
import { linhaDoPeso, textoParaNutricionista } from "@/lib/relatorio";

/**
 * O relatório da semana, para ler aqui mesmo: os números, o dia a dia, os
 * padrões das últimas quatro semanas e o texto exatamente como vai para a
 * nutricionista. As setas andam de 7 em 7 dias para trás.
 */
export default async function Relatorio({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const n = Math.min(Math.max(Number((await searchParams).semana) || 0, 0), 104);
  const agora = hoje();
  const ate = somarDias(agora, -7 * n);
  const desde = somarDias(ate, -6);

  const [dias, antes, quatro, a, plano, pesos] = await Promise.all([
    historicoEntre(desde, ate),
    historicoEntre(somarDias(desde, -7), somarDias(desde, -1)),
    historicoEntre(somarDias(ate, -27), ate),
    ajustes(),
    planoAtivo(),
    medidas(),
  ]);
  const paraPadrao = <T extends { fotos: { nome: string; hora: string }[] }>(l: T[]) => l.map((d) => ({ ...d, fotos: d.fotos.map((f) => ({ nome: f.nome, hora: f.hora })) }));
  const resumo = resumir(paraPadrao(dias), a.aguaMeta);
  const resumoAntes = resumir(paraPadrao(antes), a.aguaMeta);
  const nomeDoPlano = plano?.nome ?? "—";
  const texto = textoParaNutricionista(
    dias.map((d) => ({ ...d, fotos: d.fotos.length })),
    a.aguaMeta,
    nomeDoPlano,
    linhaDoPeso(pesos, desde),
  );

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href={`/historico/relatorio?semana=${n + 1}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-cartao shadow-cartao" aria-label="Semana anterior">
          ‹
        </Link>
        <div className="text-center">
          <p className="text-[19px] font-semibold">{n === 0 ? "Últimos 7 dias" : `${diaCurto(desde)} a ${diaCurto(ate)}`}</p>
          {n === 0 && <p className="text-[13px] text-fosco">{diaCurto(desde)} a {diaCurto(ate)}</p>}
        </div>
        {n > 0 ? (
          <Link href={n === 1 ? "/historico/relatorio" : `/historico/relatorio?semana=${n - 1}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-cartao shadow-cartao" aria-label="Semana seguinte">
            ›
          </Link>
        ) : (
          <span className="h-10 w-10" />
        )}
      </div>

      <ResumoDoPeriodo r={resumo} antes={resumoAntes.diasUsados ? resumoAntes : undefined} rotuloAntes="semana anterior" />

      <p className="sobrescrito mb-2 mt-5 px-1">Dia a dia</p>
      <Cartao className="divide-y divide-linha !py-1">
        {[...dias].reverse().map((d) => {
          const cor = corDoDia(d);
          return (
            <Link key={d.dia} href={`/historico/dia/${d.dia}`} className="flex items-center gap-3 py-2.5">
              <span className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-[10px] text-[11px] leading-tight ${FUNDO[cor]}`}>
                <span className="uppercase">{SEMANA_CURTA[diaDaSemana(d.dia)]}</span>
                <span className="font-semibold tabular">{Number(d.dia.slice(8))}</span>
              </span>
              <span className="flex flex-1 flex-wrap gap-1">
                {d.registros.map((r, i) => (
                  <span key={i} className={`h-2.5 w-2.5 rounded-full ${ESTADO[r.estado]?.ponto ?? "bg-regua"}`} />
                ))}
                {d.fotos.length > 0 && <span className="ml-1 text-[12px] text-fosco">📷 {d.fotos.length}</span>}
              </span>
              <span className="w-[64px] shrink-0 text-right text-[13px] tabular text-fosco">{d.calorias ? `≈${milhar(d.calorias)}` : ""}</span>
              <span className={`w-[48px] shrink-0 text-right text-[13px] tabular ${d.agua >= a.aguaMeta ? "font-semibold text-agua" : "text-fosco"}`}>
                {d.agua ? litros(d.agua) : ""}
              </span>
              <span className="text-fosco" aria-hidden>
                ›
              </span>
            </Link>
          );
        })}
      </Cartao>

      <div className="mt-3">
        <Padroes lista={padroes(paraPadrao(quatro))} titulo="Padrões das últimas 4 semanas" />
      </div>

      <p className="sobrescrito mb-2 mt-5 px-1">O que vai para a nutricionista</p>
      <Cartao>
        <pre className="whitespace-pre-wrap font-texto text-[14px] leading-relaxed text-grafite">{texto}</pre>
      </Cartao>
      <div className="mt-3">
        <CompartilharSemana dias={dias} medidas={pesos} metaDeAgua={a.aguaMeta} nomeDoPlano={nomeDoPlano} />
      </div>
    </>
  );
}
