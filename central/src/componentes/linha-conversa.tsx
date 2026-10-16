import Link from "next/link";
import type { Conta as ContaBD, Conversa } from "@prisma/client";
import { linkDoGmail } from "@/lib/conversas";
import { diasDesde, quando } from "@/lib/datas";
import { AcoesRapidas } from "./acoes-rapidas";
import { Ponto } from "./pecas";

/**
 * Uma conversa na lista, em duas linhas: quem e quando; e, em cinza, o que
 * importa nela (o resumo da triagem). À direita, o "⋯" com as ações, para
 * resolver sem abrir.
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
  const esperando = c.categoria === "aguardando";
  return (
    <div className={`group -mx-3 flex items-start gap-1 rounded-lg pr-1 transition-colors hover:bg-realce ${ativa ? "bg-realce" : ""}`}>
      <Link href={href} scroll={false} className="min-w-0 flex-1 py-2.5 pl-3">
        <div className="flex items-center gap-2.5">
          <Ponto cor={cor} titulo={c.conta.rotulo} />
          <span className={`min-w-0 flex-1 truncate text-[15px] ${c.resolvida ? "text-fosco line-through" : "font-medium"}`}>
            {c.remetente}
          </span>
          <span className="numeros shrink-0 text-[13px] text-fosco">
            {esperando ? `há ${diasDesde(c.ultimaData)} d` : quando(c.ultimaData)}
          </span>
        </div>
        <p className="truncate pl-[17px] text-[14px] text-fosco">{c.resumo || c.assunto}</p>
      </Link>
      <div className="pt-2">
        <AcoesRapidas
          id={c.id}
          categoria={c.categoria}
          resolvida={c.resolvida}
          linkGmail={linkDoGmail(c.conta.email, c.threadId)}
          cobrar={esperando ? `/caixa?fluxo=esperando&c=${c.id}&cobrar=1` : undefined}
        />
      </div>
    </div>
  );
}
