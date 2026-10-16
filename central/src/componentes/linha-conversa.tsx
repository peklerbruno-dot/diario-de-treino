import Link from "next/link";
import type { Conta as ContaBD, Conversa } from "@prisma/client";
import { prazoPorExtenso, quando } from "@/lib/datas";
import { Conta, Etiqueta, Prazo } from "./pecas";

/**
 * Uma conversa na lista: densa como no Superhuman — quem, assunto, o resumo
 * da triagem numa linha e, embaixo, o que fazer e até quando.
 */
export function LinhaConversa({
  c,
  cor,
  href,
  ativa = false,
  mostrarCategoria = true,
}: {
  c: Conversa & { conta: ContaBD };
  cor: string;
  href: string;
  ativa?: boolean;
  mostrarCategoria?: boolean;
}) {
  const prazo = c.prazo ? prazoPorExtenso(c.prazo) : null;
  return (
    <Link
      href={href}
      scroll={false}
      className={`group relative block border-b border-linha py-3 pl-3 pr-2 transition-colors hover:bg-realce ${ativa ? "bg-realce" : ""}`}
    >
      <span className="absolute inset-y-3 left-0 w-[3px] rounded-full" style={{ background: cor }} aria-hidden />
      <div className="flex items-center gap-2">
        <span className={`min-w-0 flex-1 truncate text-[15px] ${c.resolvida ? "text-fosco line-through" : "font-semibold"}`}>
          {c.remetente}
        </span>
        {c.prioridade === 1 && !c.resolvida && (
          <span className="text-mini font-semibold text-atencao" title="Prioridade alta">
            urgente
          </span>
        )}
        <span className="numeros shrink-0 text-mini text-fosco">{quando(c.ultimaData)}</span>
      </div>
      <p className="truncate text-sm text-tinta">{c.assunto}</p>
      <p className="mt-0.5 line-clamp-2 text-sm text-grafite">{c.resumo || c.trecho}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Conta rotulo={c.conta.rotulo} cor={cor} />
        {mostrarCategoria && <Etiqueta id={c.categoria} />}
        {prazo && <Prazo {...prazo} />}
        {c.proximaAcao && <span className="min-w-0 truncate text-mini text-grafite">→ {c.proximaAcao}</span>}
      </div>
    </Link>
  );
}
