import Link from "next/link";
import { bd } from "@/lib/bd";
import { exigirMembro } from "@/lib/auth";
import { primeiroNome } from "@/lib/cores";
import { Cabecalho, Pagina, Vazio } from "@/componentes/pecas";
import { NovaEnquete } from "@/componentes/nova-enquete";
import { apagarEnquete, encerrarEnquete, votarEmEnquete } from "@/acoes/votacoes";

export default async function Votacoes({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { eu } = await exigirMembro(id);
  const [enquetes, lugares, membros] = await Promise.all([
    bd.enquete.findMany({
      where: { viagemId: id },
      include: { opcoes: { orderBy: { ordem: "asc" } }, votos: true },
      orderBy: [{ encerrada: "asc" }, { criadoEm: "desc" }],
    }),
    bd.lugar.findMany({ where: { viagemId: id, apagadoEm: null, fomos: false }, select: { id: true, nome: true, cidade: true }, orderBy: { nome: "asc" } }),
    bd.membro.findMany({ where: { viagemId: id }, select: { id: true, nome: true, saiuEm: true } }),
  ]);
  const ativos = membros.filter((m) => !m.saiuEm).length;
  const nome = (mid: string) => (mid === eu.id ? "você" : primeiroNome(membros.find((m) => m.id === mid)?.nome ?? "?"));

  return (
    <Pagina abas>
      <Cabecalho titulo="Votações" voltar={`/v/${id}`} subtitulo="Decidam rápido: cada um vota uma vez e pode mudar de ideia." />

      <details className="cartao mb-6 p-4" open={enquetes.length === 0}>
        <summary className="cursor-pointer font-semibold text-realce">+ Nova votação</summary>
        <div className="mt-3">
          <NovaEnquete viagemId={id} lugares={lugares} />
        </div>
      </details>

      {enquetes.length === 0 ? (
        <Vazio titulo="Nenhuma votação ainda">“Jantar hoje: Contramar, Pujol ou Orinoco?” — abra a primeira aqui em cima.</Vazio>
      ) : (
        <ul className="space-y-4">
          {enquetes.map((e) => {
            const meu = e.votos.find((v) => v.membroId === eu.id)?.opcaoId;
            const maior = Math.max(0, ...e.opcoes.map((o) => e.votos.filter((v) => v.opcaoId === o.id).length));
            return (
              <li key={e.id} id={e.id} className="cartao scroll-mt-4 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-titulo text-[18px] font-bold leading-snug">{e.pergunta}</p>
                  {e.encerrada && <span className="shrink-0 rounded-pilula bg-linha px-2 py-0.5 text-[12px] font-semibold text-fosco">encerrada</span>}
                </div>
                <p className="mt-0.5 text-[13px] text-fosco">{e.votos.length} de {ativos} votaram{!meu && !e.encerrada ? " · falta você" : ""}</p>
                <ul className="mt-3 space-y-2">
                  {e.opcoes.map((o) => {
                    const votos = e.votos.filter((v) => v.opcaoId === o.id);
                    const pct = e.votos.length ? Math.round((votos.length / e.votos.length) * 100) : 0;
                    const vencendo = votos.length > 0 && votos.length === maior;
                    return (
                      <li key={o.id}>
                        <form action={votarEmEnquete}>
                          <input type="hidden" name="viagemId" value={id} />
                          <input type="hidden" name="opcaoId" value={o.id} />
                          <button
                            disabled={e.encerrada}
                            aria-pressed={meu === o.id}
                            className={`relative w-full overflow-hidden rounded-folha border px-3 py-2.5 text-left ${meu === o.id ? "border-realce" : "border-regua"}`}
                          >
                            <span className="absolute inset-y-0 left-0 bg-realce-fraco" style={{ width: `${pct}%` }} aria-hidden />
                            <span className="relative flex items-center justify-between gap-2">
                              <span className={vencendo ? "font-semibold" : ""}>
                                {meu === o.id ? "● " : ""}{o.texto}
                              </span>
                              <span className="text-[14px] tabular-nums text-grafite">{votos.length} · {pct}%</span>
                            </span>
                          </button>
                        </form>
                        {votos.length > 0 && <p className="mt-0.5 pl-1 text-[12px] text-fosco">{votos.map((v) => nome(v.membroId)).join(", ")}</p>}
                        {o.lugarId && (
                          <Link href={`/v/${id}/lugares/${o.lugarId}`} className="pl-1 text-[12px] text-realce">ver lugar</Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-3 flex gap-4 text-[14px]">
                  <form action={encerrarEnquete}>
                    <input type="hidden" name="viagemId" value={id} />
                    <input type="hidden" name="enqueteId" value={e.id} />
                    {e.encerrada && <input type="hidden" name="reabrir" value="1" />}
                    <button className="text-realce">{e.encerrada ? "Reabrir" : "Encerrar"}</button>
                  </form>
                  <form action={apagarEnquete}>
                    <input type="hidden" name="viagemId" value={id} />
                    <input type="hidden" name="enqueteId" value={e.id} />
                    <button className="text-fosco">Apagar</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Pagina>
  );
}
