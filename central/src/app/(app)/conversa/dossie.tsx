import type { Conta, Conversa } from "@prisma/client";
import { dossieDe } from "@/lib/dossie";
import type { MensagemGmail } from "@/lib/gmail";
import { CotaEsgotada, GeminiSobrecarregado, iaConfigurada, type Dossie } from "@/lib/ia";

const diaCurto = (dia: string) =>
  new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "numeric", month: "numeric" });

/**
 * Por que isso está na sua lista: a história da conversa contada em poucas
 * linhas. Carrega à parte (dentro de um Suspense), para a conversa abrir na
 * hora mesmo quando o dossiê ainda está sendo escrito.
 */
export async function DossieDaConversa({ c, mensagens }: { c: Conversa & { conta: Conta }; mensagens: MensagemGmail[] }) {
  const guardado = c.dossie && c.dossieMsgId === c.ultimaMensagemId;
  if (!guardado && (!mensagens.length || !iaConfigurada())) return <ResumoCurto c={c} />;
  let d: Dossie;
  try {
    d = await dossieDe(c, mensagens);
  } catch (e) {
    console.error("[dossiê]", e);
    const aviso =
      e instanceof CotaEsgotada || e instanceof GeminiSobrecarregado ? e.message : "Não deu para montar o histórico agora.";
    return (
      <>
        <ResumoCurto c={c} />
        <p className="mt-3 text-[13px] text-fosco">{aviso}</p>
      </>
    );
  }
  return <Quadro d={d} />;
}

/** Enquanto o dossiê não chega (e quando não dá para fazê-lo): o resumo da triagem. */
export function ResumoCurto({ c }: { c: Conversa }) {
  if (!c.resumo) return null;
  return <p className="mt-5 text-[16px] leading-relaxed text-grafite">{c.resumo}</p>;
}

export function DossieCarregando({ c }: { c: Conversa }) {
  return (
    <>
      <ResumoCurto c={c} />
      <p className="mt-3 animate-pulse text-[13px] text-fosco">Montando o histórico…</p>
    </>
  );
}

function Quadro({ d }: { d: Dossie }) {
  const rotulo = "w-[92px] shrink-0 text-[13px] font-semibold text-fosco pt-[3px]";
  const linha = "flex flex-col gap-1 sm:flex-row sm:gap-4";
  return (
    <dl className="mt-6 space-y-5 text-[15px] leading-relaxed">
      {d.porque && (
        <div className={linha}>
          <dt className={rotulo}>Por quê</dt>
          <dd className="min-w-0 flex-1">{d.porque}</dd>
        </div>
      )}
      {d.linha.length > 0 && (
        <div className={linha}>
          <dt className={rotulo}>O que houve</dt>
          <dd className="min-w-0 flex-1">
            <ol className="relative space-y-2 border-l border-linha pl-4">
              {d.linha.map((p, i) => (
                <li key={i} className="relative">
                  <span
                    className={`absolute -left-[21px] top-[9px] h-[9px] w-[9px] rounded-full border-2 border-fundo ${
                      i === d.linha.length - 1 ? "bg-tinta" : "bg-regua"
                    }`}
                  />
                  <span className="numeros mr-2 text-[13px] text-fosco">{diaCurto(p.data)}</span>
                  {p.texto}
                </li>
              ))}
            </ol>
          </dd>
        </div>
      )}
      {d.combinado && (
        <div className={linha}>
          <dt className={rotulo}>Combinado</dt>
          <dd className="min-w-0 flex-1">{d.combinado}</dd>
        </div>
      )}
      {d.falta && (
        <div className={linha}>
          <dt className={rotulo}>Falta</dt>
          <dd className="min-w-0 flex-1 font-medium">{d.falta}</dd>
        </div>
      )}
    </dl>
  );
}
