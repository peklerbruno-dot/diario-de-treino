import Link from "next/link";
import type { Conta as ContaBD, Conversa } from "@prisma/client";
import { quando } from "@/lib/datas";
import { Ponto } from "./pecas";

/**
 * Uma conversa na lista, em duas linhas: quem e quando; e, em cinza, o que
 * importa nela (o resumo da triagem). O resto — assunto, categoria, prazo,
 * o que fazer — fica na conversa aberta.
 */
export function LinhaConversa({
  c,
  cor,
  href,
  ativa = false,
}: {
  c: Conversa & { conta: ContaBD };
  cor: string;
  href: string;
  ativa?: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`-mx-3 block rounded-lg px-3 py-2.5 transition-colors hover:bg-realce ${ativa ? "bg-realce" : ""}`}
    >
      <div className="flex items-center gap-2.5">
        <Ponto cor={cor} titulo={c.conta.rotulo} />
        <span className={`min-w-0 flex-1 truncate text-[15px] ${c.resolvida ? "text-fosco line-through" : "font-medium"}`}>
          {c.remetente}
        </span>
        <span className="numeros shrink-0 text-[13px] text-fosco">{quando(c.ultimaData)}</span>
      </div>
      <p className="truncate pl-[17px] text-[14px] text-fosco">{c.resumo || c.assunto}</p>
    </Link>
  );
}
