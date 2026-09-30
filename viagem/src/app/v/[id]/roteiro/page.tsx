import Link from "next/link";
import { bd } from "@/lib/bd";
import { exigirMembro } from "@/lib/auth";
import { diasEntre, hoje, porExtenso, diferencaEmDias } from "@/lib/datas";
import { infoCategoria, linkDaRotaDoDia, linkDeRota, MAXIMO_DE_PARADAS } from "@/lib/lugares";
import { Cabecalho, Pagina } from "@/componentes/pecas";
import { FormularioDeItem } from "@/componentes/formulario-item";
import { ItemDoRoteiro } from "@/componentes/item-roteiro";

export default async function Roteiro({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { viagem } = await exigirMembro(id);
  const dias = diasEntre(viagem.inicio, viagem.fim);
  const [itens, lugares] = await Promise.all([
    bd.itemRoteiro.findMany({
      where: { viagemId: id },
      include: { lugar: true },
      orderBy: [{ dia: "asc" }, { ordem: "asc" }, { criadoEm: "asc" }],
    }),
    bd.lugar.findMany({ where: { viagemId: id, apagadoEm: null }, select: { id: true, nome: true, cidade: true }, orderBy: { nome: "asc" } }),
  ]);
  const dia = hoje();
  const opcoes = lugares.map((l) => ({ id: l.id, nome: l.cidade ? `${l.nome} (${l.cidade})` : l.nome }));

  // Com hora primeiro, pela hora; os sem hora depois, na ordem combinada.
  const doDia = (d: string) => {
    const xs = itens.filter((i) => i.dia === d);
    return [...xs.filter((i) => i.hora).sort((a, b) => a.hora.localeCompare(b.hora)), ...xs.filter((i) => !i.hora)];
  };

  return (
    <Pagina abas>
      <Cabecalho titulo="Roteiro" subtitulo={`${dias.length} dias · ${itens.length} programas`} />

      <details className="cartao mb-6 p-4">
        <summary className="cursor-pointer font-semibold text-realce">+ Pôr no roteiro</summary>
        <div className="mt-3">
          <FormularioDeItem viagemId={id} dias={dias} lugares={opcoes} diaInicial={dia >= viagem.inicio && dia <= viagem.fim ? dia : viagem.inicio} />
        </div>
      </details>

      <ol className="space-y-6">
        {dias.map((d, n) => {
          const lista = doDia(d);
          const paradas = lista.filter((i) => i.lugar).map((i) => i.lugar!);
          const rota = linkDaRotaDoDia(paradas);
          const ehHoje = d === dia;
          return (
            <li key={d} id={d} className="scroll-mt-4">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h2 className={`font-titulo text-[19px] font-bold ${ehHoje ? "text-realce" : ""}`}>
                  Dia {n + 1} · <span className="font-normal">{porExtenso(d)}</span>
                  {ehHoje && <span className="ml-2 rounded-pilula bg-realce px-2 py-0.5 text-[12px] font-bold text-realce-tinta">hoje</span>}
                </h2>
                {!ehHoje && diferencaEmDias(dia, d) === 1 && <span className="text-[13px] text-fosco">amanhã</span>}
              </div>
              <div className="cartao divide-y divide-linha">
                {lista.length === 0 ? (
                  <p className="px-4 py-3 text-[15px] text-fosco">Livre.</p>
                ) : (
                  lista.map((i) => (
                    <ItemDoRoteiro
                      key={i.id}
                      viagemId={id}
                      dias={dias}
                      lugares={opcoes}
                      item={{ id: i.id, dia: i.dia, hora: i.hora, titulo: i.titulo, notas: i.notas, lugarId: i.lugarId }}
                      emoji={i.lugar ? infoCategoria(i.lugar.categoria).emoji : ""}
                      hrefLugar={i.lugar ? `/v/${id}/lugares/${i.lugar.id}` : null}
                      rota={i.lugar ? linkDeRota(i.lugar) : null}
                    />
                  ))
                )}
                {rota && paradas.length > 1 && (
                  <a href={rota} target="_blank" rel="noreferrer" className="block px-4 py-3 text-center text-[15px] font-semibold text-realce">
                    🧭 Rota do dia ({Math.min(paradas.length, MAXIMO_DE_PARADAS)} paradas)
                    {paradas.length > MAXIMO_DE_PARADAS && <span className="block text-[12px] font-normal text-fosco">O Google aceita até {MAXIMO_DE_PARADAS}; as outras ficam de fora.</span>}
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {lugares.length === 0 && (
        <p className="mt-6 text-[15px] text-fosco">
          Dica: junte lugares em <Link href={`/v/${id}/lugares`} className="text-realce">Lugares</Link> e depois ponha no dia — a rota do dia sai sozinha.
        </p>
      )}
    </Pagina>
  );
}
