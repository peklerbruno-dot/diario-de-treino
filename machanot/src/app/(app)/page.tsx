import Link from "next/link";
import { listarMachanot } from "@/lib/carregar";
import { Cartao, CartaoCorpo } from "@/components/ui/card";
import { Selo } from "@/components/ui/badge";
import { brl } from "@/lib/dinheiro";
import { STATUS, TIPOS_MACHANE } from "@/lib/textos";
import { NovaMachane } from "@/components/machane/nova";

const TOM_STATUS = {
  RASCUNHO: "neutro",
  EM_REVISAO: "atencao",
  PUBLICADA: "ok",
  ENCERRADA: "neutro",
} as const;

export default async function PaginaInicial() {
  const machanot = await listarMachanot();

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Machanot</h1>
          <p className="mt-1 text-sm text-suave">
            Duas por ano — kaitz e choref —, cada uma com grandes e pequenos.
          </p>
        </div>
        <NovaMachane
          anteriores={machanot.map((m) => ({ id: m.id, nome: m.nome, ano: m.ano, tipo: m.tipo }))}
        />
      </div>

      {machanot.length === 0 ? (
        <Cartao>
          <CartaoCorpo>
            <p className="text-sm text-suave">
              Nenhuma machané ainda. Crie a primeira — ou, se já houver uma edição anterior no
              sistema, duplique-a: a estrutura vem junto, as quantidades vêm zeradas e cada gasto
              herdado fica marcado para revisão.
            </p>
          </CartaoCorpo>
        </Cartao>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {machanot.map((m) => (
            <Link key={m.id} href={`/machane/${m.id}/parametros`} className="block">
              <Cartao className="h-full transition-shadow hover:shadow-md">
                <CartaoCorpo className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">{m.nome}</h2>
                      <p className="text-xs text-suave">
                        {TIPOS_MACHANE[m.tipo]} · {m.ano}
                      </p>
                    </div>
                    <Selo variante={TOM_STATUS[m.status]}>{STATUS[m.status]}</Selo>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-suave">
                    <div>
                      <dt className="inline">diária </dt>
                      <dd className="tabular inline font-medium text-texto">
                        {brl(m.diariaCents)}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline">dias </dt>
                      <dd className="inline font-medium text-texto">
                        {m.diasGrandes}/{m.diasPequenos}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline">categorias </dt>
                      <dd className="inline font-medium text-texto">{m._count.categorias}</dd>
                    </div>
                    <div>
                      <dt className="inline">gastos </dt>
                      <dd className="inline font-medium text-texto">{m._count.gastos}</dd>
                    </div>
                  </dl>
                  {m.duplicadaDe ? (
                    <p className="text-[11px] text-suave">duplicada de {m.duplicadaDe.nome}</p>
                  ) : null}
                </CartaoCorpo>
              </Cartao>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
