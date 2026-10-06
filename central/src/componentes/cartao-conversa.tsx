import Link from "next/link";
import type { Conta, Conversa } from "@prisma/client";
import { categoria } from "@/lib/categorias";
import { prazoPorExtenso, quando } from "@/lib/datas";

export function CartaoConversa({ c, mostrarCategoria = false }: { c: Conversa & { conta: Conta }; mostrarCategoria?: boolean }) {
  const prazo = c.prazo ? prazoPorExtenso(c.prazo) : null;
  const cat = categoria(c.categoria);
  return (
    <Link href={`/conversa/${c.id}`} className="block px-4 py-3 active:bg-linha">
      <div className="flex items-center gap-2 text-xs text-fosco">
        {c.prioridade === 1 && <span className="h-2 w-2 shrink-0 rounded-full bg-atencao" title="Prioridade alta" />}
        <span className="rounded-md bg-linha px-1.5 py-0.5 font-semibold text-grafite">{c.conta.rotulo}</span>
        {mostrarCategoria && (
          <span>
            {cat.icone} {cat.nome}
          </span>
        )}
        <span className="ml-auto shrink-0">{quando(c.ultimaData)}</span>
      </div>
      <p className={`mt-1 truncate ${c.resolvida ? "text-fosco line-through" : "font-semibold"}`}>{c.remetente}</p>
      <p className="truncate text-sm">{c.assunto}</p>
      <p className="mt-0.5 line-clamp-2 text-sm text-grafite">{c.resumo || c.trecho}</p>
      {(c.proximaAcao || prazo) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          {c.proximaAcao && <span className="text-tinta">→ {c.proximaAcao}</span>}
          {prazo && (
            <span
              className={`rounded-md px-1.5 py-0.5 font-semibold ${
                prazo.vencido ? "bg-atencao text-white" : prazo.perto ? "text-atencao" : "text-alerta"
              }`}
            >
              ⏰ {prazo.texto}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

export function Secao({ titulo, children, acao }: { titulo: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="font-titulo text-xl">{titulo}</h2>
        {acao}
      </div>
      <div className="divide-y divide-linha overflow-hidden rounded-cartao bg-cartao shadow-cartao">{children}</div>
    </section>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-5 text-sm text-fosco">{children}</p>;
}
