import Link from "next/link";
import type { Conta as ContaBD, Conversa } from "@prisma/client";
import { COR_DO_TOM, categoria } from "@/lib/categorias";
import { linkDoGmail } from "@/lib/conversas";
import { diasDesde, quando } from "@/lib/datas";
import { AcoesRapidas } from "./acoes-rapidas";
import { LinhaDeslizavel } from "./linha-deslizavel";
import { Avatar } from "./pecas";

/**
 * Uma conversa na lista, em duas linhas: quem e quando; e, em cinza, o que
 * importa nela (o resumo da triagem). Embaixo, as ações principais, para
 * resolver sem abrir; no celular, também os gestos (ver LinhaDeslizavel).
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
  const cat = categoria(c.categoria);
  return (
    <LinhaDeslizavel id={c.id} titulo={c.resumo || c.assunto} resolvida={c.resolvida}>
      <div className={`px-4 py-3.5 transition-colors hover:bg-realce ${ativa ? "bg-realce" : ""}`}>
        <Link href={href} scroll={false} className="flex gap-3">
          <Avatar nome={c.remetente} cor={cor} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className={`min-w-0 flex-1 truncate text-[15px] ${c.resolvida ? "text-fosco line-through" : "font-semibold"}`}>{c.remetente}</span>
              <span className="numeros shrink-0 text-[13px] text-fosco">{esperando ? `há ${diasDesde(c.ultimaData)} d` : quando(c.ultimaData)}</span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug text-grafite">{c.resumo || c.assunto}</p>
            {/* A categoria, como etiqueta: o que essa conversa pede de você. */}
            <p className="mt-1.5 flex items-center gap-2 text-[12px] text-fosco">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-realce px-2 py-0.5 font-medium text-grafite">
                <span className={`h-1.5 w-1.5 rounded-full ${COR_DO_TOM[cat.tom]}`} />
                {cat.nome}
              </span>
              <span className="truncate">{c.conta.rotulo}</span>
            </p>
          </div>
        </Link>
        <div className="mt-2.5 lg:pl-12">
          <AcoesRapidas
            id={c.id}
            categoria={c.categoria}
            resolvida={c.resolvida}
            linkGmail={linkDoGmail(c.conta.email, c.threadId)}
            cobrar={esperando ? `/caixa?fluxo=esperando&c=${c.id}&cobrar=1` : undefined}
          />
        </div>
      </div>
    </LinhaDeslizavel>
  );
}
