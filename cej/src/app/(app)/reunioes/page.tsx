import { bd } from "@/lib/bd";
import { hoje } from "@/lib/datas";
import { LinhaDeReuniao } from "@/componentes/itens";
import { BotaoLink, Cartao, SeloDaReuniao, Topo, Vazio } from "@/componentes/pecas";
import Link from "next/link";
import { comDiaDaSemana } from "@/lib/datas";

export const dynamic = "force-dynamic";

/**
 * As reuniões, em duas listas: as que vêm e as que passaram.
 *
 * A separação existe porque as duas se usam para coisas diferentes. A de cima
 * responde "quando é a próxima e o que está na pauta". A de baixo é o arquivo:
 * é onde se vai procurar, daqui a um ano, por que se decidiu o que se decidiu.
 */
export default async function Reunioes() {
  const hojeStr = hoje();

  const [porVir, passadas] = await Promise.all([
    bd.reuniao.findMany({
      where: { apagadaEm: null, dia: { gte: hojeStr } },
      orderBy: [{ dia: "asc" }, { hora: "asc" }],
    }),
    bd.reuniao.findMany({
      where: { apagadaEm: null, dia: { lt: hojeStr } },
      orderBy: [{ dia: "desc" }],
      take: 60,
      include: { _count: { select: { encaminhamentos: { where: { apagadoEm: null } } } } },
    }),
  ]);

  return (
    <>
      <Topo
        titulo="Reuniões"
        chamada="A pauta antes, a ata depois, e os encaminhamentos saindo de dentro dela com nome e prazo."
        acao={<BotaoLink href="/reunioes/nova" tipo="primario">Marcar reunião</BotaoLink>}
      />

      <div className="space-y-5">
        <Cartao como="section">
          <h2 className="sobrescrito border-b border-linha px-4 py-2.5">O que vem</h2>
          {porVir.length === 0 ? (
            <div className="p-4">
              <Vazio acao={<BotaoLink href="/reunioes/nova">Marcar a próxima</BotaoLink>}>
                Nenhuma reunião marcada.
              </Vazio>
            </div>
          ) : (
            <ul>
              {porVir.map((r) => (
                <LinhaDeReuniao key={r.id} reuniao={r} />
              ))}
            </ul>
          )}
        </Cartao>

        {passadas.length > 0 && (
          <Cartao como="section">
            <h2 className="sobrescrito border-b border-linha px-4 py-2.5">O arquivo</h2>
            <ul>
              {passadas.map((r) => (
                <li key={r.id} className="border-b border-linha last:border-b-0">
                  <Link
                    href={`/reunioes/${r.id}`}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 hover:bg-linha/60"
                  >
                    <span className="min-w-0 flex-1 text-[15px] font-medium">{r.titulo}</span>
                    <span className="text-[13px] text-fosco">
                      {comDiaDaSemana(r.dia)}
                      {r._count.encaminhamentos > 0 &&
                        ` · ${r._count.encaminhamentos} encaminhamento${r._count.encaminhamentos > 1 ? "s" : ""}`}
                      {!r.ata && r.estado !== "CANCELADA" && " · sem ata"}
                    </span>
                    <SeloDaReuniao estado={r.estado} />
                  </Link>
                </li>
              ))}
            </ul>
          </Cartao>
        )}
      </div>
    </>
  );
}
